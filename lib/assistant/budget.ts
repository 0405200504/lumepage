import { getSupabaseAdmin } from '@/lib/supabase/client';

/**
 * Teto de gasto de IA por profissional, por mês.
 *
 * Tudo o que a assistente consome na OpenAI (chat de texto, ditado e voz)
 * vira custo em micro-dólares (US$ 1 = 1.000.000) e é somado em
 * ai_usage_monthly (migração v43). Ao chegar no teto, a assistente para até
 * o dia 1º. O teto é em REAIS; a conversão usa o dólar com IOF e folga.
 *
 * Preços por 1M tokens: developers.openai.com/api/docs/pricing (30/09/2026).
 * Mudou o preço na OpenAI? Atualize PRICES — modelo fora da tabela é cobrado
 * pelo preço do mais caro, para nunca contar a menos.
 */

const num = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

/** Teto do mês por profissional, em reais. */
export const AI_BUDGET_BRL = num(process.env.AI_MONTHLY_BUDGET_BRL, 10);
/** Reais por dólar já com IOF do cartão (3,5%) e folga. Em 30/09/2026: 5,18 × 1,035 = 5,37. */
export const AI_USD_BRL = num(process.env.AI_USD_BRL, 5.5);
export const BUDGET_MICROS = Math.floor((AI_BUDGET_BRL / AI_USD_BRL) * 1e6);

/** Voz: tempo máximo de UMA conversa. */
export const VOICE_MAX_MINUTES = 10;
/** Reserva por minuto de voz (pior caso com truncamento, com folga): é o que
 *  decide o prazo de cada chamada. ~R$ 0,33/min. */
export const VOICE_RESERVE_USD_PER_MIN = 0.06;
/** Cobrança mínima por minuto de chamada, se o app não informar o consumo. */
export const VOICE_FLOOR_USD_PER_MIN = 0.012;
/** Custo típico por minuto de conversa (simulado), só para mostrar "minutos restantes". */
export const VOICE_TYPICAL_USD_PER_MIN = 0.025;

type Price = { tIn: number; tInCached: number; tOut: number; aIn: number; aInCached: number; aOut: number };
const PRICES: Record<string, Price> = {
  'gpt-realtime-2.1-mini': { tIn: 0.6, tInCached: 0.06, tOut: 2.4, aIn: 10, aInCached: 0.3, aOut: 20 },
  'gpt-realtime-2.1': { tIn: 4, tInCached: 0.4, tOut: 24, aIn: 32, aInCached: 0.4, aOut: 64 },
  'gpt-4o-mini': { tIn: 0.15, tInCached: 0.075, tOut: 0.6, aIn: 0, aInCached: 0, aOut: 0 },
  'gpt-4o': { tIn: 2.5, tInCached: 1.25, tOut: 10, aIn: 0, aInCached: 0, aOut: 0 },
};
const PRICIEST: Price = { tIn: 5, tInCached: 0.5, tOut: 30, aIn: 40, aInCached: 0.5, aOut: 80 };
const priceOf = (model: string) => PRICES[model] ?? PRICIEST;

/** whisper-1: US$ 0,006/min. gpt-4o-mini-transcribe (voz): US$ 0,003/min. */
const WHISPER_USD_PER_MIN = 0.006;
const VOICE_TRANSCRIBE_USD_PER_MIN = 0.003;

export class BudgetUnavailable extends Error {
  constructor() { super('Teto de IA indisponível: rode a migração v43 no Supabase.'); }
}

/** Mês corrente no fuso de São Paulo, 'YYYY-MM'. */
export function monthKey(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(d);
}

const db = () => {
  const admin = getSupabaseAdmin();
  if (!admin) throw new BudgetUnavailable();
  return admin;
};

const clampTokens = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 2_000_000) : 0;
};

/* ---------------- custo de cada chamada ---------------- */

/** Chat de texto (AI SDK): tokens de entrada e saída. */
export function chatCostMicros(model: string, usage: { promptTokens?: number; completionTokens?: number }) {
  const p = priceOf(model);
  return Math.ceil(clampTokens(usage.promptTokens) * p.tIn + clampTokens(usage.completionTokens) * p.tOut);
}

