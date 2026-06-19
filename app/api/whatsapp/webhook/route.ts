import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid, sendTypingPresence } from '@/lib/uazapi';
import { getAvailableSlots } from '@/lib/appointments/slots';
import { openai } from '@ai-sdk/openai';
import { generateText, tool } from 'ai';
import { z } from 'zod';
import { createAppointmentAction } from '@/app/actions/booking';
import {
  buildSystemPrompt,
  sanitizeHistory,
  parsePauseMarker,
  buildHandoffMessage,
  type BotContext,
} from '@/lib/whatsapp/bot-core';
import type { Appointment } from '@/types/database';

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
  const secret = req.nextUrl.searchParams.get('secret');

  console.log('[WhatsApp Webhook] recebido — pid:', pid);

  if (!pid) {
    console.warn('[WhatsApp Webhook] pid ausente na URL');
    return NextResponse.json({ ok: true });
  }

  let body: UazapiMessagePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  console.log('[WhatsApp Webhook] evento:', body.EventType, '| tipo:', body.message?.type, '| fromMe:', body.message?.fromMe, '| de:', body.message?.chatid);

  // Registra que a uazapi chamou nosso webhook (para diagnóstico no painel)
  await dbService.upsertWhatsAppConversation(pid, '_debug_last_call', [
    { role: 'user' as const, content: JSON.stringify({ EventType: body.EventType, fromMe: body.message?.fromMe, isGroup: body.message?.isGroup, type: body.message?.type, chatid: body.message?.chatid }), at: Date.now() }
  ]).catch(() => {});

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
    if (secret && waSettings.webhook_secret !== secret) { console.warn('[Bot] secret inválido'); return; }

    const clientPhone = phoneFromJid(msg.chatid || '');
    if (!clientPhone) { console.warn('[Bot] número inválido:', msg.chatid); return; }

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

    const [professional, services, clientAppts] = await Promise.all([
      dbService.getProfessionalById(professionalId),
      dbService.getServicesByProfessional(professionalId),
      dbService.getAllAppointmentsByPhone(professionalId, clientPhone).catch(() => [] as Appointment[]),
    ]);

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
    // ── Ferramentas de agendamento autônomo ──────────────────────────────────
    // O bot pode agendar SOZINHO (sem depender da profissional). A criação usa
    // createAppointmentAction (fluxo público): ela revalida os horários livres e
    // RECUSA se o slot já estiver ocupado — ou seja, uma cliente nunca consegue
    // marcar em cima de outra. Só a profissional (caminho manual) pode encaixar
    // duas no mesmo horário. Só agenda serviços ativos E visíveis (activeServices).
    const serviceById = new Map(activeServices.map(s => [s.id, s]));

    const bookingTools = {
      verHorariosLivres: tool({
        description:
          'Retorna os horários livres de um dia para um serviço. Use SEMPRE antes de oferecer horários ou agendar. Só ofereça à cliente horários que vierem daqui.',
        parameters: z.object({
          data: z.string().describe('Data no formato YYYY-MM-DD'),
          serviceId: z.string().describe('Código do serviço (da tabela de uso interno)'),
        }),
        execute: async ({ data, serviceId }: { data: string; serviceId: string }) => {
          const svc = serviceById.get(serviceId);
          if (!svc) return { success: false, error: 'Serviço inválido.' };
          try {
            const slots = await getAvailableSlots(professionalId, data, svc.duration_minutes);
            const livres = slots.filter(s => s.isAvailable).map(s => s.time);
            return { success: true, data, servico: svc.name, horarios_livres: livres };
          } catch {
            return { success: false, error: 'Não consegui consultar a agenda agora.' };
          }
        },
      }),
      agendar: tool({
        description:
          'Cria o agendamento da cliente na agenda. Valida conflito e RECUSA se o horário já estiver ocupado por outra cliente. Use só depois de confirmar serviço, dia, horário e nome com a cliente.',
        parameters: z.object({
          serviceId: z.string().describe('Código do serviço (da tabela de uso interno)'),
          data: z.string().describe('Data no formato YYYY-MM-DD'),
          horario: z.string().describe('Hora de início no formato HH:MM'),
          nomeCliente: z.string().describe('Nome da cliente'),
        }),
        execute: async ({ serviceId, data, horario, nomeCliente }: { serviceId: string; data: string; horario: string; nomeCliente: string }) => {
          const svc = serviceById.get(serviceId);
          if (!svc) return { success: false, error: 'Serviço inválido.' };
          const res = await createAppointmentAction({
            professionalId,
            serviceId,
            clientName: nomeCliente?.trim() || msg.senderName || 'Cliente',
            clientWhatsapp: clientPhone,
            date: data,
            startTime: horario,
          });
          if (!res.success) return { success: false, error: res.error || 'Não foi possível agendar.' };
          console.log('[Bot] agendou via WhatsApp:', svc.name, data, horario, 'para', clientPhone);
          return { success: true, servico: svc.name, data, horario };
        },
      }),
    };

    const internalServiceTable = activeServices.length
      ? activeServices.map(s => `- ${s.id} → ${s.name} (${s.duration_minutes}min)`).join('\n')
      : '(nenhum serviço disponível para agendar)';

    const bookingToolNote = `

---
USO INTERNO PARA AGENDAR POR AQUI (NUNCA mostre estes códigos nem fale deles à cliente):
Hoje é ${todayStr}. Converta "amanhã", "sexta", "dia 20" etc. para a data real no formato YYYY-MM-DD.
Serviços que você PODE agendar (código → nome):
${internalServiceTable}

Quando a cliente quiser agendar com a sua ajuda por aqui:
1) Identifique o serviço (use o código da tabela acima) e o dia que ela quer.
2) Chame a ferramenta verHorariosLivres com a data (YYYY-MM-DD) e o código do serviço.
3) Ofereça à cliente NO MÁXIMO 3 dos horários retornados. NUNCA ofereça horário que não veio da ferramenta.
4) Quando ela escolher, confirme numa frase: serviço, dia, horário e o nome dela (peça o nome se não souber).
5) Só então chame a ferramenta agendar com serviceId, data, horario e nomeCliente.
6) Se agendar retornar sucesso, avise que ficou tudo certo e confirmado. Se retornar erro/horário ocupado,
   peça desculpa, diga que esse horário acabou de ser preenchido e ofereça outro horário livre.
Uma cliente NUNCA pode marcar num horário já ocupado por outra — a ferramenta agendar já garante isso e
recusa automaticamente. Não tente forçar. Só a profissional pode encaixar mais de uma cliente no mesmo horário.`;

    const systemPrompt = buildSystemPrompt(waSettings.bot_persona, ctx) + bookingToolNote;

    let responseText: string;
    let shouldPauseBot = false;
    let usedFallback = false;
    try {
      const result = await generateWithModel({
        system: systemPrompt,
        messages: history,
        tools: bookingTools,
        maxSteps: 5,
        abortSignal: AbortSignal.timeout(30000),
      });
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

    const typingDelay = Math.min(Math.max(responseText.length * 35, 1500), 5000);
    await sendTypingPresence(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, typingDelay);

    const sent = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, responseText);
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

    // No fallback não chamamos a IA de novo para resumir (ela acabou de falhar) — só salvamos.
    if (usedFallback) {
      await dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, undefined, preserveTs).catch(() => {});
    } else {
      updateClientSummary(latestConv?.client_summary ?? freshConv?.client_summary, messageText, responseText)
        .then(newSummary => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, newSummary ?? undefined, preserveTs))
        .catch(() => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, undefined, preserveTs).catch(() => {}));
    }

  } catch (e) {
    console.error('[WhatsApp Webhook] erro:', e);
  }
}
