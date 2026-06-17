import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid, sendTypingPresence } from '@/lib/uazapi';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 60;

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
    const result = await generateText({
      model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
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
    await dbService.upsertWhatsAppConversation(professionalId, clientPhone, pendingMessages, conversation?.client_summary ?? undefined);

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

    const defaultPersona = `Você é a atendente da ${professional?.brand_name || professional?.name || 'profissional'}. Responda como uma pessoa real no WhatsApp: natural, calorosa, direta. Sem markdown, sem listas.`;

    const personaBlock = waSettings.bot_persona
      ? `=== INSTRUÇÕES DA PROFISSIONAL — SIGA À RISCA ===
${waSettings.bot_persona}
=== FIM DAS INSTRUÇÕES ===`
      : defaultPersona;

    const systemPrompt = `${personaBlock}

CONTEXTO (use para responder com precisão, não substitui as instruções acima):
- Profissional: ${professional?.name || ''} (${professional?.brand_name || ''})
- Data/hora atual: ${nowBR}
- Serviços disponíveis: ${servicesList}
- Link de agendamento: ${bookingUrl}
- Agendamentos futuros desta cliente: ${upcomingApptsList}
${freshConv?.client_summary ? `- O que você sabe sobre esta cliente: ${freshConv.client_summary}` : ''}
${hasPriorExchange ? '- Esta cliente já conversou com você antes. Continue naturalmente, sem se reapresentar.' : '- Primeira mensagem desta cliente.'}

COMO SE COMPORTAR:
- Leia o histórico inteiro antes de responder. Nunca repita algo que já foi dito na conversa.
- Responda apenas o que a mensagem atual pede. 1 a 3 frases, direto ao ponto.
- Tom humano: escreva como alguém digitando no celular, não como um robô ou atendente de script.
- Emojis: zero ou no máximo um por mensagem, só se fizer sentido. Nunca enfileirar emojis.
- Sem saudações duplas, sem repetir o nome da cliente, sem "Claro!", "Com certeza!", "Ótimo!".
- Se a cliente perguntou algo e você já sabe a resposta (serviço, preço, agendamento), responda diretamente sem rodeios.

REGRAS INEGOCIÁVEIS:
1. Se a cliente quiser cancelar, reclamar ou falar com a ${professional?.name || 'profissional'} → diga que vai chamá-la agora e coloque [PAUSAR_BOT] no final.
2. Se a cliente digitar "${stopKeyword}" → coloque [PAUSAR_BOT] no final.
3. Nunca revele que é uma IA ou sistema automatizado.`;

    let responseText: string;
    let shouldPauseBot = false;
    try {
      const result = await generateText({
        model: openai(process.env.OPENAI_MODEL || 'gpt-4o-mini'),
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
