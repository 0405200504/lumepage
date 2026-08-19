import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { authService, SessionData, SessionScope } from './auth';
import { requireAdminPage } from './require-admin';
import { dbService } from '@/lib/supabase/db';

export const ACTING_COOKIE = 'lume_acting';

/**
 * Garante que o usuário esteja logado.
 * Caso contrário, redireciona para /login.
 *
 * `scope` restringe a leitura a um painel: 'pro' ignora a sessão de admin e
 * vice-versa. Sem escopo, mantém o comportamento antigo (qualquer sessão serve).
 */
export async function requireAuth(scope?: SessionScope): Promise<SessionData> {
  const session = await authService.getCurrentUser(scope);
  if (!session) {
    redirect('/login');
  }
  return session;
}

/**
 * Garante que o usuário logado seja um profissional — OU um gerente de salão
 * "atuando como" uma profissional do seu salão (acting-as).
 */
export async function requireProfessional(): Promise<SessionData> {
  // Escopo 'pro': o painel da profissional nunca herda a sessão de admin.
  const session = await requireAuth('pro');

  if (session.role === 'super_admin') {
    redirect('/admin');
  }

  // Gerente de salão: precisa estar "atuando como" uma profissional do seu salão
  if (session.is_salon_manager) {
    const cookieStore = await cookies();
    const acting = cookieStore.get(ACTING_COOKIE)?.value;
    if (!acting) redirect('/salon');
    const prof = await dbService.getProfessionalById(acting);
    if (!prof || (prof.salon_id ?? null) !== (session.salon_id ?? null)) {
      redirect('/salon');
    }
    return { ...session, professional_id: acting };
  }

  if (!session.professional_id) {
    redirect('/login?error=no_professional_profile');
  }

  return session;
}

/**
 * Garante que o usuário logado seja um GERENTE DE SALÃO.
 */
export async function requireSalonManager(): Promise<SessionData> {
  const session = await requireAuth('pro');
  if (session.role === 'super_admin') redirect('/admin');
  if (!session.is_salon_manager) {
    redirect(session.professional_id ? '/dashboard' : '/login');
  }
  return session;
}

/**
 * Garante que o usuário logado seja um super administrador da Lume.
 * Lê apenas o cookie de admin (ver lib/auth/require-admin.ts).
 */
export async function requireAdmin(): Promise<SessionData> {
  return requireAdminPage();
}
