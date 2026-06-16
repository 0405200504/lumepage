import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid } from '@/lib/uazapi';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

// 30s para ter margem para o Gemini, mas respondemos à uazapi em < 5s
export const maxDuration = 30;

interface UazapiMessagePayload {
  instance?: string;
  event?: string;
  data?: {
    id?: string;
    from?: string;
    fromMe?: boolean;
    isGroup?: boolean;
    body?: string;
    type?: string;
    timestamp?: number;
    pushName?: string;
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

  console.log('[WhatsApp Webhook] evento:', body.event, '| tipo:', body.data?.type, '| fromMe:', body.data?.fromMe, '| de:', body.data?.from);

  // Grava que o webhook foi chamado — await garante que é salvo antes de retornar
  await dbService.upsertWhatsAppConversation(pid, '_debug_last_call', [
    { role: 'user' as const, content: JSON.stringify({ event: body.event, fromMe: body.data?.fromMe, type: body.data?.type, from: body.data?.from }), at: Date.now() }
  ]).catch(() => {});

  // Aguarda o processamento ANTES de responder.
  // Em Vercel serverless, fire-and-forget é morto quando a resposta é enviada.
  // O Gemini tem timeout de 4s para garantir resposta total < 5s (limite da uazapi).
  await processMessage(pid, secret, body);

  return NextResponse.json({ ok: true });
}

async function processMessage(professionalId: string, secret: string | null, body: UazapiMessagePayload) {
  try {
    const { event, data } = body;

    if (!data) { console.log('[Bot] sem data no payload'); return; }

    // Ignora mensagens enviadas PELA profissional, grupos, e não-texto
    if (data.fromMe) { console.log('[Bot] ignorando — fromMe=true'); return; }
    if (data.isGroup) { console.log('[Bot] ignorando — grupo'); return; }

    // Aceita event === 'message' OU qualquer evento que tenha body de texto
    const hasText = !!(data.body?.trim());
    if (event !== 'message' && !hasText) { console.log('[Bot] ignorando — evento:', event, 'sem texto'); return; }
    if (data.type && data.type !== 'text') { console.log('[Bot] ignorando — tipo:', data.type); return; }

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings) { console.warn('[Bot] sem configurações no banco'); return; }
    if (!waSettings.bot_enabled) { console.log('[Bot] bot desativado'); return; }
    if (!waSettings.uazapi_url || !waSettings.uazapi_token) { console.warn('[Bot] credenciais incompletas'); return; }

    if (secret && waSettings.webhook_secret !== secret) { console.warn('[Bot] secret inválido'); return; }

    const clientPhone = phoneFromJid(data.from || '');
    if (!clientPhone) { console.warn('[Bot] número inválido:', data.from); return; }

    const messageText = (data.body || '').trim();
    if (!messageText) { console.log('[Bot] mensagem vazia'); return; }

    console.log('[Bot] processando mensagem de', clientPhone, ':', messageText.slice(0, 50));

    const conversation = await dbService.getWhatsAppConversation(professionalId, clientPhone);
    if (conversation?.bot_paused) { console.log('[Bot] pausado para', clientPhone); return; }

    const stopKeyword = waSettings.stop_keyword || '#humano';
    if (messageText.toLowerCase() === stopKeyword.toLowerCase()) {
      await dbService.pauseWhatsAppConversation(professionalId, clientPhone);
      await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone,
        'Tudo bem! Vou chamar a profissional para te atender pessoalmente. Um momento 😊');
      return;
    }

    const [professional, services] = await Promise.all([
      dbService.getProfessionalById(professionalId),
      dbService.getServicesByProfessional(professionalId),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const bookingUrl = `${appUrl}/agendar/${professional?.slug}`;

    const activeServices = services.filter(s => s.is_active);
    const servicesList = activeServices.length
      ? activeServices.map(s =>
          `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`
        ).join('\n')
      : '(consulte diretamente com a profissional)';

    const nowBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(new Date());

    const history = ((conversation?.messages || []) as Array<{ role: 'user' | 'assistant'; content: string }>).slice(-10);

    const systemPrompt = `Você é a assistente virtual de WhatsApp de ${professional?.name || 'uma profissional de beleza'} (${professional?.brand_name || ''}).
Responda de forma simpática, curta e direta — como uma atendente humana, não como um robô.
Nunca diga que é uma IA ou assistente virtual. Use linguagem informal e calorosa.
Hoje é ${nowBR}.

Serviços disponíveis:
${servicesList}

Link para agendar online: ${bookingUrl}

Instruções:
- Se a cliente quiser agendar, ver horários disponíveis ou marcar um horário → responda com o link: ${bookingUrl}
- Para dúvidas sobre preços, duração ou serviços → responda com base nos dados acima.
- Se não souber responder algo → diga que vai verificar com a profissional e peça para aguardar.
- Se a cliente digitar "${stopKeyword}" → diga que vai chamar a profissional.
- Respostas curtas e objetivas (máximo 3 linhas). Sem formatação markdown. Use emojis com moderação.
${waSettings.bot_persona ? `\nPersonalidade e tom: ${waSettings.bot_persona}` : ''}`;

    let responseText: string;
    try {
      const result = await generateText({
        model: google(process.env.GEMINI_MODEL || 'gemini-2.0-flash'),
        system: systemPrompt,
        messages: [...history, { role: 'user' as const, content: messageText }],
        abortSignal: AbortSignal.timeout(4000), // máx 4s para caber no limite de 5s da uazapi
      });
      responseText = result.text.trim();
      console.log('[Bot] Gemini respondeu:', responseText.slice(0, 80));
    } catch (e) {
      console.error('[Bot] Gemini falhou, usando fallback:', e);
      responseText = `Olá! Para agendar ou ver horários disponíveis, acesse: ${bookingUrl} 😊`;
    }

    const sent = await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, responseText);
    console.log('[Bot] mensagem enviada:', sent);

    // Salva histórico (best-effort — não bloqueia)
    dbService.upsertWhatsAppConversation(professionalId, clientPhone, [
      ...(conversation?.messages || []),
      { role: 'user' as const, content: messageText, at: Date.now() },
      { role: 'assistant' as const, content: responseText, at: Date.now() },
    ]).catch(() => {});

  } catch (e) {
    console.error('[WhatsApp Webhook] erro:', e);
  }
}

