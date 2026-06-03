import { redirect } from 'next/navigation';
import { authService, SessionData } from './auth';

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
 * Garante que o usuário logado seja um profissional da plataforma.
 * Se for super_admin, ele também pode navegar, ou ser redirecionado de acordo com a lógica de negócios.
 */
export async function requireProfessional(): Promise<SessionData> {
  const session = await requireAuth();
  
  // Se for super_admin, redireciona para o painel administrativo da Lume
  if (session.role === 'super_admin') {
    redirect('/admin');
  }
  
  if (!session.professional_id) {
    redirect('/login?error=no_professional_profile');
  }
  
  return session;
}

/**
 * Garante que o usuário logado seja um super administrador da Lume.
 * Caso contrário, redireciona.
 */
export async function requireAdmin(): Promise<SessionData> {
  const session = await requireAuth();
  if (session.role !== 'super_admin') {
    redirect('/dashboard'); // Profissionais comuns vão para o dashboard comercial deles
  }
  return session;
}
