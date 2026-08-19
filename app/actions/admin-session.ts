'use server';

import { authService } from '@/lib/auth/auth';

/**
 * Encerra APENAS a sessão de admin. Com os cookies separados, sair do painel
 * administrativo não desloga a conta de profissional aberta na outra aba (nem a conta
 * teste), que é justamente o que a sessão única não permitia.
 */
export async function adminLogoutAction(): Promise<{ success: boolean }> {
  const ok = await authService.logout('admin');
  return { success: ok };
}
