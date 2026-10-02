import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { sendMail } from '@/lib/mail';
import { appUrl, confirmEmailTemplate } from '@/lib/mail-templates';

/**
 * CONFIRMAÇÃO DE E-MAIL DO CADASTRO
 * ---------------------------------
 * Antes a conta nascia já "confirmada": qualquer pessoa podia se cadastrar com
 * o e-mail de outra. O pior caso era a compra órfã da Hubla — quem soubesse o
 * e-mail de quem pagou criava a conta antes e ficava com o plano.
 *
 * Agora a conta nasce sem confirmação, mandamos um link e o login só abre
 * depois do clique. O link é nosso (HMAC com SESSION_SECRET, vale 3 dias), não
 * do Supabase: não depende da lista de URLs de retorno do painel do Supabase
 * nem da opção "Confirm email" estar ligada lá.
 *
 * Contas criadas antes de CONFIRMATION_REQUIRED_SINCE continuam entrando como
 * sempre — todas nasceram confirmadas, mas a data protege qualquer exceção.
 */

export const CONFIRMATION_REQUIRED_SINCE = new Date('2026-10-02T00:00:00-03:00');

const VALIDADE_MS = 3 * 24 * 60 * 60 * 1000;

/** Conta nova (pós-marco) que ainda não clicou no link. */
export function needsEmailConfirmation(user: { email_confirmed_at?: string | null; created_at?: string | null }): boolean {
  if (user.email_confirmed_at) return false;
  if (!user.created_at) return true;
  return new Date(user.created_at) >= CONFIRMATION_REQUIRED_SINCE;
}

/** A conta é nova o bastante para a compra órfã ser vinculada no login (e não mais no cadastro)? */
export function createdAfterConfirmationCutoff(createdAt?: string | null): boolean {
  return !!createdAt && new Date(createdAt) >= CONFIRMATION_REQUIRED_SINCE;
}

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 16 ? s : null;
}

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64url');
const unb64 = (s: string) => Buffer.from(s, 'base64url').toString('utf8');

/** Assinatura separada da do cookie de sessão (prefixo próprio): um não serve como o outro. */
function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(`email-confirm:${payload}`).digest('base64url');
}

export function emailConfirmToken(userId: string, email: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = b64(JSON.stringify({ u: userId, e: email.trim().toLowerCase(), x: Date.now() + VALIDADE_MS }));
  return `${payload}.${sign(payload, key)}`;
}

export function readEmailConfirmToken(token: string | null | undefined): { userId: string; email: string } | 'expired' | null {
  const key = secret();
  if (!key || !token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const a = Buffer.from(token.slice(dot + 1));
  const b = Buffer.from(sign(payload, key));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(unb64(payload)) as { u?: unknown; e?: unknown; x?: unknown };
    if (typeof data.u !== 'string' || typeof data.e !== 'string' || typeof data.x !== 'number') return null;
    if (Date.now() > data.x) return 'expired';
    return { userId: data.u, email: data.e };
  } catch {
    return null;
  }
}

/**
 * Manda o e-mail com o link. `false` = não saiu (sem RESEND_API_KEY ou o
 * provedor recusou) — quem chama decide se libera a conta para não trancar ninguém.
 */
export async function sendConfirmationEmail(p: { userId: string; email: string; name?: string | null }): Promise<boolean> {
  const token = emailConfirmToken(p.userId, p.email);
  if (!token) return false;
  const r = await sendMail({
    to: p.email,
    ...confirmEmailTemplate({ name: p.name, confirmUrl: `${appUrl()}/confirmar-email/${token}` }),
  }).catch(() => ({ sent: false }));
  return r.sent;
}
