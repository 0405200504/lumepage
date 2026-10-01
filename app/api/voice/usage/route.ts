import { authService } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { VOICE_MODEL } from '@/lib/assistant/voice';
import { BUDGET_MICROS, BudgetUnavailable, BUDGET_REACHED_MSG, realtimeCostMicros } from '@/lib/assistant/budget';
import { finishVoiceCall, getOwnVoiceCall } from '@/lib/assistant/voice-calls';

/**
 * O app informa o consumo de CADA resposta da voz (o `usage` que a OpenAI
 * manda no fim de cada resposta). O servidor transforma em custo, soma na
 * chamada e no mês e, se o teto acabou ou o prazo venceu, encerra a chamada
 * na OpenAI e manda o app parar.
 */
export async function POST(req: Request) {
  const session = await authService.getCurrentUser();
  if (!session?.professional_id) return Response.json({ error: 'Não autorizado.' }, { status: 401 });
  const professionalId = session.professional_id;

  const rl = await rateLimit(`voice-usage:${professionalId}`, 600, 10 * 60 * 1000);
  if (!rl.ok) return Response.json({ error: 'Muitas requisições.' }, { status: 429 });

  let body: { callId?: unknown; usage?: unknown };
  try { body = await req.json(); } catch { return Response.json({ error: 'Requisição inválida.' }, { status: 400 }); }
  const callId = typeof body.callId === 'string' ? body.callId : '';

  try {
    const call = await getOwnVoiceCall(callId, professionalId);
    if (!call) return Response.json({ stop: true, reason: 'unknown' });

    const cost = realtimeCostMicros(VOICE_MODEL, body.usage);
    const admin = getSupabaseAdmin()!;
    const { data: monthTotal, error } = await admin.rpc('lume_charge_voice_call', { p_call_id: callId, p_cost_micros: cost });
    if (error) throw new BudgetUnavailable();

    const overBudget = Number(monthTotal ?? 0) >= BUDGET_MICROS;
    const overDeadline = Date.now() > new Date(call.deadline_at).getTime();
    if (call.status === 'active' && (overBudget || overDeadline)) {
      await finishVoiceCall(call);
      return Response.json({
        stop: true,
        reason: overBudget ? 'budget' : 'deadline',
        message: overBudget ? BUDGET_REACHED_MSG : 'O tempo desta conversa acabou. É só abrir de novo para continuar.',
      });
    }
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof BudgetUnavailable) return Response.json({ stop: true, reason: 'unavailable' });
    throw e;
  }
}
