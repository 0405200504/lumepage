import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { dbService } from '@/lib/supabase/db';
import { sendWhatsAppText, phoneFromJid } from '@/lib/uazapi';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

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
  };
}

export async function POST(req: NextRequest) {
  const pid = req.nextUrl.searchParams.get('pid');
  const secret = req.nextUrl.searchParams.get('secret');

  if (!pid) return NextResponse.json({ ok: true });

  let body: UazapiMessagePayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  // Processa de forma assíncrona após retornar 200 (uazapi exige resposta em < 5s)
  after(async () => {
    await processMessage(pid, secret, body);
  });

  return NextResponse.json({ ok: true });
}

async function processMessage(professionalId: string, secret: string | null, body: UazapiMessagePayload) {
  try {
    const { event, data } = body;

    // Só processa mensagens de texto recebidas de clientes (não enviadas pela profissional, não de grupos)
    if (event !== 'message' || !data) return;
    if (data.fromMe || data.isGroup) return;
    if (data.type !== 'text') return;

    const waSettings = await dbService.getWhatsAppSettings(professionalId);
    if (!waSettings || !waSettings.bot_enabled) return;
    if (!waSettings.uazapi_url || !waSettings.uazapi_token) return;

    // Valida o secret para evitar chamadas não autorizadas
    if (secret && waSettings.webhook_secret !== secret) return;

    const clientPhone = phoneFromJid(data.from || '');
    if (!clientPhone) return;

    const messageText = (data.body || '').trim();
    if (!messageText) return;

    // Verifica se o bot está pausado para essa conversa (cliente usou a palavra-chave de humano)
    const conversation = await dbService.getWhatsAppConversation(professionalId, clientPhone);
    if (conversation?.bot_paused) return;

    // Palavra-chave que desativa o bot para esse cliente
    const stopKeyword = waSettings.stop_keyword || '#humano';
    if (messageText.toLowerCase() === stopKeyword.toLowerCase()) {
      await dbService.pauseWhatsAppConversation(professionalId, clientPhone);
      await sendWhatsAppText(
        waSettings.uazapi_url,
        waSettings.uazapi_token,
        clientPhone,
        'Tudo bem! Vou chamar a profissional para te atender pessoalmente. Um momento 😊'
      );
      return;
    }

    // Carrega contexto da profissional para o Gemini
    const [professional, services] = await Promise.all([
      dbService.getProfessionalById(professionalId),
      dbService.getServicesByProfessional(professionalId),
    ]);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const bookingUrl = `${appUrl}/agendar/${professional?.slug}`;

    const activeServices = services.filter(s => s.is_active);
    const servicesList = activeServices.length
      ? activeServices
          .map(s => `- ${s.name}: ${s.duration_minutes}min, R$ ${(s.price_cents / 100).toFixed(2).replace('.', ',')}`)
          .join('\n')
      : '(consulte diretamente com a profissional)';

    const nowBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());

    // Histórico da conversa (últimas 10 mensagens) para manter contexto
    const history = ((conversation?.messages || []) as Array<{ role: 'user' | 'assistant'; content: string }>)
      .slice(-10);

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

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...history,
      { role: 'user', content: messageText },
    ];

    let responseText: string;
    try {
      const result = await generateText({
        model: google(process.env.GEMINI_MODEL || 'gemini-2.5-flash'),
        system: systemPrompt,
        messages,
      });
      responseText = result.text.trim();
    } catch (e) {
      console.error('[WhatsApp Bot] Gemini erro:', e);
      responseText = `Olá! Para agendar ou ver horários disponíveis, acesse: ${bookingUrl} 😊`;
    }

    // Envia a resposta via uazapi
    await sendWhatsAppText(waSettings.uazapi_url, waSettings.uazapi_token, clientPhone, responseText);

    // Salva o histórico da conversa para manter contexto nas próximas mensagens
    const updatedMessages: WhatsAppConversation['messages'] = [
      ...(conversation?.messages || []),
      { role: 'user', content: messageText, at: Date.now() },
      { role: 'assistant', content: responseText, at: Date.now() },
    ];
    await dbService.upsertWhatsAppConversation(professionalId, clientPhone, updatedMessages);

  } catch (e) {
    console.error('[WhatsApp Webhook] Erro ao processar mensagem:', e);
  }
}

// Tipo local para evitar import circular
type WhatsAppConversation = {
  messages: Array<{ role: 'user' | 'assistant'; content: string; at: number }>;
};
