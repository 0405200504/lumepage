import { redirect } from 'next/navigation';
import { authService, SessionData } from './auth';

/**
 * AUTORIZAÇÃO DO PAINEL ADMIN
 * ---------------------------
 * Não existe RLS: o servidor fala com o banco pela service-role key. Toda server
 * action do /admin precisa começar por aqui — sem checagem, a action é acesso total
 * ao banco de qualquer pessoa que descubra o endpoint.
 *
 * Três portas, uma fonte de verdade (o cookie `lume_admin_session`):
 *  - `requireAdminPage()`  → páginas (redireciona quem não é admin)
 *  - `assertAdmin()`       → server actions (lança AdminAuthError; o try/catch da
 *                            action devolve { success: false, error })
 *  - `isAdminSession()`    → checagem booleana (usada pelos authorize() das actions
 *                            de profissional, que aceitam admin OU a própria dona)
 *
 * A sessão de admin é lida SÓ do cookie de admin. Entrar na conta teste cria uma
 * sessão de escopo 'pro' e não interfere aqui.
 */

/** Erro de autorização de admin. Mensagem já pronta para exibir. */
export class AdminAuthError extends Error {
  constructor(message = 'Não autorizado. Apenas administradores da Lume.') {
    super(message);
    this.name = 'AdminAuthError';
  }
}

/** Sessão de admin, ou null. Nunca lança. */
export async function getAdminSession(): Promise<SessionData | null> {
  const session = await authService.getCurrentUser('admin');
  return session?.role === 'super_admin' ? session : null;
}

/** true se houver uma sessão de Super Admin válida. */
export async function isAdminSession(): Promise<boolean> {
  return (await getAdminSession()) !== null;
}

/** Para server actions: devolve a sessão de admin ou lança AdminAuthError. */
export async function assertAdmin(): Promise<SessionData> {
  const session = await getAdminSession();
  if (!session) throw new AdminAuthError();
  return session;
}

/** Para páginas do /admin: devolve a sessão ou redireciona. */
export async function requireAdminPage(): Promise<SessionData> {
  const session = await getAdminSession();
  if (!session) redirect('/admin-login');
  return session;
}

/**
 * Converte a exceção de um catch em `{ success: false, error }` preservando a
 * mensagem de autorização. Usado no catch das actions do admin.
 */
export function adminActionError(e: unknown, fallback: string): { success: false; error: string } {
  if (e instanceof AdminAuthError) return { success: false, error: e.message };
  const message = e instanceof Error ? e.message : '';
  return { success: false, error: message || fallback };
}
