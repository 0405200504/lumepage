/**
 * Rate limiting com dois modos:
 *
 *  1. DISTRIBUÍDO (recomendado em produção) — usa Upstash Redis via REST quando as
 *     envs UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN estão configuradas.
 *     Limite real e global entre todas as instâncias serverless.
 *
 *  2. EM MEMÓRIA (fallback) — quando o Upstash não está configurado. Cada instância
 *     tem seu próprio contador e some entre requisições; serve só para cortar rajadas.
 *
 * Em qualquer erro de rede com o Upstash, caímos no modo memória (fail-open) para
 * nunca bloquear tráfego legítimo por causa de uma falha de infraestrutura.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count++;
  return { ok: true, remaining: limit - b.count, retryAfterSeconds: 0 };
}

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || '';
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
const upstashEnabled = !!UPSTASH_URL && !!UPSTASH_TOKEN;

/**
 * Janela fixa no Upstash via pipeline REST (1 round-trip):
 *   INCR key             -> contador atual
 *   PEXPIRE key ms NX     -> define expiração só na 1ª vez (janela)
 *   PTTL key              -> quanto falta para zerar
 */
async function upstashLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, windowMs, 'NX'],
      ['PTTL', key],
    ]),
    // Não deixa o rate limit travar a request se o Upstash demorar.
    signal: AbortSignal.timeout(2000),
  });
  if (!res.ok) throw new Error(`Upstash ${res.status}`);
  const data = (await res.json()) as Array<{ result: number }>;
  const count = Number(data[0]?.result ?? 0);
  const pttl = Number(data[2]?.result ?? windowMs);
  if (count > limit) {
    return { ok: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil(pttl / 1000)) };
  }
  return { ok: true, remaining: Math.max(0, limit - count), retryAfterSeconds: 0 };
}

/**
 * @param key      identificador (ex.: `login:${ip}`)
 * @param limit    máximo de chamadas na janela
 * @param windowMs tamanho da janela em ms
 */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (upstashEnabled) {
    try {
      return await upstashLimit(key, limit, windowMs);
    } catch {
      // Falha de rede/timeout no Upstash → cai para o limite em memória.
      return memoryLimit(key, limit, windowMs);
    }
  }
  return memoryLimit(key, limit, windowMs);
}

/** Extrai um IP "melhor esforço" dos headers (Vercel envia x-forwarded-for). */
export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}
