import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid } from '@/lib/uazapi';
import { normalizeWhatsapp } from '@/lib/whatsapp';
import { getAvailableSlots } from '@/lib/appointments/slots';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import {
  buildSystemPrompt,
  buildBookingInstructions,
  sanitizeHistory,
  parsePauseMarker,
  buildHandoffMessage,
  type BotContext,
  type BookableService,
} from '@/lib/whatsapp/bot-core';
import { createAppointmentAction } from '@/app/actions/booking';
import type { Appointment } from '@/types/database';
import { rateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

const BOT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

async function generateWithModel(params: Omit<Parameters<typeof generateText>[0], 'model'>): Promise<Awaited<ReturnType<typeof generateText>>> {
  return generateText({ ...params, model: openai(BOT_MODEL) });
}

// Formato real desta instância (fork uazapiGO) — difere da doc genérica:
// não tem `event`/`data`, e sim `EventType`/`message`, com o texto em
// `message.text` (não `message.body`) e o telefone em `message.chatid`
// (não `message.from`). Confirmado inspecionando o payload bruto recebido.
interface UazapiMessagePayload {
  EventType?: string;
  instanceName?: string;
  message?: {
    id?: string;
    messageid?: string;
    chatid?: string;
    fromMe?: boolean;
    isGroup?: boolean;
    text?: string;
    type?: string;
    senderName?: string;
    messageTimestamp?: number;
  };
}

export async function POST(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get('pid');
  // A uazapi (addUrlEvents/addUrlTypesMessages) ANEXA o tipo do evento ao final da
  // URL, ex.: "…&secret=<uuid>/messages/text". Como `secret` é o último parâmetro,
  // o sufixo "/messages/text" gruda no valor e quebra a comparação com o secret do
  // banco — rejeitando TODAS as mensagens. O secret é um UUID (sem "/"), então
  // recuperamos o valor limpo cortando a partir da primeira barra.
  const secret = req.nextUrl.searchParams.get('secret')?.split('/')[0] || null;

  console.log('[WhatsApp Webhook] recebido — pid:', pid);

  if (!pid) {
    console.warn('[WhatsApp Webhook] pid ausente na URL');
    return NextResponse.json({ ok: true });
  }

  // Sem secret na URL não há como autenticar a chamada — rejeita sem tocar no banco.
  // (Antes, a ausência de secret ainda processava a mensagem e gravava no banco,
  // permitindo a qualquer um queimar OpenAI/uazapi e inflar linhas só com o pid.)
  if (!secret) {
    console.warn('[WhatsApp Webhook] secret ausente na URL — recusado');
    return NextResponse.json({ ok: true });
  }

  // Rate limit por instância (pid): teto de chamadas processadas por minuto. Corta
  // enxurrada de webhooks que dispararia muitas chamadas de IA. O secret ainda é
  // validado dentro de processMessage; isto é uma barreira adicional barata.
  const rl = rateLimit(`wh:${pid}`, 40, 60 * 1000);
  if (!rl.ok) {
    console.warn('[WhatsApp Webhook] rate limit atingido para pid', pid);
    return NextResponse.json({ ok: true });
  }

  let body: UazapiMessagePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  console.log('[WhatsApp Webhook] evento:', body.EventType, '| tipo:', body.message?.type, '| fromMe:', body.message?.fromMe, '| de:', body.message?.chatid);

  // O registro de diagnóstico (_debug_last_call) só é gravado DEPOIS de validar o
  // secret, dentro de processMessage — evita escrita não autenticada no banco.

  // after() responde à uazapi IMEDIATAMENTE (< 200ms) e continua o processamento
  // em background — elimina qualquer risco de timeout da uazapi.
  after(async () => {
    await processMessage(pid, secret, body);
  });

  return NextResponse.json({ ok: true });
}

async function updateClientSummary(
  prev: string | null | undefined,
  userMessage: string,
  botReply: string
): Promise<string | null> {
  try {
    const result = await generateWithModel({
      system: 'Você mantém um registro conciso sobre clientes de um salão de beleza. Responda APENAS com o texto do resumo, sem explicações adicionais.',
      prompt: `Resumo anterior: "${prev || 'nenhum ainda'}"\n\nÚltima troca:\nCliente: "${userMessage}"\nAssistente: "${botReply}"\n\nAtualize o resumo com o que é útil lembrar sobre esta cliente (nome, preferências de horário, serviços de interesse, histórico mencionado, observações). Máximo 3 frases curtas. Se nada novo for relevante, retorne o resumo anterior sem alteração.`,
      abortSignal: AbortSignal.timeout(15000),
    });
    return result.text.trim() || prev || null;
  } catch {
    return prev ?? null;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const WEEKDAY_NAMES = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

function isoInSaoPaulo(offsetDays = 0): string {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Formata os agendamentos da cliente (passado + futuro) para o bot. */
function formatClientAppointments(appts: Appointment[], todayStr: string): string {
  if (!appts.length) return 'nenhum agendamento encontrado para este número.';
  const fmt = (a: Appointment) => {
    const [y, m, d] = a.date.split('-');
    const label = a.date === todayStr ? 'HOJE' : `${d}/${m}/${y}`;
    const status =
      a.status === 'confirmed' ? 'confirmado'
      : a.status === 'pending' ? 'pendente de confirmação'
      : a.status === 'cancelled' ? 'cancelado'
      : a.status === 'completed' ? 'já realizado'
      : a.status === 'no_show' ? 'faltou'
      : a.status;
    return `- ${label} às ${a.start_time.substring(0, 5)}: ${a.service?.name || 'serviço'} (${status})`;
  };
  const upcoming = appts.filter(a => a.date >= todayStr && a.status !== 'cancelled');
  const past = appts.filter(a => a.date < todayStr || a.status === 'cancelled');
  const parts: string[] = [];
  if (upcoming.length) parts.push('Próximos:\n' + upcoming.slice().reverse().map(fmt).join('\n'));
  if (past.length) parts.push('Anteriores:\n' + past.slice(0, 5).map(fmt).join('\n'));
  return '\n' + parts.join('\n');
}

/** Monta o resumo da agenda da profissional: expediente semanal + horários livres dos próximos 7 dias. */
async function buildAgendaText(professionalId: string, shortestDuration: number): Promise<string> {
  try {
    const rules = await dbService.getAvailabilityRulesByProfessional(professionalId);
    const expediente = rules
      .filter(r => r.is_active)
      .sort((a, b) => a.weekday - b.weekday)
      .map(r => {
        const br = r.break_start && r.break_end ? ` (pausa ${r.break_start.substring(0, 5)}–${r.break_end.substring(0, 5)})` : '';
        return `${WEEKDAY_NAMES[r.weekday]}: ${r.start_time.substring(0, 5)}–${r.end_time.substring(0, 5)}${br}`;
      });

    const freeByDay: string[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = isoInSaoPaulo(i);
      const slots = await getAvailableSlots(professionalId, dateStr, shortestDuration).catch(() => []);
      const free = slots.filter(s => s.isAvailable).map(s => s.time);
      if (free.length) {
        const [y, mm, dd] = dateStr.split('-');
        const wd = WEEKDAY_NAMES[new Date(Number(y), Number(mm) - 1, Number(dd)).getDay()];
        const label = i === 0 ? 'hoje' : i === 1 ? 'amanhã' : `${dd}/${mm} (${wd})`;
        freeByDay.push(`${label}: ${free.slice(0, 8).join(', ')}${free.length > 8 ? '…' : ''}`);
      }
    }

    const expedienteText = expediente.length ? `Expediente: ${expediente.join('; ')}.` : 'Expediente não configurado.';
    const livresText = freeByDay.length
      ? `Horários livres nos próximos dias: ${freeByDay.join(' | ')}.`
      : 'Sem horários livres nos próximos 7 dias.';
    return `${expedienteText} ${livresText}`;
  } catch {
    return 'agenda indisponível no momento — oriente a cliente a usar o link de agendamento.';
  }
}

async function processMessage(professionalId: string, secret: string | null, body: UazapiMessagePayload) {
  try {
    const msg = body.message;

    if (!msg) { console.log('[Bot] sem message no payload'); return; }
    if (msg.fromMe) { console.log('[Bot] ignorando — fromMe=true'); return; }
    if (msg.isGroup) { console.log('[Bot] ignorando — grupo'); return; }
    if (msg.type && msg.type !== 'text') { console.log('[Bot] ignorando — tipo:', msg.type); return; }

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings) { console.warn('[Bot] sem configurações no banco'); return; }
    if (!waSettings.bot_enabled) { console.log('[Bot] bot desativado'); return; }
    if (!waSettings.uazapi_url || !waSettings.uazapi_token) { console.warn('[Bot] credenciais incompletas'); return; }
    // Fail-closed: exige webhook_secret configurado E igual ao recebido. Sem secret
    // configurado, ninguém consegue acionar o bot desta profissional.
    if (!waSettings.webhook_secret || waSettings.webhook_secret !== secret) { console.warn('[Bot] secret inválido ou não configurado'); return; }

    // Diagnóstico: registra a chamada DEPOIS de validar o secret (escrita autenticada).
    await dbService.upsertWhatsAppConversation(professionalId, '_debug_last_call', [
      { role: 'user' as const, content: JSON.stringify({ EventType: body.EventType, fromMe: body.message?.fromMe, isGroup: body.message?.isGroup, type: body.message?.type, chatid: body.message?.chatid }), at: Date.now() }
    ]).catch(() => {});

    const clientPhone = phoneFromJid(msg.chatid || '');
    if (!clientPhone) { console.warn('[Bot] número inválido:', msg.chatid); return; }

    // Lista de números que a profissional bloqueou: o bot NÃO responde a eles.
    const blockedNumbers = (waSettings.bot_blocked_numbers || []).map(normalizeWhatsapp).filter(Boolean);
    if (blockedNumbers.includes(normalizeWhatsapp(clientPhone))) {
      console.log('[Bot] número bloqueado pela profissional — ignorando', clientPhone);
      return;
    }

    const messageText = (msg.text || '').trim();
    if (!messageText) { console.log('[Bot] mensagem vazia'); return; }

    console.log('[Bot] mensagem de', clientPhone, ':', messageText.slice(0, 50));

    const conversation = await dbService.getWhatsAppConversation(professionalId, clientPhone);
    if (conversation?.bot_paused) { console.log('[Bot] pausado para', clientPhone); return; }

    // Cooldown: após mensagem automática do sistema, o bot não responde por alguns minutos.
    if (conversation?.bot_cooldown_until && new Date(conversation.bot_cooldown_until) > new Date()) {
      console.log('[Bot] cooldown ativo até', conversation.bot_cooldown_until, '— ignorando de', clientPhone);
      return;
    }

    // Se já existe um registro de conversa (mesmo sem histórico de bot), é contato recorrente.
    // Isso evita reapresentação quando o histórico é perdido por race condition ou erro.
    const isReturningClient = !!conversation;

    const stopKeyword = waSettings.stop_keyword || '#humano';
    if (messageText.toLowerCase() === stopKeyword.toLowerCase()) {
      await dbService.setBotPaused(professionalId, clientPhone, true).catch(() => {});
      await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone,
        'Tudo bem! Vou chamar a profissional para te atender pessoalmente. Um momento 😊');
      return;
    }

    // ── DEBOUNCE ──────────────────────────────────────────────────────────────
    // Salva a mensagem imediatamente (atualiza last_message_at no banco).
    // Depois aguarda 1.5s: se outra mensagem da mesma cliente chegar nesse
    // intervalo, ela sobrescreverá last_message_at e este processamento aborta,
    // cedendo o controle para a mensagem mais recente (que terá o contexto completo).
    const arrivalTime = Date.now();
    const pendingForDb = [
      ...(conversation?.messages || []),
      { role: 'user' as const, content: messageText, at: arrivalTime },
    ];
    // Passa arrivalTime para o upsert — DB armazena exatamente esse timestamp.
    // Sem isso, last_message_at fica alguns ms APÓS arrivalTime e o debounce
    // aborta sempre, achando que chegou mensagem mais nova.
    // botPaused=false só na criação (quando conversation é null) — não sobrescreve pausas já ativas
    await dbService.upsertWhatsAppConversation(professionalId, clientPhone, pendingForDb, conversation?.client_summary ?? undefined, arrivalTime, conversation ? undefined : false);

    await new Promise(r => setTimeout(r, 1500));

    const freshConv = await dbService.getWhatsAppConversation(professionalId, clientPhone);
    if (freshConv && new Date(freshConv.last_message_at).getTime() > arrivalTime) {
      console.log('[Bot] mensagem mais nova detectada — abortando esta para evitar resposta dupla');
      return;
    }
    // ── FIM DEBOUNCE ──────────────────────────────────────────────────────────

    // Diagnóstico temporário: marca o estágio + tempo decorrido. O último estágio
    // gravado antes de a função morrer (timeout) revela o gargalo.
    const t0 = Date.now();
    const mark = (stage: string) => dbService.upsertWhatsAppConversation(
      professionalId, '_debug_progress',
      [{ role: 'user' as const, content: `${stage} @ ${Date.now() - t0}ms`, at: Date.now() }]
    ).catch(() => {});
    await mark('inicio');

    const [professional, services, clientAppts] = await Promise.all([
      dbService.getProfessionalById(professionalId),
      dbService.getServicesByProfessional(professionalId),
      dbService.getAllAppointmentsByPhone(professionalId, clientPhone).catch(() => [] as Appointment[]),
    ]);
    await mark('apos-queries');

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const bookingUrl = waSettings.booking_url || `${appUrl}/agendar/${professional?.slug}`;

    // Lista oferecida à cliente: só serviços ativos E visíveis para a cliente (client_visible).
    const activeServices = services.filter(s => s.is_active && s.client_visible !== false);
    const servicesList = activeServices.length
      ? activeServices.map(s =>
          `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`
        ).join('\n')
      : '(consulte diretamente com a profissional)';

    const shortestDuration = activeServices.length
      ? Math.min(...activeServices.map(s => s.duration_minutes))
      : 30;

    const todayStr = isoInSaoPaulo(0);
    const agendaText = await buildAgendaText(professionalId, shortestDuration);
    await mark('apos-agenda');
    const clientAppointmentsText = formatClientAppointments(clientAppts, todayStr);

    const nowBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());

    // Usa mensagens do banco após o debounce.
    const allMessages = (freshConv?.messages || pendingForDb) as Array<{ role: 'user' | 'assistant'; content: string }>;
    const history = sanitizeHistory(allMessages);

    const hasPriorExchange = isReturningClient || allMessages.some(m => m.role === 'assistant') || !!freshConv?.client_summary;

    const professionalName = professional?.brand_name || professional?.name || 'profissional';
    const professionalFirstName = (professional?.name || '').trim().split(' ')[0] || 'a profissional';

    const ctx: BotContext = {
      professionalName,
      professionalFirstName,
      servicesList,
      bookingUrl,
      nowBR,
      agendaText,
      clientAppointmentsText,
      clientSummary: freshConv?.client_summary,
      hasPriorExchange,
      stopKeyword,
    };

    // Monta as tools de agendamento para o bot criar agendamentos de verdade.
    // NOTA: as tools do bot usam getAvailableSlots diretamente (sem public_slots_limit)
    // para que o bot veja TODOS os horários reais, não a versão limitada da página pública.
    const bookableServices: BookableService[] = activeServices.map(s => ({ id: s.id, name: s.name, duration_minutes: s.duration_minutes }));
    const DIAS_SEMANA_TOOL = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

    const bookingTools = {
      verHorariosLivres: tool({
        description: 'Retorna TODOS os horários livres de um dia para um serviço específico. Use quando a cliente já escolheu um dia.',
        parameters: z.object({
          data: z.string().describe('Data no formato YYYY-MM-DD'),
          serviceId: z.string().describe('ID do serviço (da tabela interna)'),
        }),
        execute: async ({ data, serviceId }: { data: string; serviceId: string }) => {
          console.log('[Bot Tool] verHorariosLivres:', data, serviceId);
          const svc = bookableServices.find(s => s.id === serviceId);
          if (!svc) return { success: false, error: 'Serviço não encontrado.' };
          try {
            const slots = await getAvailableSlots(professionalId, data, svc.duration_minutes);
            const livres = slots.filter(s => s.isAvailable).map(s => s.time);
            return { success: true, data, diaSemana: DIAS_SEMANA_TOOL[new Date(data + 'T12:00:00').getDay()], horarios_livres: livres, totalLivres: livres.length };
          } catch {
            return { success: false, error: 'Erro ao consultar horários.' };
          }
        },
      }),
      buscarHorariosProximos: tool({
        description: 'Busca horários livres em VÁRIOS dias consecutivos a partir de uma data. Use quando: a cliente quer "qualquer dia", "de manhã em qualquer dia", quando o dia preferido não tem horário, ou quando precisa oferecer alternativas. Retorna os próximos dias com disponibilidade.',
        parameters: z.object({
          dataInicio: z.string().describe('Data de início da busca (YYYY-MM-DD). Use a data de hoje ou a data que a cliente mencionou.'),
          serviceId: z.string().describe('ID do serviço'),
          quantidadeDias: z.number().optional().describe('Quantidade de dias para buscar (padrão: 7, máximo: 14)'),
          periodo: z.enum(['qualquer', 'manha', 'tarde']).optional().describe('Filtrar por período: manha (até 12h), tarde (12h em diante), qualquer (padrão)'),
        }),
        execute: async ({ dataInicio, serviceId, quantidadeDias, periodo }: { dataInicio: string; serviceId: string; quantidadeDias?: number; periodo?: string }) => {
          console.log('[Bot Tool] buscarHorariosProximos:', dataInicio, serviceId, quantidadeDias, periodo);
          const svc = bookableServices.find(s => s.id === serviceId);
          if (!svc) return { success: false, error: 'Serviço não encontrado.' };
          const dias = Math.min(quantidadeDias || 7, 14);
          const [y, m, d] = dataInicio.split('-').map(Number);
          const results: { data: string; diaSemana: string; horarios: string[] }[] = [];

          for (let i = 0; i < dias; i++) {
            const date = new Date(y, m - 1, d + i);
            const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            try {
              const slots = await getAvailableSlots(professionalId, iso, svc.duration_minutes);
              let livres = slots.filter(s => s.isAvailable).map(s => s.time);
              if (periodo === 'manha') livres = livres.filter(t => t < '12:00');
              else if (periodo === 'tarde') livres = livres.filter(t => t >= '12:00');
              if (livres.length > 0) {
                results.push({ data: iso, diaSemana: DIAS_SEMANA_TOOL[date.getDay()], horarios: livres });
              }
            } catch {}
          }

          return {
            success: true,
            diasComHorario: results.slice(0, 7),
            totalDiasVerificados: dias,
            totalDiasComVaga: results.length,
          };
        },
      }),
      agendar: tool({
        description: 'Cria o agendamento. Recusa se o horário já estiver ocupado.',
        parameters: z.object({
          serviceId: z.string().describe('ID do serviço'),
          data: z.string().describe('Data no formato YYYY-MM-DD'),
          horario: z.string().describe('Horário de início no formato HH:MM'),
          nomeCliente: z.string().describe('Nome real da cliente, coletado explicitamente NESTA conversa. NUNCA invente, suponha ou use um placeholder como "Cliente". Se você ainda não perguntou o nome, pergunte antes de chamar esta ferramenta.'),
        }),
        execute: async ({ serviceId, data, horario, nomeCliente }: { serviceId: string; data: string; horario: string; nomeCliente: string }) => {
          console.log('[Bot Tool] agendar:', serviceId, data, horario, nomeCliente);
          // Trava de segurança: não agenda com nome vazio/placeholder — devolve erro
          // para a IA pedir o nome à cliente em vez de criar agendamento sem nome.
          const nome = (nomeCliente || '').trim();
          const nomeInvalido = nome.length < 2 || /^(cliente|cliente whatsapp|n[ãa]o informado|sem nome)$/i.test(nome);
          if (nomeInvalido) {
            return { success: false, error: 'NOME_AUSENTE: pergunte o nome da cliente antes de agendar e chame a ferramenta novamente com o nome real.' };
          }
          const res = await createAppointmentAction({
            professionalId,
            serviceId,
            clientName: nome,
            clientWhatsapp: clientPhone,
            date: data,
            startTime: horario,
            notes: 'Agendado via WhatsApp (bot)',
          });
          if (res.success) {
            console.log('[Bot Tool] agendamento criado:', res.appointmentId);
          } else {
            console.log('[Bot Tool] falha ao agendar:', res.error);
          }
          return res;
        },
      }),
    };

    const systemPrompt = buildSystemPrompt(waSettings.bot_persona, ctx)
      + buildBookingInstructions(bookableServices, todayStr);

    let responseText: string;
    let shouldPauseBot = false;
    let usedFallback = false;
    await mark('pre-ia');
    try {
      const result = await generateWithModel({
        system: systemPrompt,
        messages: history,
        tools: bookingTools,
        maxSteps: 10,
        abortSignal: AbortSignal.timeout(40000),
      });
      await mark('pos-ia');
      const parsed = parsePauseMarker(result.text.trim());
      responseText = parsed.text;
      shouldPauseBot = parsed.pause;
      console.log('[Bot] IA respondeu:', responseText.slice(0, 80), shouldPauseBot ? '→ pausando' : '');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Bot] IA falhou, usando fallback:', errMsg);
      await dbService.upsertWhatsAppConversation(professionalId, '_debug_last_ai_error', [
        { role: 'user' as const, content: errMsg.slice(0, 500), at: Date.now() }
      ]).catch(() => {});
      // Fallback: responde UMA única vez que vai chamar a profissional e pausa (vira pendente).
      responseText = buildHandoffMessage(professionalFirstName);
      shouldPauseBot = true;
      usedFallback = true;
    }

    if (!responseText) {
      // Modelo respondeu vazio (só o marcador, por ex.) — usa o handoff padrão.
      responseText = buildHandoffMessage(professionalFirstName);
    }

    // Pausa ANTES de enviar a mensagem: qualquer resposta imediata da cliente já
    // encontra bot_paused=true no banco e é ignorada pelo webhook (vira pendente).
    if (shouldPauseBot) {
      await dbService.setBotPaused(professionalId, clientPhone, true);
      console.log('[Bot] pausado para', clientPhone, '— aguardando profissional retomar');
    }

    // Antes havia uma espera de até 5s aqui (simulação de "digitando…") via
    // sendTypingPresence. Nesta instância (fork uazapiGO) o endpoint /chat/presence
    // responde 405 — o indicador nunca aparece e a espera só queimava orçamento da
    // função serverless ANTES do envio, arriscando a função morrer sem responder.
    // Removido: a resposta agora é enviada imediatamente após a IA.
    await mark('pre-send');
    const sent = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, responseText);
    await mark(`pos-send sent=${sent}`);
    console.log('[Bot] enviado:', sent);
    dbService.upsertWhatsAppClient(professionalId, clientPhone, msg.senderName || '').catch(() => {});

    // Lê o estado mais recente do banco antes de salvar — evita sobrescrever mensagens
    // que chegaram enquanto a IA estava gerando a resposta (race condition).
    const latestConv = await dbService.getWhatsAppConversation(professionalId, clientPhone).catch(() => null);
    const baseMessages = latestConv?.messages || freshConv?.messages || pendingForDb;
    const updatedMessages = [
      ...baseMessages,
      { role: 'assistant' as const, content: responseText, at: Date.now() },
    ];

    // IMPORTANTE: ao salvar a resposta do bot, NÃO avance last_message_at para "agora".
    // last_message_at marca a chegada da última mensagem DA CLIENTE e é a base do debounce.
    // Se uma nova mensagem da cliente chegou enquanto a IA gerava (e está no próprio debounce),
    // empurrar last_message_at para now() faria essa nova mensagem se achar "antiga" e abortar —
    // ela ficaria sem resposta (a cliente precisava reenviar). Preservamos o timestamp do último
    // inbound conhecido (o do latestConv, ou o desta mensagem como fallback).
    const preserveTs = latestConv?.last_message_at
      ? new Date(latestConv.last_message_at).getTime()
      : arrivalTime;

    // Salva a resposta no histórico. IMPORTANTE: aguardar (await) — no serverless,
    // promessas não aguardadas são suspensas quando o handler retorna, e a gravação
    // nunca acontecia (a resposta era enviada, mas sumia do histórico → o bot perdia
    // contexto e se reapresentava). No fallback não resumimos (a IA acabou de falhar).
    if (usedFallback) {
      await dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, undefined, preserveTs).catch(() => {});
    } else {
      let newSummary: string | null = null;
      try {
        newSummary = await updateClientSummary(latestConv?.client_summary ?? freshConv?.client_summary, messageText, responseText);
      } catch { /* resumo é best-effort */ }
      await dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, newSummary ?? undefined, preserveTs).catch(() => {});
    }
    await mark('done');

  } catch (e) {
    console.error('[WhatsApp Webhook] erro:', e);
    // Persiste o erro para diagnóstico (o catch externo não deixava rastro no banco).
    const detail = e instanceof Error ? `${e.message}\n${e.stack ?? ''}` : String(e);
    await dbService.upsertWhatsAppConversation(professionalId, '_debug_last_processing_error', [
      { role: 'user' as const, content: detail.slice(0, 1500), at: Date.now() }
    ]).catch(() => {});
  }
}
