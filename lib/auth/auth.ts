import { cookies } from 'next/headers';
import { isSupabaseConfigured, supabase } from '../supabase/client';
import { dbService } from '../supabase/db';
import { Profile } from '@/types/database';

const SESSION_COOKIE_NAME = 'lume_session';

export interface SessionData {
  profile_id: string;
  auth_user_id: string | null;
  name: string;
  email: string;
  role: 'super_admin' | 'professional';
  professional_id: string | null;
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
          const sessionData: SessionData = {
            profile_id: profile.id,
            auth_user_id: authData.user.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            professional_id: profile.professional_id
          };

          const cookieStore = await cookies();
          cookieStore.set(SESSION_COOKIE_NAME, Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 7 dias
            path: '/'
          });

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
    const sessionData: SessionData = {
      profile_id: profile.id,
      auth_user_id: null,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      professional_id: profile.professional_id
    };

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, Buffer.from(JSON.stringify(sessionData)).toString('base64'), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/'
    });

    return { success: true, profile };
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
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(SESSION_COOKIE_NAME);
      if (!cookie || !cookie.value) {
        // Se estiver com Supabase configurado, podemos ler a sessão dele caso não haja cookie
        if (isSupabaseConfigured) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const profile = await dbService.getProfileByAuthUserId(user.id);
            if (profile) {
              return {
                profile_id: profile.id,
                auth_user_id: user.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                professional_id: profile.professional_id
              };
            }
          }
        }
        return null;
      }

      // Decodificar dados do cookie em base64
      const decoded = Buffer.from(cookie.value, 'base64').toString('utf8');
      const sessionData = JSON.parse(decoded) as SessionData;
      return sessionData;
    } catch (e) {
      console.error('Falha ao decodificar sessão:', e);
      return null;
    }
  }
};
export default authService;
