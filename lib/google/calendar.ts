/**
 * Google Calendar — Biblioteca centralizada de operações.
 *
 * Responsável por:
 * - OAuth 2.0 (gerar URL, trocar code, renovar token)
 * - CRUD de eventos (criar, atualizar, deletar)
 * - Sync incremental (Google → Lume)
 * - Watch (push notifications)
 *
 * Fuso: a agenda da Lume trabalha com data ("YYYY-MM-DD") e hora ("HH:MM:SS")
 * SEM fuso — sempre horário de Brasília. O Google devolve instantes em UTC.
 * Toda conversão passa por `toBrParts` (Intl); nunca use toISOString()/
 * toTimeString() aqui: em produção o servidor roda em UTC e os horários
 * chegariam 3h adiantados.
 */

import { google, calendar_v3 } from 'googleapis';
import { GoogleCalendarConnection, Appointment, Service } from '@/types/database';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { signSession, verifySession } from '@/lib/auth/cookie';

// ─── Credenciais ──────────────────────────────────────────────
// Lidas em runtime (não no topo do módulo) para funcionarem em qualquer
// ambiente de deploy sem precisar rebuildar quando a env muda.
function clientId() { return process.env.GOOGLE_CLIENT_ID || ''; }
function clientSecret() { return process.env.GOOGLE_CLIENT_SECRET || ''; }

/**
 * URI de retorno do OAuth. Precisa bater EXATAMENTE com a cadastrada no
 * Google Cloud Console. Se GOOGLE_REDIRECT_URI não estiver definida, derivamos
 * da URL pública do app — assim basta configurar NEXT_PUBLIC_APP_URL.
 */
export function redirectUri(): string {
  const explicit = process.env.GOOGLE_REDIRECT_URI;
  if (explicit) return explicit;
  const base = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  return base ? `${base}/api/google/callback` : '';
}

/** True quando as credenciais do Google estão configuradas. */
export function isGoogleCalendarConfigured(): boolean {
  return Boolean(clientId() && clientSecret() && redirectUri());
}

const TZ = 'America/Sao_Paulo';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ─── Fuso ─────────────────────────────────────────────────────

