import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid, sendTypingPresence } from '@/lib/uazapi';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

export const maxDuration = 60;

// Ordem de fallback: tenta o próximo modelo automaticamente quando quota acabar.
// Configure GEMINI_MODEL no Vercel para forçar um modelo específico.
const GEMINI_FALLBACK_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.0-flash',
].filter((v, i, arr) => arr.indexOf(v) === i); // remove duplicatas

function isQuotaError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429');
}

async function generateWithFallback(params: Parameters<typeof generateText>[0]): Promise<Awaited<ReturnType<typeof generateText>>> {
  for (let i = 0; i < GEMINI_FALLBACK_MODELS.length; i++) {
    const model = GEMINI_FALLBACK_MODELS[i];
    try {
      return await generateText({ ...params, model: google(model) });
    } catch (e) {
      if (isQuotaError(e) && i < GEMINI_FALLBACK_MODELS.length - 1) {
        console.warn(`[Bot] quota esgotada em ${model}, tentando ${GEMINI_FALLBACK_MODELS[i + 1]}...`);
        continue;
      }
      throw e;
    }
  }
  throw new Error('Todos os modelos Gemini com quota esgotada.');
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
    const result = await generateWithFallback({
      system: 'Você mantém um registro conciso sobre clientes de um salão de beleza. Responda APENAS com o texto do resumo, sem explicações adicionais.',
      prompt: `Resumo anterior: "${prev || 'nenhum ainda'}"\n\nÚltima troca:\nCliente: "${userMessage}"\nAssistente: "${botReply}"\n\nAtualize o resumo com o que é útil lembrar sobre esta cliente (nome, preferências de horário, serviços de interesse, histórico mencionado, observações). Máximo 3 frases curtas. Se nada novo for relevante, retorne o resumo anterior sem alteração.`,
      abortSignal: AbortSignal.timeout(15000),
    });
    return result.text.trim() || prev || null;
  } catch {
    return prev ?? null;
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

    // Cooldown: após mensagem automática do sistema, o Gemini não responde por 30 min.
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
    const pendingMessages = [
      ...(conversation?.messages || []),
      { role: 'user' as const, content: messageText, at: arrivalTime },
    ];
    // Passa arrivalTime para o upsert — DB armazena exatamente esse timestamp.
    // Sem isso, last_message_at fica alguns ms APÓS arrivalTime e o debounce
    // aborta sempre, achando que chegou mensagem mais nova.
    // botPaused=false só na criação (quando conversation é null) — não sobrescreve pausas já ativas
    await dbService.upsertWhatsAppConversation(professionalId, clientPhone, pendingMessages, conversation?.client_summary ?? undefined, arrivalTime, conversation ? undefined : false);

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
      dbService.getUpcomingAppointmentsByPhone(professionalId, clientPhone).catch(() => []),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const bookingUrl = waSettings.booking_url || `${appUrl}/agendar/${professional?.slug}`;

    const activeServices = services.filter(s => s.is_active);
    const servicesList = activeServices.length
      ? activeServices.map(s =>
          `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`
        ).join('\n')
      : '(consulte diretamente com a profissional)';

    const pad = (n: number) => String(n).padStart(2, '0');
    const todayStr = (() => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; })();

    const upcomingApptsList = clientAppts.length > 0
      ? clientAppts.map(a => {
          const [y, m, d] = a.date.split('-');
          const label = a.date === todayStr ? 'HOJE' : `${d}/${m}/${y}`;
          const status = a.status === 'confirmed' ? 'confirmado' : a.status === 'pending' ? 'pendente de confirmação' : a.status;
          return `- ${label} às ${a.start_time.substring(0, 5)}: ${a.service?.name || 'serviço'} (${status})`;
        }).join('\n')
      : 'nenhum agendamento futuro encontrado para este número';

    const nowBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());

    // Usa mensagens do banco após o debounce.
    const allMessages = (freshConv?.messages || pendingMessages) as Array<{ role: 'user' | 'assistant'; content: string }>;

    // Gemini exige que o histórico comece com 'user' e que os papéis se alternem.
    // appendAutomatedMessage salva 'assistant' como primeira mensagem (antes de qualquer
    // resposta da cliente), o que faz o Gemini retornar erro e cair no fallback.
    const rawHistory = allMessages.slice(-20);
    const firstUserIdx = rawHistory.findIndex(m => m.role === 'user');
    const sanitized = firstUserIdx >= 0 ? rawHistory.slice(firstUserIdx) : rawHistory;
    // Remove mensagens consecutivas do mesmo papel (merge: mantém a última de cada sequência)
    const history = sanitized.reduce<typeof sanitized>((acc, msg) => {
      if (acc.length > 0 && acc[acc.length - 1].role === msg.role) {
        acc[acc.length - 1] = { ...acc[acc.length - 1], content: acc[acc.length - 1].content + '\n' + msg.content };
      } else {
        acc.push(msg);
      }
      return acc;
    }, []);

    const hasPriorExchange = isReturningClient || allMessages.some(m => m.role === 'assistant') || !!freshConv?.client_summary;

    const pilares = `
---
PILARES INEGOCIÁVEIS (valem sempre, sem exceção):

1. HUMANIDADE — Escreva como uma pessoa real no WhatsApp. Sem markdown, sem listas com traços ou asteriscos, sem negrito. Máximo 1 emoji por mensagem, somente se combinar naturalmente com o tom. Respostas curtas: 1 a 3 frases. Nunca use bullet points.

2. COERÊNCIA — Leia o histórico completo antes de responder. Nunca repita informações já dadas nesta conversa. Se já cumprimentou, não cumprimente de novo. Dê continuidade natural ao assunto em aberto sem voltar ao início.

3. DISCRIÇÃO — Nunca revele que é IA, robô, assistente virtual ou sistema automatizado. Se perguntada diretamente, desvie com naturalidade. Você é simplesmente a atendente.

---
AÇÃO OBRIGATÓRIA DO SISTEMA:
Se a cliente: mencionar que quer falar com ${professional?.name || 'a profissional'} diretamente, fazer uma reclamação, expressar insatisfação, pedir cancelamento, ou digitar "${stopKeyword}" → responda normalmente E adicione [PAUSAR_BOT] ao final da mensagem. Sem exceção.`;

    const dadosTempoReal = `
---
DADOS EM TEMPO REAL:
- Data/hora: ${nowBR}
- Serviços disponíveis: ${servicesList}
- Link de agendamento: ${bookingUrl}
- Agendamentos futuros desta cliente: ${upcomingApptsList}
${freshConv?.client_summary ? `- Perfil desta cliente: ${freshConv.client_summary}` : ''}
${hasPriorExchange ? '- Contato recorrente: não se reapresente.' : '- Primeiro contato com esta cliente.'}`;

    const systemPrompt = waSettings.bot_persona
      ? `${waSettings.bot_persona}
${dadosTempoReal}
${pilares}`
      : `Você é a atendente da ${professional?.brand_name || professional?.name || 'profissional'}. Atenda com cordialidade e naturalidade.
${dadosTempoReal}
${pilares}`;

    let responseText: string;
    let shouldPauseBot = false;
    try {
      const result = await generateWithFallback({
        system: systemPrompt,
        messages: history,
        abortSignal: AbortSignal.timeout(25000),
      });
      const raw = result.text.trim();
      shouldPauseBot = raw.includes('[PAUSAR_BOT]');
      responseText = raw.replace('[PAUSAR_BOT]', '').trim();
      console.log('[Bot] Gemini respondeu:', responseText.slice(0, 80), shouldPauseBot ? '→ pausando' : '');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Bot] Gemini falhou, usando fallback:', errMsg);
      await dbService.upsertWhatsAppConversation(professionalId, '_debug_last_openai_error', [
        { role: 'user' as const, content: errMsg.slice(0, 500), at: Date.now() }
      ]).catch(() => {});
      responseText = `Para agendar ou ver horários disponíveis, acesse: ${bookingUrl} 😊`;
    }

    // Pausa ANTES de enviar a mensagem: qualquer resposta imediata da cliente já
    // encontra bot_paused=true no banco e é ignorada pelo webhook.
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
    // que chegaram enquanto o Gemini estava gerando a resposta (race condition).
    const latestConv = await dbService.getWhatsAppConversation(professionalId, clientPhone).catch(() => null);
    const baseMessages = latestConv?.messages || freshConv?.messages || pendingMessages;
    const updatedMessages = [
      ...baseMessages,
      { role: 'assistant' as const, content: responseText, at: Date.now() },
    ];

    updateClientSummary(latestConv?.client_summary ?? freshConv?.client_summary, messageText, responseText)
      .then(newSummary => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, newSummary ?? undefined))
      .catch(() => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages).catch(() => {}));

  } catch (e) {
    console.error('[WhatsApp Webhook] erro:', e);
  }
}
