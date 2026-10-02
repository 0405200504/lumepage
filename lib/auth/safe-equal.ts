import { createHash, timingSafeEqual } from 'crypto';

/**
 * Compara dois segredos em tempo constante, inclusive quando os tamanhos
 * diferem (o hash iguala o comprimento). `!==` vaza, pelo tempo de resposta,
 * quantos bytes do segredo já estão certos.
 */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const h = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(h(a), h(b));
}
