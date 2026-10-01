import { getSupabaseAdmin } from '@/lib/supabase/client';
import { BudgetUnavailable, VOICE_FLOOR_USD_PER_MIN, VOICE_RESERVE_USD_PER_MIN } from './budget';

/**
 * Chamadas de voz em andamento: registro, encerramento e a guarda que
 * derruba na OpenAI o que passou do prazo — mesmo que o app tenha sido
 * adulterado e não encerre sozinho.
 */

const db = () => {
  const admin = getSupabaseAdmin();
  if (!admin) throw new BudgetUnavailable();
  return admin;
};

/** Encerra a chamada na OpenAI. Idempotente: já encerrada também serve. */
export async function hangupRealtimeCall(callId: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return;
  try {
    await fetch(`https://api.openai.com/v1/realtime/calls/${encodeURIComponent(callId)}/hangup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    /* rede: a guarda tenta de novo no próximo minuto */
  }
}

type CallRow = { call_id: string; started_at: string; deadline_at: string; charged_usd_micros?: number | string | null };

/** Fecha a chamada uma vez só: encerra na OpenAI e cobra o mínimo por tempo.
 *  Chamada que terminou SEM nenhum consumo informado (app adulterado ou caído)
 *  paga pela taxa de reserva, acima do custo real típico — nunca de graça. */
export async function finishVoiceCall(call: CallRow) {
  await hangupRealtimeCall(call.call_id);
  const started = new Date(call.started_at).getTime();
  // Nunca cobra além do prazo + 2 min (a guarda roda de minuto em minuto).
  const cap = new Date(call.deadline_at).getTime() + 120_000;
  const seconds = Math.max(0, Math.min(Date.now(), cap) - started) / 1000;
  const reported = Number(call.charged_usd_micros ?? 0) > 0;
  const rate = reported ? VOICE_FLOOR_USD_PER_MIN : VOICE_RESERVE_USD_PER_MIN;
  const floorMicros = Math.ceil((seconds / 60) * rate * 1e6);
  const { error } = await db().rpc('lume_finish_voice_call', {
    p_call_id: call.call_id,
    p_floor_micros: floorMicros,
    p_seconds: Math.round(seconds),
  });
  if (error) throw new BudgetUnavailable();
}

/** Guarda: encerra as chamadas abertas que passaram do prazo (30 s de tolerância). */
export async function sweepExpiredVoiceCalls(professionalId?: string) {
  let q = db()
    .from('ai_voice_calls')
    .select('call_id, started_at, deadline_at, charged_usd_micros')
    .eq('status', 'active')
    .lt('deadline_at', new Date(Date.now() - 30_000).toISOString())
    .limit(50);
  if (professionalId) q = q.eq('professional_id', professionalId);
  const { data, error } = await q;
  if (error) throw new BudgetUnavailable();
  for (const call of data ?? []) await finishVoiceCall(call);
  return (data ?? []).length;
}

/** Segredo que o job da guarda manda (gerado pela migração v43; só o service_role lê). */
export async function getVoiceGuardToken() {
  const { data, error } = await db().from('ai_voice_guard').select('token').eq('id', 1).maybeSingle();
  if (error) throw new BudgetUnavailable();
  return (data?.token as string | undefined) || null;
}

/** A chamada, se for desta profissional. */
export async function getOwnVoiceCall(callId: string, professionalId: string) {
  const { data, error } = await db()
    .from('ai_voice_calls')
    .select('call_id, professional_id, started_at, deadline_at, status, charged_usd_micros')
    .eq('call_id', callId)
    .maybeSingle();
  if (error) throw new BudgetUnavailable();
  return data && data.professional_id === professionalId ? data : null;
}
