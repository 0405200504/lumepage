import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { Professional } from '@/types/database';

/**
 * ACESSO DAS CONTAS (aba "Acesso" do detalhe e aba "Acessos" da listagem)
 * -----------------------------------------------------------------------
 * O que esta camada devolve e o que ela DELIBERADAMENTE não devolve:
 *
 *   devolve  → e-mail de login, método (senha/Google), se existe senha definida e
 *              desde quando, último acesso, sessões abertas, histórico de entradas.
 *   não devolve → a senha. Em nenhuma forma. Ela vive só como hash bcrypt dentro do
 *              GoTrue (auth.users.encrypted_password) e nem o servidor consegue lê-la
 *              de volta. Ver supabase/migration_v36_access.sql: a RPC que consultamos
 *              expõe o campo apenas como o booleano `has_password`.
 *
 * Tudo aqui degrada em silêncio: sem service-role, sem a migration v36 ou sem banco,
 * a tela abre com "indisponível" no lugar do dado — nunca quebra.
 */

const db = () => getSupabaseAdmin() || supabase;

/** Erro de "a migration ainda não rodou" — tratado como ausência de dado, não como falha. */
const missing = (message?: string | null): boolean =>
  !!message && /does not exist|could not find|schema cache|PGRST202|PGRST205|42P01|42883/i.test(message);

export type AuthMethod = 'password' | 'google' | 'both' | 'none';

export interface AuthInfo {
  userId: string;
  email: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
  bannedUntil: string | null;
  hasPassword: boolean;
  providers: string[];
  activeSessions: number;
  lastSessionAt: string | null;
}

export interface AccessEvent {
  id: string;
  professional_id: string | null;
  email: string | null;
  method: string;
  success: boolean;
  ip: string | null;
  user_agent: string | null;
  impersonated_by: string | null;
  created_at: string;
}

export interface AccessOverview {
  /** false = migration v36 pendente ou service-role ausente: a tela explica o porquê. */
  available: boolean;
  reason?: string;
  professional: Professional;
  /** Onde o login realmente acontece (GoTrue). null = conta sem usuário de autenticação. */
  auth: AuthInfo | null;
  /** E-mail que ela digita para entrar. Cai no e-mail comercial quando não há auth user. */
  loginEmail: string;
  /** O e-mail comercial (professionals.email) é o mesmo do login? */
  loginEmailMatchesBusiness: boolean;
  method: AuthMethod;
  passwordSetAt: string | null;
  mustChangePassword: boolean;
  /** Entradas registradas por nós (v36 em diante). */
  history: AccessEvent[];
  signInsLast30d: number;
  /** Ações de suporte já executadas nesta conta (vindas da trilha de auditoria). */
  profileId: string | null;
}

/** Deriva o rótulo do método a partir dos provedores do GoTrue. */
export function methodOf(auth: AuthInfo | null): AuthMethod {
  if (!auth) return 'none';
  const google = auth.providers.includes('google');
  const password = auth.hasPassword;
  if (google && password) return 'both';
  if (google) return 'google';
  if (password) return 'password';
  return 'none';
}

export const METHOD_LABEL: Record<AuthMethod, string> = {
  password: 'Senha',
  google: 'Google',
  both: 'Senha e Google',
  none: 'Sem método definido',
};

/**
 * Metadado de acesso do GoTrue para vários usuários de uma vez.
 * Chama a RPC da v36; se ela não existir, cai para o `listUsers()` do SDK, que dá
 * e-mail/último acesso/provedores mas não sabe de sessões nem de senha definida.
 */
export async function getAuthInfo(userIds: string[]): Promise<Map<string, AuthInfo>> {
  const out = new Map<string, AuthInfo>();
  const uids = userIds.filter(Boolean);
  if (!uids.length || !isSupabaseConfigured) return out;

  const admin = getSupabaseAdmin();
  if (!admin) return out;

  const { data, error } = await admin.rpc('admin_auth_access_info', { p_uids: uids });
  if (!error && Array.isArray(data)) {
    for (const r of data as Record<string, unknown>[]) {
      out.set(String(r.user_id), {
        userId: String(r.user_id),
        email: (r.email as string) ?? null,
        createdAt: (r.created_at as string) ?? null,
        lastSignInAt: (r.last_sign_in_at as string) ?? null,
        emailConfirmedAt: (r.email_confirmed_at as string) ?? null,
        bannedUntil: (r.banned_until as string) ?? null,
        hasPassword: Boolean(r.has_password),
        providers: (r.providers as string[]) ?? [],
        activeSessions: Number(r.active_sessions ?? 0),
        lastSessionAt: (r.last_session_at as string) ?? null,
      });
    }
    return out;
  }

  if (error && !missing(error.message)) console.error('[access] admin_auth_access_info:', error.message);

  // Fallback sem a v36: o que o SDK admin já expõe.
  try {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const wanted = new Set(uids);
    for (const u of list?.users || []) {
      if (!wanted.has(u.id)) continue;
      const providers = (u.identities || []).map(i => i.provider);
      out.set(u.id, {
        userId: u.id,
        email: u.email ?? null,
        createdAt: u.created_at ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        bannedUntil: null,
        // Sem a RPC não dá para saber se há senha; "email" como provedor é o indício.
        hasPassword: providers.includes('email'),
        providers,
        activeSessions: -1, // -1 = desconhecido (a tela mostra "—")
        lastSessionAt: null,
      });
    }
  } catch {
    /* sem metadado — a tela mostra "indisponível" */
  }
  return out;
}

