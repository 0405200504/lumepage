'use server';

import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { redeemAccessToken, createAccessToken, logAccessEvent, requestMeta } from '@/lib/access-tokens';
import { authService } from '@/lib/auth/auth';
import { rateLimit } from '@/lib/rate-limit';
import { sendMail } from '@/lib/mail';
import { passwordResetEmail } from '@/lib/mail-templates';

/**
 * AÇÕES DE ACESSO DA PRÓPRIA PROFISSIONAL (não são do admin)
 * ---------------------------------------------------------
 * Duas telas usam isto: a de "criar nova senha" (link de redefinição) e a troca
 * obrigatória depois de uma senha temporária.
 *
 * A senha nova vai direto para o GoTrue, que a guarda como hash bcrypt. Ela não
 * passa por nenhuma tabela nossa, não entra em log e não volta em resposta nenhuma.
 */

const db = () => getSupabaseAdmin() || supabase;

const missing = (message?: string | null): boolean =>
  !!message && /does not exist|could not find|schema cache|PGRST205|42P01/i.test(message);

type Result = { success: boolean; error?: string };

/** Regra única de senha, usada aqui e no cadastro. */
function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return 'Crie uma senha de pelo menos 8 caracteres.';
  if (/^\d+$/.test(password)) return 'Uma senha só de números é fácil demais de adivinhar.';
  return null;
}

/** Define a nova senha a partir de um link de redefinição de uso único. */
export async function resetPasswordWithTokenAction(token: string, password: string): Promise<Result> {
  if (!isSupabaseConfigured) return { success: false, error: 'Indisponível no momento.' };

  // Corta força bruta em cima do token (32 bytes aleatórios, mas ainda assim).
  const { ip } = await requestMeta();
  const rl = await rateLimit(`reset:${ip ?? 'anon'}`, 10, 5 * 60 * 1000);
  if (!rl.ok) return { success: false, error: `Muitas tentativas. Tente de novo em ${rl.retryAfterSeconds}s.` };

  const invalid = validatePassword(password);
  if (invalid) return { success: false, error: invalid };

  const client = getSupabaseAdmin();
  if (!client) return { success: false, error: 'Indisponível no momento.' };

  // Queima o token ANTES de trocar a senha: um link, uma troca.
  const redeemed = await redeemAccessToken(token, 'reset');
  if (!redeemed.ok) return { success: false, error: redeemed.error };

  const { data: profile } = await db().from('profiles')
    .select('id, auth_user_id, email')
    .eq(redeemed.data.profileId ? 'id' : 'professional_id', redeemed.data.profileId ?? redeemed.data.professionalId)
    .limit(1)
    .maybeSingle();

  const pf = profile as { id: string; auth_user_id: string | null; email: string } | null;
  if (!pf?.auth_user_id) return { success: false, error: 'Conta sem usuário de autenticação. Fale com o suporte.' };

  const { error } = await client.auth.admin.updateUserById(pf.auth_user_id, { password });
  if (error) return { success: false, error: error.message };

  const { error: pfErr } = await db().from('profiles')
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .eq('id', pf.id);
  if (pfErr && !missing(pfErr.message)) console.error('[profiles.password_set_at]', pfErr.message);

  await logAccessEvent({ professionalId: redeemed.data.professionalId, email: pf.email, method: 'password' });
  return { success: true };
}

/**
 * Troca de senha da própria profissional já logada.
 * É o que destrava a conta depois de uma senha temporária definida pelo suporte.
 */
export async function changeOwnPasswordAction(currentPassword: string, newPassword: string): Promise<Result> {
  if (!isSupabaseConfigured) return { success: false, error: 'Indisponível no momento.' };

  const session = await authService.getCurrentUser('pro');
  if (!session?.auth_user_id) return { success: false, error: 'Faça login de novo para trocar a senha.' };
  // Sessão de suporte não troca a senha de ninguém — isso é da dona da conta.
  if (session.impersonated_by) return { success: false, error: 'Sessão de suporte não pode trocar a senha da conta.' };

  const invalid = validatePassword(newPassword);
  if (invalid) return { success: false, error: invalid };
  if (currentPassword === newPassword) return { success: false, error: 'A nova senha precisa ser diferente da atual.' };

  // Confere a senha atual pelo caminho normal de login (comparação de hash no GoTrue).
  const { error: checkErr } = await supabase.auth.signInWithPassword({ email: session.email, password: currentPassword });
  if (checkErr) return { success: false, error: 'A senha atual não confere.' };

  const client = getSupabaseAdmin();
  if (!client) return { success: false, error: 'Indisponível no momento.' };

  const { error } = await client.auth.admin.updateUserById(session.auth_user_id, { password: newPassword });
  if (error) return { success: false, error: error.message };

  const { error: pfErr } = await db().from('profiles')
    .update({ must_change_password: false, password_set_at: new Date().toISOString() })
    .eq('id', session.profile_id);
  if (pfErr && !missing(pfErr.message)) console.error('[profiles.password_set_at]', pfErr.message);

  await logAccessEvent({ professionalId: session.professional_id, email: session.email, method: 'password' });
  return { success: true };
}

/**
 * Solicita redefinição de senha por e-mail (autoatendimento da tela de login).
 * Envia o e-mail via Resend se o e-mail existir no banco, mas sempre devolve resposta
 * neutra para impedir enumeração de contas (best-practice de segurança).
 */
export async function requestPasswordResetAction(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
  if (!isSupabaseConfigured) return { success: false, error: 'Serviço indisponível no momento.' };

  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, error: 'Informe um endereço de e-mail válido.' };
  }

  // Rate-limit por IP para evitar spam de envio
  const { ip } = await requestMeta();
  const rl = await rateLimit(`forgot-pwd:${ip ?? 'anon'}`, 5, 10 * 60 * 1000);
  if (!rl.ok) {
    return { success: false, error: `Muitas solicitações. Aguarde ${rl.retryAfterSeconds}s para tentar novamente.` };
  }

  try {
    // Busca perfil associado ao e-mail
    const { data: profile } = await db().from('profiles')
      .select('id, professional_id, name, email')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (profile && profile.professional_id) {
      const tokenRes = await createAccessToken({
        professionalId: profile.professional_id,
        profileId: profile.id,
        kind: 'reset',
        createdBy: 'self_service',
      });

      if (tokenRes.success && tokenRes.data) {
        const mailContent = passwordResetEmail({
          name: profile.name,
          resetUrl: tokenRes.data.url,
        });

        await sendMail({
          to: profile.email,
          subject: mailContent.subject,
          text: mailContent.text,
          html: mailContent.html,
        });
      }
    }

    // Retorna mensagem positiva genérica para segurança contra enumeração
    return {
      success: true,
      message: 'Se este e-mail estiver cadastrado, enviamos um link seguro para você redefinir sua senha.',
    };
  } catch (err) {
    console.error('[requestPasswordResetAction]', err);
    return {
      success: true,
      message: 'Se este e-mail estiver cadastrado, enviamos um link seguro para você redefinir sua senha.',
    };
  }
}