/** Converte um instante (Date/UTC) para data e hora de Brasília. */
function toBrParts(d: Date): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const p: Record<string, string> = {};
  for (const part of parts) p[part.type] = part.value;
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}:${p.second}`,
  };
}

// ─── Helper: criar OAuth2 client ──────────────────────────────
function createOAuth2Client() {
  return new google.auth.OAuth2(clientId(), clientSecret(), redirectUri());
}

function getAuthenticatedClient(connection: GoogleCalendarConnection) {
  const oauth2 = createOAuth2Client();
  oauth2.setCredentials({
    access_token: connection.access_token,
    refresh_token: connection.refresh_token,
    expiry_date: new Date(connection.token_expires_at).getTime(),
  });
  return oauth2;
}

// ─── OAuth ────────────────────────────────────────────────────

/**
 * `state` do OAuth — assinado.
 *
 * Antes o state era o professional_id cru: qualquer pessoa podia abrir a URL
 * do Google com o id de OUTRA profissional e plugar a própria agenda na conta
 * dela. Agora vai assinado (HMAC do SESSION_SECRET) e com validade curta.
 */
function makeState(professionalId: string): string {
  return signSession({ pid: professionalId, iat: Date.now() });
}

/** Valida o state do callback. Retorna o professional_id ou null. */
export function readState(state: string | null): string | null {
  const data = verifySession<{ pid?: string; iat?: number }>(state);
  if (!data?.pid || !data.iat) return null;
  if (Date.now() - data.iat > 15 * 60 * 1000) return null; // 15 min
  return data.pid;
}

/** Gera URL de autorização OAuth para redirecionar a profissional. */
export function getAuthUrl(professionalId: string): string {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // garante refresh_token
    include_granted_scopes: true,
    scope: SCOPES,
    state: makeState(professionalId),
  });
}

/** Troca o authorization code por tokens e salva no banco. */
export async function handleCallback(code: string, professionalId: string) {
  const oauth2 = createOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Buscar email do Google
  const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: userInfo } = await oauth2Api.userinfo.get();
  const googleEmail = userInfo.email || 'desconhecido';

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado.');

  // Reconexão: o Google só devolve refresh_token na PRIMEIRA autorização de
  // cada conta. Se não veio, reaproveitamos o que já está salvo — sobrescrever
  // com null quebraria a renovação do token e a conexão morreria em 1h.
  let refreshToken = tokens.refresh_token || null;
  if (!refreshToken) {
    const { data: existing } = await supabase
      .from('google_calendar_connections')
      .select('refresh_token')
      .eq('professional_id', professionalId)
      .maybeSingle();
    refreshToken = existing?.refresh_token || null;
  }
  if (!refreshToken) {
    throw new Error('O Google não devolveu a permissão de acesso contínuo. Remova o acesso da Lume em myaccount.google.com/permissions e conecte de novo.');
  }

  const expiresAt = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : new Date(Date.now() + 55 * 60 * 1000);

  const { error } = await supabase
    .from('google_calendar_connections')
    .upsert({
      professional_id: professionalId,
      google_email: googleEmail,
      access_token: tokens.access_token!,
      refresh_token: refreshToken,
      token_expires_at: expiresAt.toISOString(),
      calendar_id: 'primary',
      enabled: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'professional_id' });

  if (error) throw error;

  return { googleEmail };
}

/** Renova o access_token se expirado. Retorna a conexão atualizada. */
export async function refreshIfNeeded(
  connection: GoogleCalendarConnection
): Promise<GoogleCalendarConnection> {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();

  // Renovar se expira em menos de 5 minutos
  if (expiresAt - now > 5 * 60 * 1000) return connection;

  const oauth2 = getAuthenticatedClient(connection);
  const { credentials } = await oauth2.refreshAccessToken();

  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error('Supabase não configurado.');

  const updated = {
    ...connection,
    access_token: credentials.access_token!,
    token_expires_at: new Date(credentials.expiry_date || Date.now() + 55 * 60 * 1000).toISOString(),
  };

  await supabase
    .from('google_calendar_connections')
    .update({
      access_token: updated.access_token,
      token_expires_at: updated.token_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connection.id);

  return updated;
}

// ─── CRUD de Eventos ──────────────────────────────────────────

function getCalendarClient(connection: GoogleCalendarConnection): calendar_v3.Calendar {
  const oauth2 = getAuthenticatedClient(connection);
  return google.calendar({ version: 'v3', auth: oauth2 });
}

/** Converte um agendamento da Lume para o formato de evento do Google Calendar. */
function appointmentToEvent(
  appt: Appointment,
  services?: Service[]
): calendar_v3.Schema$Event {
  const serviceNames = services?.map(s => s.name).join(', ') || 'Agendamento';
  const dateStr = appt.date; // "YYYY-MM-DD"
  const startTime = appt.start_time.slice(0, 5); // "HH:MM"
  const endTime = appt.end_time.slice(0, 5);

  return {
    summary: `${appt.client_name} — ${serviceNames}`,
    description: [
      `Cliente: ${appt.client_name}`,
      appt.client_whatsapp ? `WhatsApp: ${appt.client_whatsapp}` : '',
      appt.notes ? `Observações: ${appt.notes}` : '',
      `Status: ${appt.status}`,
      `[Lume Agendamentos]`,
    ].filter(Boolean).join('\n'),
    start: {
      dateTime: `${dateStr}T${startTime}:00`,
      timeZone: TZ,
    },
    end: {
      dateTime: `${dateStr}T${endTime}:00`,
      timeZone: TZ,
    },
    // Metadado privado para identificar que é da Lume
    extendedProperties: {
      private: {
        lume_appointment_id: appt.id,
        source: 'lume',
      },
    },
    colorId: appt.status === 'confirmed' ? '2' : '8', // verde = confirmado, cinza = pendente
  };
}

/** Cria um evento no Google Calendar e retorna o eventId. */
export async function createEvent(
  connection: GoogleCalendarConnection,
  appointment: Appointment,
  services?: Service[]
): Promise<string | null> {
  try {
    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);
    const event = appointmentToEvent(appointment, services);

    const { data } = await cal.events.insert({
      calendarId: conn.calendar_id || 'primary',
      requestBody: event,
    });

    // Salvar google_event_id no appointment
    if (data.id) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase
          .from('appointments')
          .update({ google_event_id: data.id })
          .eq('id', appointment.id);
      }
    }

    return data.id || null;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao criar evento:', e);
    await noteError(connection, e);
    return null;
  }
}

/** Atualiza um evento existente no Google Calendar. */
export async function updateEvent(
  connection: GoogleCalendarConnection,
  appointment: Appointment,
  services?: Service[]
): Promise<boolean> {
  try {
    if (!appointment.google_event_id) return false;
    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);
    const event = appointmentToEvent(appointment, services);

    await cal.events.update({
      calendarId: conn.calendar_id || 'primary',
      eventId: appointment.google_event_id,
      requestBody: event,
    });

    return true;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao atualizar evento:', e);
    await noteError(connection, e);
    return false;
  }
}

/** Remove/cancela um evento no Google Calendar. */
export async function deleteEvent(
  connection: GoogleCalendarConnection,
  googleEventId: string
): Promise<boolean> {
  try {
    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);

    await cal.events.delete({
      calendarId: conn.calendar_id || 'primary',
      eventId: googleEventId,
    });

    return true;
  } catch (e) {
    // 404/410 = já não existe no Google; não é erro de verdade.
    const code = errorCode(e);
    if (code === 404 || code === 410) return true;
    console.error('[GoogleCalendar] Erro ao deletar evento:', e);
    await noteError(connection, e);
    return false;
  }
}

// ─── Sync Incremental (Google → Lume) ─────────────────────────

export interface SyncResult {
  created: number;
  updated: number;
  deleted: number;
  errors: number;
}

/**
 * Sync incremental: puxa mudanças do Google Calendar desde o último syncToken.
 * Cria bloqueios de horário para eventos do Google que não são da Lume.
 * Atualiza/cancela agendamentos Lume quando eventos são movidos/deletados no Google.
 */
export async function syncFromGoogle(
  connection: GoogleCalendarConnection,
  professionalId: string
): Promise<SyncResult> {
  const result: SyncResult = { created: 0, updated: 0, deleted: 0, errors: 0 };

  try {
    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);
    const supabase = getSupabaseAdmin();
    if (!supabase) return result;

    // Buscar mudanças desde o último sync
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: conn.calendar_id || 'primary',
      singleEvents: true,
      showDeleted: true,
      maxResults: 250,
    };

    if (conn.last_sync_token) {
      params.syncToken = conn.last_sync_token;
    } else {
      // Primeira sync: só pegar eventos futuros (últimos 7 dias + futuro)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      params.timeMin = weekAgo.toISOString();
    }

    let nextPageToken: string | undefined;
    let nextSyncToken: string | undefined;

    do {
      if (nextPageToken) params.pageToken = nextPageToken;

      const { data } = await cal.events.list(params);
      const events = data.items || [];
      nextPageToken = data.nextPageToken || undefined;
      nextSyncToken = data.nextSyncToken || undefined;

      for (const event of events) {
        try {
          await processGoogleEvent(supabase, event, professionalId, result);
        } catch (e) {
          console.error('[GoogleCalendar] Erro ao processar evento:', event.id, e);
          result.errors++;
        }
      }
    } while (nextPageToken);

    // Salvar o syncToken para a próxima rodada
    await supabase
      .from('google_calendar_connections')
      .update({
        ...(nextSyncToken ? { last_sync_token: nextSyncToken } : {}),
        last_synced_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conn.id);
  } catch (e: unknown) {
    console.error('[GoogleCalendar] Erro no sync:', e);
    // syncToken expirado (410) → zera para a próxima rodada refazer do zero.
    if (errorCode(e) === 410) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase
          .from('google_calendar_connections')
          .update({ last_sync_token: null, updated_at: new Date().toISOString() })
          .eq('id', connection.id);
      }
    }
    await noteError(connection, e);
    result.errors++;
  }

  return result;
}

type Db = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** Linha de bloqueio a criar na Lume a partir de um evento do Google. */
interface BlockRow {
  date: string;
  start_time: string | null;
  end_time: string | null;
  block_type: 'full_day' | 'custom_time';
}

/**
 * Sincroniza os bloqueios de UM evento do Google.
 *
 * Estratégia: apaga o que existia daquele evento e recria pelo estado atual.
 * É idempotente e resolve sozinho eventos que mudaram de horário, viraram
 * dia-inteiro, passaram a ocupar vários dias ou foram apagados.
 */
async function replaceGoogleBlocks(
  supabase: Db,
  professionalId: string,
  eventId: string,
  rows: BlockRow[]
): Promise<'created' | 'deleted' | 'none'> {
  const { data: existing, error: selErr } = await supabase
    .from('time_blocks')
    .select('id')
    .eq('professional_id', professionalId)
    .eq('google_event_id', eventId);

  if (selErr) {
    // Coluna ausente = migração v38 não rodou. Não dá para casar evento ↔
    // bloqueio com segurança, então o sync de bloqueios fica desligado em vez
    // de encher a agenda de duplicatas a cada rodada.
    if (isMissingColumn(selErr)) {
      console.warn('[GoogleCalendar] time_blocks.google_event_id ausente — rode a migração v38 para sincronizar bloqueios do Google.');
      return 'none';
    }
    throw selErr;
  }

  const had = (existing?.length ?? 0) > 0;
  if (had) {
    await supabase
      .from('time_blocks')
      .delete()
      .eq('professional_id', professionalId)
      .eq('google_event_id', eventId);
  }

  if (!rows.length) return had ? 'deleted' : 'none';

  const { error: insErr } = await supabase.from('time_blocks').insert(
    rows.map(r => ({ professional_id: professionalId, google_event_id: eventId, ...r }))
  );
  if (insErr) throw insErr;

  return 'created';
}

/** Um evento do Google deve ocupar a agenda? */
function blocksAgenda(event: calendar_v3.Schema$Event): boolean {
  if (event.status === 'cancelled') return false;
  // "Disponível" no Google = não ocupa horário.
  if (event.transparency === 'transparent') return false;
  // Convite que a profissional recusou não bloqueia a agenda dela.
  const self = event.attendees?.find(a => a.self);
  if (self?.responseStatus === 'declined') return false;
  return true;
}

/** Quebra um evento do Google nas linhas de bloqueio correspondentes. */
function eventToBlocks(event: calendar_v3.Schema$Event): BlockRow[] {
  // Evento com horário definido
  if (event.start?.dateTime) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime
      ? new Date(event.end.dateTime)
      : new Date(start.getTime() + 60 * 60 * 1000);
    const s = toBrParts(start);
    const e = toBrParts(end);
    // Atravessa a meia-noite: bloqueia até o fim do dia (a agenda da Lume não
    // comercializa madrugada; o dia seguinte fica livre de propósito).
    const endTime = e.date === s.date ? e.time : '23:59:00';
    return [{ date: s.date, start_time: s.time, end_time: endTime, block_type: 'custom_time' }];
  }

  // Evento de dia inteiro: start.date .. end.date (fim exclusivo)
  if (event.start?.date) {
    const rows: BlockRow[] = [];
    const startDate = new Date(`${event.start.date}T12:00:00Z`);
    const endDate = event.end?.date
      ? new Date(`${event.end.date}T12:00:00Z`)
      : new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    // Teto de segurança: um "evento" de anos (aniversários, feriados de
    // calendários importados) não pode gerar milhares de bloqueios.
    for (let i = 0, d = startDate; d < endDate && i < 62; i++, d = new Date(d.getTime() + 24 * 60 * 60 * 1000)) {
      rows.push({
        date: d.toISOString().slice(0, 10),
        start_time: null,
        end_time: null,
        block_type: 'full_day',
      });
    }
    return rows;
  }

  return [];
}

/** Processa um único evento do Google para sync → Lume. */
async function processGoogleEvent(
  supabase: Db,
  event: calendar_v3.Schema$Event,
  professionalId: string,
  result: SyncResult
) {
  if (!event.id) return;

  const isFromLume = event.extendedProperties?.private?.source === 'lume';
  const lumeApptId = event.extendedProperties?.private?.lume_appointment_id;

  // Se o evento foi criado pela Lume, apenas atualizar data/hora se mudou no Google
  if (isFromLume && lumeApptId) {
    if (event.status === 'cancelled') {
      // Cancelado no Google → cancelar na Lume
      await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancellation_reason: 'Cancelado via Google Calendar',
          updated_at: new Date().toISOString(),
        })
        .eq('id', lumeApptId)
        .eq('professional_id', professionalId)
        .neq('status', 'cancelled');
      result.deleted++;
      return;
    }

    // Movido no Google → atualizar data/hora na Lume
    if (event.start?.dateTime) {
      const start = new Date(event.start.dateTime);
      const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000);
      const s = toBrParts(start);
      const e = toBrParts(end);

      await supabase
        .from('appointments')
        .update({ date: s.date, start_time: s.time, end_time: e.time, updated_at: new Date().toISOString() })
        .eq('id', lumeApptId)
        .eq('professional_id', professionalId);
      result.updated++;
    }
    return;
  }

  // Evento do Google (não da Lume) → espelhar como bloqueio de horário
  const rows = blocksAgenda(event) ? eventToBlocks(event) : [];
  const outcome = await replaceGoogleBlocks(supabase, professionalId, event.id, rows);
  if (outcome === 'created') result.created++;
  else if (outcome === 'deleted') result.deleted++;
}

// ─── Watch (Push Notifications) ───────────────────────────────

/** Registra um webhook de push notifications no Google Calendar. */
export async function setupWatch(
  connection: GoogleCalendarConnection,
  webhookUrl: string
): Promise<boolean> {
  try {
    // O Google só entrega push em HTTPS com domínio público — em localhost
    // não adianta tentar (o sync do cron cobre o desenvolvimento).
    if (!webhookUrl.startsWith('https://')) return false;

    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);
    const channelId = `lume-${conn.id}-${Date.now()}`;
    // Segredo do canal: o Google devolve em X-Goog-Channel-Token e o webhook
    // confere. Sem isso, qualquer um que descubra o channel-id dispara syncs.
    const channelToken = crypto.randomUUID();

    // Encerra o canal anterior — senão eles se acumulam e o Google entrega
    // a mesma mudança várias vezes.
    if (conn.sync_channel_id && conn.sync_resource_id) {
      try {
        await cal.channels.stop({
          requestBody: { id: conn.sync_channel_id, resourceId: conn.sync_resource_id },
        });
      } catch { /* canal já expirado — segue */ }
    }

    const { data } = await cal.events.watch({
      calendarId: conn.calendar_id || 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: channelToken,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });

    const supabase = getSupabaseAdmin();
    if (supabase && data.resourceId) {
      const patch = {
        sync_channel_id: channelId,
        sync_resource_id: data.resourceId,
        sync_expiration: data.expiration
          ? new Date(Number(data.expiration)).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('google_calendar_connections')
        .update({ ...patch, webhook_token: channelToken })
        .eq('id', conn.id);
      // Sem a migração v38 a coluna do token não existe: grava o resto para o
      // push continuar funcionando (o webhook aceita canal sem token salvo).
      if (error && isMissingColumn(error)) {
        await supabase.from('google_calendar_connections').update(patch).eq('id', conn.id);
      }
    }

    return true;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao registrar watch:', e);
    await noteError(connection, e);
    return false;
  }
}

// ─── Disconnect ───────────────────────────────────────────────

/** Desconecta Google Calendar: revoga tokens, para watch, remove do banco. */
export async function disconnect(professionalId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return false;

    const { data: conn } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (conn) {
      // Parar watch ANTES de revogar o token (depois de revogar, a chamada falha).
      if (conn.sync_channel_id && conn.sync_resource_id) {
        try {
          const cal = getCalendarClient(await refreshIfNeeded(conn));
          await cal.channels.stop({
            requestBody: {
              id: conn.sync_channel_id,
              resourceId: conn.sync_resource_id,
            },
          });
        } catch { /* ignore */ }
      }

      // Revogar acesso da Lume na conta Google
      try {
        const oauth2 = getAuthenticatedClient(conn);
        await oauth2.revokeToken(conn.refresh_token || conn.access_token);
      } catch { /* ignore — token pode já estar inválido */ }

      // Remover do banco
      await supabase
        .from('google_calendar_connections')
        .delete()
        .eq('professional_id', professionalId);

      // Limpar google_event_id dos appointments
      await supabase
        .from('appointments')
        .update({ google_event_id: null })
        .eq('professional_id', professionalId)
        .not('google_event_id', 'is', null);

      // Remover os bloqueios que vieram do Google (sem a conexão eles nunca
      // mais seriam atualizados e a agenda ficaria travada à toa).
      const { error: blocksErr } = await supabase
        .from('time_blocks')
        .delete()
        .eq('professional_id', professionalId)
        .not('google_event_id', 'is', null);
      if (blocksErr && !isMissingColumn(blocksErr)) {
        console.error('[GoogleCalendar] Erro ao limpar bloqueios:', blocksErr);
      }
    }

    return true;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao desconectar:', e);
    return false;
  }
}

// ─── Helpers de banco ─────────────────────────────────────────

/** Código HTTP de um erro da API do Google, quando houver. */
function errorCode(e: unknown): number | null {
  if (e && typeof e === 'object') {
    const code = (e as { code?: unknown; status?: unknown }).code ?? (e as { status?: unknown }).status;
    if (typeof code === 'number') return code;
    if (typeof code === 'string' && /^\d+$/.test(code)) return Number(code);
  }
  return null;
}

/** Erro do Postgres por coluna inexistente (migração ainda não rodada). */
function isMissingColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, message } = error as { code?: string; message?: string };
  return code === '42703' || code === 'PGRST204' || /column .* does not exist/i.test(message || '');
}

/** Guarda o último erro na conexão para o painel mostrar o que aconteceu. */
async function noteError(connection: GoogleCalendarConnection, e: unknown) {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;
    const message = e instanceof Error ? e.message : String(e);
    const { error } = await supabase
      .from('google_calendar_connections')
      .update({ last_error: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq('id', connection.id);
    // Sem a migração v38 a coluna não existe — o erro já foi para o log de cima.
    if (error && !isMissingColumn(error)) {
      console.error('[GoogleCalendar] Falha ao registrar last_error:', error);
    }
  } catch { /* diagnóstico não pode derrubar o fluxo */ }
}

/** Busca a conexão Google Calendar de uma profissional. */
export async function getConnection(
  professionalId: string
): Promise<GoogleCalendarConnection | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from('google_calendar_connections')
    .select('*')
    .eq('professional_id', professionalId)
    .eq('enabled', true)
    .maybeSingle();

  return data;
}

/**
 * Fire-and-forget: sincroniza um agendamento para o Google Calendar.
 * Não bloqueia a operação principal — erros são logados mas ignorados.
 */
export async function syncAppointmentToGoogle(
  professionalId: string,
  appointment: Appointment,
  action: 'create' | 'update' | 'delete',
  services?: Service[]
): Promise<void> {
  try {
    const conn = await getConnection(professionalId);
    if (!conn) return; // sem conexão Google → nada a fazer

    switch (action) {
      case 'create':
        await createEvent(conn, appointment, services);
        break;
      case 'update':
        if (appointment.google_event_id) {
          await updateEvent(conn, appointment, services);
        } else {
          // Se não tem google_event_id, criar
          await createEvent(conn, appointment, services);
        }
        break;
      case 'delete':
        if (appointment.google_event_id) {
          await deleteEvent(conn, appointment.google_event_id);
        }
        break;
    }
  } catch (e) {
    console.error(`[GoogleCalendar] Sync fire-and-forget falhou (${action}):`, e);
  }
}
