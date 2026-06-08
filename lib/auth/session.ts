import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { authService, SessionData } from './auth';
import { dbService } from '@/lib/supabase/db';

export const ACTING_COOKIE = 'lume_acting';

/**
 * Garante que o usuário esteja logado.
 * Caso contrário, redireciona para /login.
 */
export async function requireAuth(): Promise<SessionData> {
  const session = await authService.getCurrentUser();
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
  const session = await requireAuth();

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
  const session = await requireAuth();
  if (session.role === 'super_admin') redirect('/admin');
  if (!session.is_salon_manager) {
    redirect(session.professional_id ? '/dashboard' : '/login');
  }
  return session;
}

/**
 * Garante que o usuário logado seja um super administrador da Lume.
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== 'super_admin') {
    redirect('/dashboard');
  }
  return session;
}