/** Resolve o profile (e o auth_user_id) de uma profissional. */
async function profileOf(professionalId: string): Promise<{ id: string; auth_user_id: string | null; email: string | null; must_change_password?: boolean; password_set_at?: string | null } | null> {
  const { data } = await db().from('profiles')
    .select('id, auth_user_id, email, must_change_password, password_set_at')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (data) return data as never;

  // Migration v36 pendente: as duas colunas novas não existem, refaz sem elas.
  const { data: legacy } = await db().from('profiles')
    .select('id, auth_user_id, email')
    .eq('professional_id', professionalId)
    .limit(1)
    .maybeSingle();
  return (legacy as never) ?? null;
}

/** Histórico de entradas registrado por nós. Lista vazia se a v36 não rodou. */
export async function getAccessHistory(professionalId: string, limit = 20): Promise<AccessEvent[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await db().from('access_events')
    .select('*')
    .eq('professional_id', professionalId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) {
    if (!missing(error.message)) console.error('[access_events]', error.message);
    return [];
  }
  return (data || []) as AccessEvent[];
}

/** Tudo que a aba "Acesso" precisa, numa consulta só. */
export async function getAccessOverview(professionalId: string): Promise<AccessOverview | null> {
  if (!isSupabaseConfigured) return null;

  const { data: prof } = await db().from('professionals').select('*').eq('id', professionalId).maybeSingle();
  if (!prof) return null;
  const professional = prof as Professional;

  const profile = await profileOf(professionalId);
  const authUserId = profile?.auth_user_id || professional.owner_user_id || null;

  const [authMap, history] = await Promise.all([
    authUserId ? getAuthInfo([authUserId]) : Promise.resolve(new Map<string, AuthInfo>()),
    getAccessHistory(professionalId, 20),
  ]);

  const auth = authUserId ? authMap.get(authUserId) ?? null : null;
  const loginEmail = auth?.email || profile?.email || professional.email;

  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const signInsLast30d = history.filter(h => h.success && h.created_at >= since).length;

  return {
    available: !!getSupabaseAdmin(),
    reason: getSupabaseAdmin() ? undefined : 'SUPABASE_SERVICE_ROLE_KEY não configurada — sem ela o admin não enxerga o login.',
    professional,
    auth,
    loginEmail,
    loginEmailMatchesBusiness: (loginEmail || '').toLowerCase() === (professional.email || '').toLowerCase(),
    method: methodOf(auth),
    passwordSetAt: profile?.password_set_at ?? null,
    mustChangePassword: Boolean(profile?.must_change_password),
    history,
    signInsLast30d,
    profileId: profile?.id ?? null,
  };
}

// ═══════════════════════════ Visão consolidada (aba "Acessos") ═══════════════════════════

export interface AccessRow {
  id: string;
  brandName: string;
  name: string;
  status: Professional['status'];
  loginEmail: string;
  businessEmail: string;
  method: AuthMethod;
  lastSignInAt: string | null;
  activeSessions: number;
  passwordSetAt: string | null;
  mustChangePassword: boolean;
  hasAuthUser: boolean;
}

/**
 * Uma linha por conta com tudo que responde "quem consegue entrar?".
 * É a "lista de logins" útil — e ela é útil justamente porque mostra quem NÃO
 * consegue entrar (sem senha, sem usuário de autenticação, sem nunca ter acessado).
 */
export async function listAccessRows(): Promise<{ rows: AccessRow[]; available: boolean; reason?: string }> {
  if (!isSupabaseConfigured) return { rows: [], available: false, reason: 'Banco não configurado.' };
  if (!getSupabaseAdmin()) {
    return { rows: [], available: false, reason: 'SUPABASE_SERVICE_ROLE_KEY não configurada — sem ela o admin não enxerga o login.' };
  }

  const [profsRes, profilesRes] = await Promise.all([
    db().from('professionals').select('*').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
    db().from('profiles').select('id, auth_user_id, email, professional_id, must_change_password, password_set_at'),
  ]);

  const professionals = (profsRes.data || []) as Professional[];

  // Sem a v36 as duas colunas novas fazem o select inteiro falhar: refaz sem elas.
  let profileRows = (profilesRes.data || []) as { id: string; auth_user_id: string | null; email: string | null; professional_id: string | null; must_change_password?: boolean; password_set_at?: string | null }[];
  if (profilesRes.error) {
    const { data } = await db().from('profiles').select('id, auth_user_id, email, professional_id');
    profileRows = (data || []) as never;
  }

  const byProf = new Map<string, (typeof profileRows)[number]>();
  for (const p of profileRows) if (p.professional_id) byProf.set(p.professional_id, p);

  const uids = professionals
    .map(p => byProf.get(p.id)?.auth_user_id || p.owner_user_id)
    .filter((v): v is string => !!v);
  const authMap = await getAuthInfo(uids);

  const rows: AccessRow[] = professionals.map(p => {
    const profile = byProf.get(p.id);
    const uid = profile?.auth_user_id || p.owner_user_id || null;
    const auth = uid ? authMap.get(uid) ?? null : null;
    return {
      id: p.id,
      brandName: p.brand_name || p.name,
      name: p.name,
      status: p.status,
      loginEmail: auth?.email || profile?.email || p.email,
      businessEmail: p.email,
      method: methodOf(auth),
      lastSignInAt: auth?.lastSignInAt ?? null,
      activeSessions: auth?.activeSessions ?? -1,
      passwordSetAt: profile?.password_set_at ?? null,
      mustChangePassword: Boolean(profile?.must_change_password),
      hasAuthUser: !!auth,
    };
  });

  rows.sort((a, b) => (b.lastSignInAt || '').localeCompare(a.lastSignInAt || ''));
  return { rows, available: true };
}
