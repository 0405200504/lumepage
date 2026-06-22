import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Assinatura/validação do cookie de sessão.
 *
 * O cookie ANTES era base64(JSON) puro — qualquer pessoa podia forjar um
 * `{"role":"super_admin",...}` e virar admin. Agora o payload vai assinado com
 * HMAC-SHA256 usando SESSION_SECRET; na leitura recalculamos a assinatura e só
 * aceitamos se bater (comparação em tempo constante). Sem o segredo do servidor
 * é inviável forjar um cookie válido.
 *
 * Formato: "<base64url(payload)>.<base64url(hmac)>"
 */

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    // Fail-closed: sem um segredo forte não há sessão assinável. Em produção isto
    // derruba o login até a env ser configurada — proposital (melhor do que aceitar
    // cookies inseguros). Configure SESSION_SECRET (>= 32 chars aleatórios).
    throw new Error('SESSION_SECRET ausente ou muito curto (defina >= 32 caracteres aleatórios).');
  }
  return secret;
}

function b64urlEncode(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payloadB64: string): string {
  return b64urlEncode(createHmac('sha256', getSecret()).update(payloadB64).digest());
}

/** Serializa + assina o objeto de sessão. */
export function signSession(data: unknown): string {
  const payloadB64 = b64urlEncode(Buffer.from(JSON.stringify(data), 'utf8'));
  return `${payloadB64}.${sign(payloadB64)}`;
}

/** Valida a assinatura e retorna o objeto, ou null se o cookie for inválido/forjado. */
export function verifySession<T = unknown>(token: string | undefined | null): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payloadB64 = token.slice(0, dot);
  const sigB64 = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(payloadB64);
  } catch {
    // Sem SESSION_SECRET configurado — não validamos nada (fail-closed).
    return null;
  }

  const a = Buffer.from(sigB64);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(b64urlDecode(payloadB64).toString('utf8')) as T;
  } catch {
    return null;
  }
}
