import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { SessionData } from './auth';

/**
 * A conta está com senha temporária pendente de troca?
 *
 * Marcado por `access.temp_password.set` (o suporte definiu uma senha para ela
 * conseguir entrar) e limpo quando ela escolhe a própria. Uma senha que outra pessoa
 * viu não pode continuar valendo — daí a sobreposição obrigatória no painel.
 *
 * Nunca bloqueia por engano: sem banco, sem a coluna (migration v36 pendente) ou em
 * qualquer erro, devolve false.
 */
export async function mustChangePassword(session: SessionData): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  // Sessão de suporte e conta teste não têm senha própria para trocar.
  if (session.impersonated_by || !session.auth_user_id) return false;

  try {
    const { data, error } = await (getSupabaseAdmin() || supabase)
      .from('profiles')
      .select('must_change_password')
      .eq('id', session.profile_id)
      .maybeSingle();
    if (error) return false;
    return Boolean((data as { must_change_password?: boolean } | null)?.must_change_password);
  } catch {
    return false;
  }
}
