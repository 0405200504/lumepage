/**
 * Google Calendar — Biblioteca centralizada de operações.
 *
 * Responsável por:
 * - OAuth 2.0 (gerar URL, trocar code, renovar token)
 * - CRUD de eventos (criar, atualizar, deletar)
 * - Sync incremental (Google → Lume)
 * - Watch (push notifications)
 */

import { google, calendar_v3 } from 'googleapis';
import { GoogleCalendarConnection, Appointment, Service } from '@/types/database';
import { getSupabaseAdmin } from '@/lib/supabase/client';

// ─── Credenciais ──────────────────────────────────────────────
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || '';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/userinfo.email',
];

// ─── Helper: criar OAuth2 client ──────────────────────────────
function createOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
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

/** Gera URL de autorização OAuth para redirecionar a profissional. */
export function getAuthUrl(professionalId: string): string {
  const oauth2 = createOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // garante refresh_token
    scope: SCOPES,
    state: professionalId, // recupera no callback
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

  // Upsert — se já tinha conexão, atualiza tokens
  const { error } = await supabase
    .from('google_calendar_connections')
    .upsert({
      professional_id: professionalId,
      google_email: googleEmail,
      access_token: tokens.access_token!,
      refresh_token: tokens.refresh_token!,
      token_expires_at: new Date(tokens.expiry_date!).toISOString(),
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
    token_expires_at: new Date(credentials.expiry_date!).toISOString(),
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
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: `${dateStr}T${endTime}:00`,
      timeZone: 'America/Sao_Paulo',
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
    console.error('[GoogleCalendar] Erro ao deletar evento:', e);
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
    if (nextSyncToken) {
      await supabase
        .from('google_calendar_connections')
        .update({
          last_sync_token: nextSyncToken,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);
    }
  } catch (e: unknown) {
    console.error('[GoogleCalendar] Erro no sync:', e);
    // Se o syncToken ficou inválido, resetar
    if (e && typeof e === 'object' && 'code' in e && (e as { code: number }).code === 410) {
      const supabase = getSupabaseAdmin();
      if (supabase) {
        await supabase
          .from('google_calendar_connections')
          .update({ last_sync_token: null, updated_at: new Date().toISOString() })
          .eq('id', connection.id);
      }
    }
    result.errors++;
  }

  return result;
}

/** Processa um único evento do Google para sync → Lume. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processGoogleEvent(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  event: calendar_v3.Schema$Event,
  professionalId: string,
  result: SyncResult
) {
  if (!supabase || !event.id) return;

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
      const date = start.toISOString().slice(0, 10);
      const startTime = start.toTimeString().slice(0, 8);
      const endTime = end.toTimeString().slice(0, 8);

      await supabase
        .from('appointments')
        .update({ date, start_time: startTime, end_time: endTime, updated_at: new Date().toISOString() })
        .eq('id', lumeApptId)
        .eq('professional_id', professionalId);
      result.updated++;
    }
    return;
  }

  // Evento do Google (não da Lume) → criar/atualizar bloqueio de horário
  if (event.status === 'cancelled') {
    // Remover bloqueio associado
    const { data: existing } = await supabase
      .from('appointments')
      .select('id')
      .eq('google_event_id', event.id)
      .eq('professional_id', professionalId)
      .maybeSingle();

    if (existing) {
      await supabase.from('appointments').delete().eq('id', existing.id);
      result.deleted++;
    }
    return;
  }

  // Evento com horário definido → criar bloqueio de horário na Lume (time_blocks)
  if (event.start?.dateTime && event.summary) {
    const start = new Date(event.start.dateTime);
    const end = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(start.getTime() + 60 * 60 * 1000);
    const date = start.toISOString().slice(0, 10);
    const startTime = start.toTimeString().slice(0, 8);
    const endTime = end.toTimeString().slice(0, 8);

    // Verificar se já existe um bloqueio com esse google_event_id
    const { data: existingBlock } = await supabase
      .from('time_blocks')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('date', date)
      .eq('start_time', startTime)
      .maybeSingle();

    if (!existingBlock) {
      // Criar novo bloqueio
      await supabase.from('time_blocks').insert({
        professional_id: professionalId,
        date,
        start_time: startTime,
        end_time: endTime,
        reason: `[Google] ${event.summary}`,
        block_type: 'custom_time',
      });
      result.created++;
    } else {
      result.updated++;
    }
  }
}

// ─── Watch (Push Notifications) ───────────────────────────────

/** Registra um webhook de push notifications no Google Calendar. */
export async function setupWatch(
  connection: GoogleCalendarConnection,
  webhookUrl: string
): Promise<boolean> {
  try {
    const conn = await refreshIfNeeded(connection);
    const cal = getCalendarClient(conn);
    const channelId = `lume-${conn.id}-${Date.now()}`;

    const { data } = await cal.events.watch({
      calendarId: conn.calendar_id || 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 dias
      },
    });

    const supabase = getSupabaseAdmin();
    if (supabase && data.resourceId) {
      await supabase
        .from('google_calendar_connections')
        .update({
          sync_channel_id: channelId,
          sync_resource_id: data.resourceId,
          sync_expiration: data.expiration
            ? new Date(Number(data.expiration)).toISOString()
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conn.id);
    }

    return true;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao registrar watch:', e);
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
      // Revogar token
      try {
        const oauth2 = getAuthenticatedClient(conn);
        await oauth2.revokeToken(conn.access_token);
      } catch { /* ignore — token pode já estar inválido */ }

      // Parar watch
      if (conn.sync_channel_id && conn.sync_resource_id) {
        try {
          const cal = getCalendarClient(conn);
          await cal.channels.stop({
            requestBody: {
              id: conn.sync_channel_id,
              resourceId: conn.sync_resource_id,
            },
          });
        } catch { /* ignore */ }
      }

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
    }

    return true;
  } catch (e) {
    console.error('[GoogleCalendar] Erro ao desconectar:', e);
    return false;
  }
}

// ─── Helpers de banco ─────────────────────────────────────────

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
