import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabase, getSupabaseAdmin } from '../supabase/client';
import { dbService } from '../supabase/db';
import { Profile } from '@/types/database';
import { DEMO_PROFESSIONAL_ID, DEMO_PROFILE_ID, DEMO_EMAIL, DEMO_NAME } from '@/lib/demo';
import { signSession, verifySession } from './cookie';

const SESSION_COOKIE_NAME = 'lume_session';

const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 dias
  path: '/',
};

export interface SessionData {
  profile_id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: 'super_admin' | 'professional';
  professional_id: string | null;
  salon_id?: string | null;
  is_salon_manager?: boolean;
}

/** Monta o SessionData a partir do perfil (inclui dados de gerente de salão). */
function buildSession(profile: Profile, authUserId: string | null): SessionData {
  return {
    profile_id: profile.id,
    auth_user_id: authUserId,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    professional_id: profile.professional_id,
    salon_id: profile.salon_id ?? null,
    is_salon_manager: profile.is_salon_manager ?? false,
  };
}

export const authService = {
  // Login
  login: async (email: string, password?: string): Promise<{ success: boolean; profile?: Profile; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured) {
      try {
        // 1. Tentar login no Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: password || '',
        });

        if (authError) {
          return { success: false, error: 'Credenciais inválidas no Supabase.' };
        }

        if (authData.user) {
          // 2. Buscar o perfil correspondente
          const profile = await dbService.getProfileByAuthUserId(authData.user.id);
          if (!profile) {
            // Se o profile não existe, mas o login passou, podemos estar sem profile configurado
            return { success: false, error: 'Perfil do usuário não encontrado nas tabelas do sistema.' };
          }

          // 3. Salvar cookie de sessão para redundância e rapidez nas rotas do servidor
          const sessionData: SessionData = buildSession(profile, authData.user.id);

          const cookieStore = await cookies();
          cookieStore.set(SESSION_COOKIE_NAME, signSession(sessionData), SESSION_COOKIE_OPTS);

          return { success: true, profile };
        }
      } catch (e: any) {
        return { success: false, error: e.message || 'Ocorreu um erro ao autenticar.' };
      }
    }

    // --- FALLBACK MOCK ---
    // Buscar perfil no mock
    const profile = await dbService.getProfileByEmail(cleanEmail);
    if (!profile) {
      return { success: false, error: 'Usuário não encontrado. Use admin@lume.com ou amanda@estetica.com.' };
    }

    // No Mock aceitamos qualquer senha para fins de facilidade de testes
    const sessionData: SessionData = buildSession(profile, null);

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signSession(sessionData), SESSION_COOKIE_OPTS);

    return { success: true, profile };
  },

  /**
   * Login/cadastro via Google. O cliente faz o OAuth (Supabase) e nos envia o
   * access_token; aqui validamos esse token no servidor (não confiar no cliente),
   * resolvemos/criamos a profissional e montamos o MESMO cookie assinado do login
   * por senha. Conta nova via Google já nasce com o trial de 7 dias (default do banco).
   */
  loginWithGoogle: async (accessToken: string): Promise<{ success: boolean; error?: string; role?: string }> => {
    if (!isSupabaseConfigured) return { success: false, error: 'Login indisponível no momento.' };
    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: 'Serviço de login indisponível.' };

    // 1. Valida o token contra o Supabase (verifica a assinatura do JWT) e obtém o usuário.
    const { data: userData, error: userErr } = await admin.auth.getUser(accessToken);
    const user = userData?.user;
    if (userErr || !user?.email) return { success: false, error: 'Não foi possível validar sua conta Google.' };

    const cleanEmail = user.email.trim().toLowerCase();
    const meta = (user.user_metadata || {}) as { full_name?: string; name?: string };
    const displayName = meta.full_name || meta.name || cleanEmail.split('@')[0];

    try {
      // 2. Perfil já existente (por auth_user_id ou por e-mail).
      let profile = await dbService.getProfileByAuthUserId(user.id);
      if (!profile) profile = await dbService.getProfileByEmail(cleanEmail);

      // 3. Resolve a profissional vinculada (existente ou cria uma nova).
      let professionalId = profile?.professional_id ?? null;
      if (!professionalId) {
        const { data: existing } = await admin
          .from('professionals')
          .select('id')
          .eq('email', cleanEmail)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (existing?.id) {
          professionalId = existing.id;
        } else {
          professionalId = crypto.randomUUID();
          const base = displayName.toLowerCase().normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '') || 'lume';
          await dbService.createProfessional({
            id: professionalId, owner_user_id: null, name: displayName, brand_name: displayName,
            slug: `${base}-${professionalId.slice(0, 4)}`, email: cleanEmail, whatsapp: '',
            instagram: null, logo_url: null, profile_image_url: null,
            primary_color: '#500b18', secondary_color: '#eccbd2',
            address: null, city: null, state: null, description: null, public_bio: null,
            status: 'active',
          });
        }
      }

      // 4. Garante o profile vinculado (auth_user_id + professional_id + role).
      if (!profile) {
        const { data: created, error: insErr } = await admin
          .from('profiles')
          .insert({ auth_user_id: user.id, email: cleanEmail, name: displayName, role: 'professional', professional_id: professionalId })
          .select()
          .single();
        if (insErr || !created) return { success: false, error: 'Falha ao criar o perfil de acesso.' };
        profile = created;
      } else if (profile.professional_id !== professionalId || profile.auth_user_id !== user.id) {
        const { data: updated } = await admin
          .from('profiles')
          .update({ professional_id: professionalId, auth_user_id: user.id })
          .eq('id', profile.id)
          .select()
          .single();
        if (updated) profile = updated;
      }

      if (!profile) return { success: false, error: 'Não foi possível carregar o perfil de acesso.' };

      // 5. Monta o cookie de sessão assinado (mesmo formato do login por senha).
      const sessionData: SessionData = buildSession(profile, user.id);
      const cookieStore = await cookies();
      cookieStore.set(SESSION_COOKIE_NAME, signSession(sessionData), SESSION_COOKIE_OPTS);
      return { success: true, role: profile.role };
    } catch (e: any) {
      return { success: false, error: e.message || 'Erro ao entrar com Google.' };
    }
  },

  // Login da CONTA TESTE (demo) — sem senha; sessão self-contained
  loginDemo: async (): Promise<boolean> => {
    const sessionData: SessionData = {
      profile_id: DEMO_PROFILE_ID,
      auth_user_id: null,
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      role: 'professional',
      professional_id: DEMO_PROFESSIONAL_ID,
      salon_id: null,
      is_salon_manager: false,
    };
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, signSession(sessionData), SESSION_COOKIE_OPTS);
    return true;
  },

  // Logout
  logout: async (): Promise<boolean> => {
    try {
      const cookieStore = await cookies();
      cookieStore.delete(SESSION_COOKIE_NAME);

      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      return true;
    } catch (e) {
      console.error('Erro ao realizar logout:', e);
      return false;
    }
  },

  // Obter Usuário da Sessão Atual
  getCurrentUser: async (): Promise<SessionData | null> => {
    let cookieStore;
    try {
      cookieStore = await cookies();
    } catch (e: any) {
      if (e.message && e.message.includes('Dynamic server usage')) {
        throw e;
      }
      return null;
    }

    try {
      const cookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (!cookie || !cookie.value) {
        // Se estiver com Supabase configurado, podemos ler a sessão dele caso não haja cookie
        if (isSupabaseConfigured) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const profile = await dbService.getProfileByAuthUserId(user.id);
            if (profile) {
              return buildSession(profile, user.id);
            }
          }
        }
        return null;
      }

      // Valida a assinatura HMAC do cookie. Cookie forjado/adulterado → null
      // (cai como não autenticado), em vez de ser aceito como antes.
      const sessionData = verifySession<SessionData>(cookie.value);
      if (!sessionData) return null;
      return sessionData;
    } catch (e: any) {
      if (e.digest === 'DYNAMIC_SERVER_USAGE' || (e.message && e.message.includes('Dynamic server usage'))) {
        throw e;
      }
      console.error('Falha ao decodificar sessão:', e);
      return null;
    }
  }
};
export default authService;
