import { createHash, randomBytes } from 'crypto';
import { headers } from 'next/headers';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * LINKS DE ACESSO DE USO ÚNICO
 * ----------------------------
 * Dois tipos, mesma mecânica:
 *   'magic' → loga a profissional direto (o que o suporte manda no WhatsApp quando
 *             ela não acha o e-mail). 15 minutos.
 *   'reset' → abre a tela de definir nova senha. 1 hora.
 *
 * O token só existe em texto uma vez, no retorno de `createAccessToken()`. O banco
 * guarda o SHA-256 dele — quem ler a tabela não consegue montar a URL de volta.
 * Consumo é único: `used_at` é gravado na primeira validação bem-sucedida.
 */

const db = () => getSupabaseAdmin() || supabase;

export type AccessTokenKind = 'magic' | 'reset';

export const TOKEN_TTL_MINUTES: Record<AccessTokenKind, number> = {
  magic: 15,
  reset: 60,
};

const missing = (message?: string | null): boolean =>
  !!message && /does not exist|could not find|schema cache|PGRST205|42P01/i.test(message);

const hash = (token: string): string => createHash('sha256').update(token).digest('hex');

/** IP e user-agent da requisição atual (best-effort). */
export async function requestMeta(): Promise<{ ip: string | null; userAgent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get('x-forwarded-for') || '';
    return { ip: forwarded.split(',')[0].trim() || h.get('x-real-ip') || null, userAgent: h.get('user-agent') };
  } catch {
    return { ip: null, userAgent: null };
  }
}

export interface CreatedToken {
  token: string;
  url: string;
  expiresAt: string;
}

/** Base pública do app, para montar o link que vai no WhatsApp. */
export function publicBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
    || 'http://localhost:3000'
  ).replace(/\/+$/, '');
}

/** Gera o link e grava só o hash. Devolve a URL — mostre-a uma vez e não guarde. */
export async function createAccessToken(input: {
  professionalId: string;
  profileId?: string | null;
  kind: AccessTokenKind;
  createdBy: string;
}): Promise<{ success: boolean; error?: string; data?: CreatedToken }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Banco não configurado.' };

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES[input.kind] * 60_000).toISOString();
  const { ip } = await requestMeta();

  const { error } = await db().from('access_tokens').insert({
    professional_id: input.professionalId,
    profile_id: input.profileId ?? null,
    kind: input.kind,
    token_hash: hash(token),
    expires_at: expiresAt,
    created_by: input.createdBy,
    created_ip: ip,
  });

  if (error) {
    if (missing(error.message)) {
      return { success: false, error: 'Rode supabase/migration_v36_access.sql para gerar links de acesso.' };
    }
    return { success: false, error: error.message };
  }

  const path = input.kind === 'magic' ? '/acesso' : '/redefinir-senha';
  return { success: true, data: { token, url: `${publicBaseUrl()}${path}/${token}`, expiresAt } };
}

export interface RedeemedToken {
  professionalId: string;
  profileId: string | null;
  kind: AccessTokenKind;
}

/**
 * Confere o token SEM queimar. Usado para decidir se a tela de nova senha abre —
 * o consumo acontece só quando ela realmente troca a senha.
 */
export async function peekAccessToken(token: string, kind: AccessTokenKind): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Banco não configurado.' };
  if (!token || token.length < 20) return { ok: false, error: 'Link inválido.' };

  const { data, error } = await db().from('access_tokens')
    .select('kind, expires_at, used_at')
    .eq('token_hash', hash(token))
    .maybeSingle();

  if (error && missing(error.message)) return { ok: false, error: 'Recurso indisponível: migration v36 pendente.' };
  const row = data as { kind: AccessTokenKind; expires_at: string; used_at: string | null } | null;
  if (!row || row.kind !== kind) return { ok: false, error: 'Link inválido ou já usado.' };
  if (row.used_at) return { ok: false, error: 'Este link já foi usado. Peça um novo ao suporte.' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: 'Este link expirou. Peça um novo ao suporte.' };
  return { ok: true };
}

/**
 * Valida e QUEIMA o token. Só devolve dado na primeira vez: a segunda chamada com o
 * mesmo token já encontra `used_at` preenchido e recusa.
 */
export async function redeemAccessToken(token: string, kind: AccessTokenKind): Promise<{ ok: true; data: RedeemedToken } | { ok: false; error: string }> {
  if (!isSupabaseConfigured) return { ok: false, error: 'Banco não configurado.' };
  if (!token || token.length < 20) return { ok: false, error: 'Link inválido.' };

  const { data, error } = await db().from('access_tokens')
    .select('id, professional_id, profile_id, kind, expires_at, used_at')
    .eq('token_hash', hash(token))
    .maybeSingle();

  if (error && missing(error.message)) return { ok: false, error: 'Recurso indisponível: migration v36 pendente.' };
  if (!data) return { ok: false, error: 'Link inválido ou já usado.' };

  const row = data as { id: string; professional_id: string; profile_id: string | null; kind: AccessTokenKind; expires_at: string; used_at: string | null };
  if (row.kind !== kind) return { ok: false, error: 'Link inválido.' };
  if (row.used_at) return { ok: false, error: 'Este link já foi usado. Peça um novo ao suporte.' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, error: 'Este link expirou. Peça um novo ao suporte.' };

  const { ip } = await requestMeta();
  // Marcação condicional: só queima se ainda estiver livre (evita corrida entre dois cliques).
  const { data: burned } = await db().from('access_tokens')
    .update({ used_at: new Date().toISOString(), used_ip: ip })
    .eq('id', row.id)
    .is('used_at', null)
    .select('id');

  if (!burned || (burned as unknown[]).length === 0) return { ok: false, error: 'Este link já foi usado. Peça um novo ao suporte.' };

  return { ok: true, data: { professionalId: row.professional_id, profileId: row.profile_id, kind: row.kind } };
}

// ───────────────────────────── Histórico de entradas ─────────────────────────────

export type AccessMethod = 'password' | 'google' | 'magic' | 'impersonation' | 'temp_password';

/**
 * Registra uma entrada (ou tentativa) na conta. Nunca lança e NUNCA recebe senha —
 * o parâmetro `method` é um rótulo, não uma credencial.
 */
export async function logAccessEvent(entry: {
  professionalId?: string | null;
  email?: string | null;
  method: AccessMethod;
  success?: boolean;
  impersonatedBy?: string | null;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  try {
    const { ip, userAgent } = await requestMeta();
    const { error } = await db().from('access_events').insert({
      professional_id: entry.professionalId ?? null,
      email: entry.email ?? null,
      method: entry.method,
      success: entry.success ?? true,
      ip,
      user_agent: userAgent,
      impersonated_by: entry.impersonatedBy ?? null,
    });
    if (error && !missing(error.message)) console.error('[access_events]', error.message);
  } catch (e) {
    console.error('[access_events]', e);
  }
}