/** Ditado (whisper-1), pela duração do áudio em segundos. */
export function whisperCostMicros(seconds: number) {
  return Math.ceil((Math.max(0, seconds) / 60) * WHISPER_USD_PER_MIN * 1e6);
}

/** Uma resposta da conversa por voz, a partir do `usage` que a Realtime manda. */
export function realtimeCostMicros(model: string, usage: unknown) {
  const u = (usage ?? {}) as {
    input_token_details?: { text_tokens?: number; audio_tokens?: number; cached_tokens_details?: { text_tokens?: number; audio_tokens?: number } };
    output_token_details?: { text_tokens?: number; audio_tokens?: number };
  };
  const p = priceOf(model);
  const inD = u.input_token_details ?? {};
  const cached = inD.cached_tokens_details ?? {};
  const textIn = clampTokens(inD.text_tokens), audioIn = clampTokens(inD.audio_tokens);
  const textCached = Math.min(clampTokens(cached.text_tokens), textIn);
  const audioCached = Math.min(clampTokens(cached.audio_tokens), audioIn);
  const outD = u.output_token_details ?? {};
  const audioNew = audioIn - audioCached;
  const micros =
    (textIn - textCached) * p.tIn + textCached * p.tInCached +
    audioNew * p.aIn + audioCached * p.aInCached +
    clampTokens(outD.text_tokens) * p.tOut + clampTokens(outD.audio_tokens) * p.aOut +
    // transcrição da fala dela: 10 tokens de áudio por segundo
    (audioNew / 10 / 60) * VOICE_TRANSCRIBE_USD_PER_MIN * 1e6;
  return Math.ceil(micros);
}

/* ---------------- saldo ---------------- */

/** Quanto a profissional já gastou no mês (micro-dólares). */
export async function monthlySpentMicros(professionalId: string) {
  const { data, error } = await db()
    .from('ai_usage_monthly')
    .select('cost_usd_micros')
    .eq('professional_id', professionalId)
    .eq('month', monthKey())
    .maybeSingle();
  if (error) throw new BudgetUnavailable();
  return Number(data?.cost_usd_micros ?? 0);
}

/** O que as conversas por voz ABERTAS ainda podem gastar até o prazo delas. */
async function openReservationsMicros(professionalId: string) {
  const { data, error } = await db()
    .from('ai_voice_calls')
    .select('deadline_at, charged_usd_micros')
    .eq('professional_id', professionalId)
    .eq('status', 'active');
  if (error) throw new BudgetUnavailable();
  const now = Date.now();
  return (data ?? []).reduce((sum, c) => {
    const minLeft = Math.max(0, (new Date(c.deadline_at).getTime() - now) / 60000);
    return sum + Math.ceil(minLeft * VOICE_RESERVE_USD_PER_MIN * 1e6);
  }, 0);
}

/** Saldo do mês: teto − gasto − reservado pelas conversas abertas. */
export async function remainingMicros(professionalId: string) {
  const [spent, reserved] = await Promise.all([monthlySpentMicros(professionalId), openReservationsMicros(professionalId)]);
  return BUDGET_MICROS - spent - reserved;
}

/** Soma um custo ao mês. Devolve o total do mês. */
export async function addAiCost(professionalId: string, micros: number, voiceSeconds = 0) {
  const { data, error } = await db().rpc('lume_add_ai_usage', {
    p_professional: professionalId,
    p_month: monthKey(),
    p_cost_micros: Math.max(0, Math.ceil(micros)),
    p_voice_seconds: Math.max(0, Math.round(voiceSeconds)),
  });
  if (error) throw new BudgetUnavailable();
  return Number(data ?? 0);
}

/** Mensagem única para quem chegou ao teto. */
export const BUDGET_REACHED_MSG = 'Você usou todo o limite da Ana deste mês. Ele renova no dia 1º.';

/** Minutos de voz que o saldo ainda paga, no custo típico (só para mostrar). */
export const typicalVoiceMinutes = (micros: number) => Math.max(0, Math.floor(micros / (VOICE_TYPICAL_USD_PER_MIN * 1e6)));
