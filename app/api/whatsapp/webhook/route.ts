import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid, sendTypingPresence } from '@/lib/uazapi';
import { google } from '@ai-sdk/google';
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
      model: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
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

    console.log('[Bot] processando mensagem de', clientPhone, ':', messageText.slice(0, 50));

    const conversation = await dbService.getWhatsAppConversation(professionalId, clientPhone);
    if (conversation?.bot_paused) { console.log('[Bot] pausado para', clientPhone); return; }

    const stopKeyword = waSettings.stop_keyword || '#humano';
    if (messageText.toLowerCase() === stopKeyword.toLowerCase()) {
      await dbService.setBotPaused(professionalId, clientPhone, true).catch(() => {});
      await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone,
        'Tudo bem! Vou chamar a profissional para te atender pessoalmente. Um momento 😊');
      return;
    }

    const [professional, services] = await Promise.all([
      dbService.getProfessionalById(professionalId),
      dbService.getServicesByProfessional(professionalId),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const bookingUrl = waSettings.booking_url || `${appUrl}/agendar/${professional?.slug}`;

    const activeServices = services.filter(s => s.is_active);
    const servicesList = activeServices.length
      ? activeServices.map(s =>
          `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`
        ).join('\n')
      : '(consulte diretamente com a profissional)';

    const nowBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());

    const history = ((conversation?.messages || []) as Array<{ role: 'user' | 'assistant'; content: string }>).slice(-20);

    const systemPrompt = `Você é a assistente virtual de WhatsApp de ${professional?.name || 'uma profissional de beleza'} (${professional?.brand_name || ''}).
Responda de forma simpática, curta e direta — como uma atendente humana, não como um robô.
Nunca diga que é uma IA ou assistente virtual. Use linguagem informal e calorosa.
Hoje é ${nowBR}.

Serviços disponíveis:
${servicesList}

Link para agendar online: ${bookingUrl}

${conversation?.client_summary
  ? `O que você já sabe sobre esta cliente: ${conversation.client_summary}\nUse esse contexto naturalmente. Não se apresente novamente — vocês já conversaram antes.`
  : 'Esta é provavelmente a primeira conversa com esta cliente.'}

Instruções:
- Se a cliente quiser agendar, ver horários disponíveis ou marcar um horário → responda com o link: ${bookingUrl}
- Para dúvidas sobre preços, duração ou serviços → responda com base nos dados acima.
- Se não souber responder algo → diga que vai verificar com a profissional e peça para aguardar.
- Se a cliente pedir para falar diretamente com a profissional, com a Julia, ou com um atendente humano (de qualquer forma que expresse isso) → responda dizendo que vai avisar a Julia agora e peça para aguardar. Inclua o marcador [PAUSAR_BOT] ao FINAL da resposta (ele é removido automaticamente antes de enviar).
- Se a cliente digitar "${stopKeyword}" → diga que vai chamar a profissional e inclua [PAUSAR_BOT] ao final.
- Respostas curtas e objetivas (máximo 3 linhas). Sem formatação markdown. Use emojis com moderação.
${waSettings.bot_persona ? `\nPersonalidade e tom: ${waSettings.bot_persona}` : ''}`;

    let responseText: string;
    let shouldPauseBot = false;
    try {
      const result = await generateText({
        model: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
        system: systemPrompt,
        messages: [...history, { role: 'user' as const, content: messageText }],
        abortSignal: AbortSignal.timeout(25000),
      });
      const raw = result.text.trim();
      shouldPauseBot = raw.includes('[PAUSAR_BOT]');
      responseText = raw.replace('[PAUSAR_BOT]', '').trim();
      console.log('[Bot] Gemini respondeu:', responseText.slice(0, 80), shouldPauseBot ? '→ pausando bot' : '');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      console.error('[Bot] Gemini falhou, usando fallback:', errMsg);
      await dbService.upsertWhatsAppConversation(professionalId, '_debug_last_gemini_error', [
        { role: 'user' as const, content: errMsg.slice(0, 500), at: Date.now() }
      ]).catch(() => {});
      responseText = `Olá! Para agendar ou ver horários disponíveis, acesse: ${bookingUrl} 😊`;
    }

    // Delay proporcional ao tamanho da resposta (entre 1.5s e 5s) simulando digitação
    const typingDelay = Math.min(Math.max(responseText.length * 35, 1500), 5000);
    await sendTypingPresence(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, typingDelay);

    const sent = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, responseText);
    console.log('[Bot] mensagem enviada:', sent);

    // Pausa o bot se Gemini sinalizou transferência para atendimento humano
    if (shouldPauseBot) {
      dbService.setBotPaused(professionalId, clientPhone, true).catch(() => {});
    }

    // Registra cliente na base (best-effort, não bloqueia)
    dbService.upsertWhatsAppClient(professionalId, clientPhone, msg.senderName || '').catch(() => {});

    const updatedMessages = [
      ...(conversation?.messages || []),
      { role: 'user' as const, content: messageText, at: Date.now() },
      { role: 'assistant' as const, content: responseText, at: Date.now() },
    ];

    // Atualiza resumo da cliente em background (não bloqueia a resposta)
    updateClientSummary(conversation?.client_summary, messageText, responseText)
      .then(newSummary => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages, newSummary ?? undefined))
      .catch(() => dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages).catch(() => {}));

  } catch (e) {
    console.error('[WhatsApp Webhook] erro:', e);
  }
}
