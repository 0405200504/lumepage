/**
 * Rate limiting simples em memória (janela fixa).
 *
 * LIMITAÇÃO IMPORTANTE: no serverless (Vercel) cada instância tem seu próprio mapa
 * e instâncias somem entre requisições — então isto NÃO é um limite global rígido.
 * Serve para cortar rajadas (brute force/spam) que caem numa instância quente.
 * Para um limite robusto e distribuído, troque por @upstash/ratelimit + Vercel KV/Redis.
 */

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

// Limpeza preguiçosa para o mapa não crescer indefinidamente.
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

/**
 * @param key   identificador (ex.: `login:${ip}`)
 * @param limit máximo de chamadas na janela
 * @param windowMs tamanho da janela em ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
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

/** Extrai um IP "melhor esforço" dos headers (Vercel envia x-forwarded-for). */
export function ipFromHeaders(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return headers.get('x-real-ip') || 'unknown';
}
