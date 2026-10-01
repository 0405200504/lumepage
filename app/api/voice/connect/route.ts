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

  // Saldo do mês e prazo desta conversa.
  let minutes: number;
  let remaining: number;
  try {
    await sweepExpiredVoiceCalls(professionalId);
    remaining = await remainingMicros(professionalId);
    minutes = Math.min(VOICE_MAX_MINUTES, Math.floor(remaining / (VOICE_RESERVE_USD_PER_MIN * 1e6)));
  } catch (e) {
    if (e instanceof BudgetUnavailable) {
      return Response.json({ error: 'A conversa por voz ainda não foi ativada (falta rodar a migração v42 no banco).' }, { status: 503 });
    }
    throw e;
  }
  if (minutes < 1) {
    return Response.json({ error: BUDGET_REACHED_MSG, budget: true }, { status: 402 });
  }

  const ctx = await buildAssistantContext(professionalId);
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
    return Response.json({ error: 'A conversa por voz ainda não foi ativada (falta rodar a migração v42 no banco).' }, { status: 503 });
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
