import { createHash } from 'node:crypto';
import { authService } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { buildAssistantContext, buildAssistantTools } from '@/lib/assistant/agent';
import { realtimeTools, voiceInstructions, voiceSessionConfig } from '@/lib/assistant/voice';
import {
  BudgetUnavailable, BUDGET_REACHED_MSG, VOICE_MAX_MINUTES, VOICE_RESERVE_USD_PER_MIN,
  monthKey, remainingMicros, typicalVoiceMinutes,
} from '@/lib/assistant/budget';
import { hangupRealtimeCall, sweepExpiredVoiceCalls } from '@/lib/assistant/voice-calls';

/**
 * Abre uma conversa por voz.
 *
 * O navegador manda a oferta WebRTC (SDP) PARA CÁ, e o servidor é quem fala
 * com a OpenAI. Assim a chave da OpenAI nunca sai do servidor e — o motivo
 * principal — o servidor fica com o ID da chamada: confere o saldo do mês
 * antes, dá um prazo a ela e consegue encerrá-la na OpenAI quando o prazo
 * vence ou o teto acaba, mesmo que o app não colabore.
 */
export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return Response.json({ error: 'A conversa por voz está indisponível: chave da IA não configurada.' }, { status: 503 });
  }

  const session = await authService.getCurrentUser();
  if (!session?.professional_id) {
    return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  }
  const professionalId = session.professional_id;

  const rl = await rateLimit(`voice-session:${professionalId}`, 20, 10 * 60 * 1000);
  if (!rl.ok) {
    return Response.json({ error: `Muitas conversas seguidas. Tente de novo em ${rl.retryAfterSeconds}s.` }, { status: 429 });
  }

  const offerSdp = await req.text();
  if (!offerSdp.startsWith('v=')) {
    return Response.json({ error: 'Oferta de conexão inválida.' }, { status: 400 });
  }

  // O prompt (lista de serviços) não depende do saldo: a consulta já sai
  // agora, junto com a conferência abaixo, em vez de esperar por ela.
  const ctxReady = buildAssistantContext(professionalId);
  ctxReady.catch(() => {}); // se a conversa for recusada antes, o erro não fica solto

  // Saldo do mês e prazo desta conversa. A varredura das chamadas vencidas e
  // o saldo saem juntos; se a varredura fechou alguma (e cobrou o mínimo
  // dela no mês), o saldo é refeito depois dela — mesmo resultado de antes.
  let minutes: number;
  let remaining: number;
  try {
    const swept = sweepExpiredVoiceCalls(professionalId);
    const before = remainingMicros(professionalId);
    // Espera as duas: a varredura encerra chamadas na OpenAI e não pode ficar pela metade.
    await Promise.allSettled([swept, before]);
    remaining = (await swept) > 0 ? await remainingMicros(professionalId) : await before;
    minutes = Math.min(VOICE_MAX_MINUTES, Math.floor(remaining / (VOICE_RESERVE_USD_PER_MIN * 1e6)));
  } catch (e) {
    if (e instanceof BudgetUnavailable) {
      return Response.json({ error: 'A conversa por voz ainda não foi ativada (falta rodar a migração v43 no banco).' }, { status: 503 });
    }
    throw e;
  }
  if (minutes < 1) {
    return Response.json({ error: BUDGET_REACHED_MSG, budget: true }, { status: 402 });
  }

  const ctx = await ctxReady;
  const firstName = (session.name || '').trim().split(/\s+/)[0] || 'profissional';
  const config = voiceSessionConfig({
    instructions: voiceInstructions(ctx.systemPrompt, firstName),
    tools: realtimeTools(buildAssistantTools(ctx)),
  });

  const fd = new FormData();
  fd.set('sdp', offerSdp);
  fd.set('session', JSON.stringify(config));
  const res = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      // Identificador anônimo (hash) da conta, para a OpenAI separar abuso por usuário.
      'OpenAI-Safety-Identifier': createHash('sha256').update(professionalId).digest('hex'),
    },
    body: fd,
  });
  if (!res.ok) {
    console.error('Realtime calls falhou:', res.status, (await res.text()).slice(0, 300));
    return Response.json({ error: 'Não foi possível abrir a conversa por voz agora.' }, { status: 502 });
  }
  const answerSdp = await res.text();
  // Location: /v1/realtime/calls/{call_id}
  const callId = (res.headers.get('location') || '').split('/').filter(Boolean).pop() || '';
  if (!callId) {
    console.error('Realtime calls sem Location: a chamada não teria como ser encerrada pelo servidor.');
    return Response.json({ error: 'Não foi possível abrir a conversa por voz agora.' }, { status: 502 });
  }

  // Registra a chamada com prazo. Sem registro, não há como cobrar nem
  // encerrar: derruba na hora.
  const deadline = new Date(Date.now() + minutes * 60_000);
  const admin = getSupabaseAdmin();
  const { error: insErr } = admin
    ? await admin.from('ai_voice_calls').insert({
        call_id: callId,
        professional_id: professionalId,
        month: monthKey(),
        deadline_at: deadline.toISOString(),
      })
    : { error: new Error('sem banco') };
  if (insErr) {
    await hangupRealtimeCall(callId);
    return Response.json({ error: 'A conversa por voz ainda não foi ativada (falta rodar a migração v43 no banco).' }, { status: 503 });
  }

  return Response.json({
    sdp: answerSdp,
    callId,
    deadlineAt: deadline.toISOString(),
    // Estimativa só para mostrar: minutos no custo típico de uma conversa.
    minutesLeftMonth: typicalVoiceMinutes(remaining),
    firstName,
  });
}

/**
 * Acorda esta função antes do toque. A voz é pouco usada, então ela costuma
 * estar "fria" e o primeiro pedido levava ~1,2 s a mais só para carregar. O
 * app chama isto quando a Ana pode ser usada (painel aberto ou de volta à
 * frente, chat aberto, dedo no microfone). Não lê nem grava nada.
 */
export function GET() {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
}
