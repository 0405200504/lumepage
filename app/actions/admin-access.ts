'use server';

import { randomBytes } from 'crypto';
import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { createAccessToken, TOKEN_TTL_MINUTES } from '@/lib/access-tokens';
import { sendMail } from '@/lib/mail';
import { getAccessOverview } from '@/lib/admin/access';

/**
 * AÇÕES DE ACESSO SOBRE A CONTA DE UMA PROFISSIONAL
 * -------------------------------------------------
 * As quatro ações que resolvem o suporte sem que ninguém precise saber a senha de
 * ninguém: redefinição por link, link mágico, senha temporária com troca forçada e
 * "entrar como" (esta última vive em admin-professionals.ts).
 *
 * REGRA INEGOCIÁVEL: nenhum valor de senha, nem token em texto, entra em
 * `admin_audit_log`, em `console.log` ou em resposta de API. O que é gerado aqui
 * aparece UMA vez na tela de quem gerou e depois só existe como hash.
 */

const db = () => getSupabaseAdmin() || supabase;

const missing = (message?: string | null): boolean =>
  !!message && /does not exist|could not find|schema cache|PGRST202|PGRST205|42P01|42883/i.test(message);

type Result = { success: boolean; error?: string };

function revalidateAccess(id: string) {
  revalidatePath(`/admin/professionals/${id}`);
  revalidatePath('/admin/professionals');
}

/** Resolve o usuário do GoTrue de uma profissional. */
async function authUserOf(professionalId: string): Promise<{ uid: string | null; profileId: string | null; email: string | null; brand: string }> {
  const [{ data: prof }, { data: profile }] = await Promise.all([
    db().from('professionals').select('id, brand_name, name, email, owner_user_id').eq('id', professionalId).maybeSingle(),
    db().from('profiles').select('id, auth_user_id, email').eq('professional_id', professionalId).limit(1).maybeSingle(),
  ]);
  const p = prof as { brand_name?: string; name?: string; email?: string; owner_user_id?: string | null } | null;
  const pf = profile as { id?: string; auth_user_id?: string | null; email?: string } | null;
  return {
    uid: pf?.auth_user_id || p?.owner_user_id || null,
    profileId: pf?.id ?? null,
    email: pf?.email || p?.email || null,
    brand: p?.brand_name || p?.name || 'a profissional',
  };
}

// ───────────────────────────── 1. Redefinição por e-mail ─────────────────────────────

/**
 * Gera um link de redefinição (1h, uso único) e manda para o e-mail dela.
 * Se não houver provedor de e-mail configurado, devolve a URL para o admin repassar —
 * e diz isso com todas as letras, em vez de fingir que mandou.
 */
export async function sendPasswordResetAction(professionalId: string): Promise<Result & { url?: string; mailed?: boolean }> {
  try {
    const admin = await assertAdmin();
    const target = await authUserOf(professionalId);
    if (!target.email) return { success: false, error: 'Esta conta não tem e-mail de login.' };

    const created = await createAccessToken({
      professionalId, profileId: target.profileId, kind: 'reset', createdBy: admin.email,
    });
    if (!created.success || !created.data) return { success: false, error: created.error };

    const mail = await sendMail({
      to: target.email,
      subject: 'Redefinir a senha do seu painel Lume',
      text: [
        `Oi! O suporte da Lume gerou um link para você criar uma nova senha.`,
        '',
        created.data.url,
        '',
        `O link vale por ${TOKEN_TTL_MINUTES.reset} minutos e só funciona uma vez.`,
        'Se não foi você quem pediu, ignore este e-mail e avise a gente.',
      ].join('\n'),
    });

    await logAdminAction({
      action: 'access.reset.send',
      entityType: 'professional',
      entityId: professionalId,
      // Só o tipo de ação e o destino — nunca o token.
      after: { to: target.email, mailed: mail.sent, expires_in_minutes: TOKEN_TTL_MINUTES.reset },
    });
    revalidateAccess(professionalId);

    return {
      success: true,
      mailed: mail.sent,
      // Sem provedor de e-mail o admin precisa do link para repassar; com provedor, não devolvemos.
      url: mail.sent ? undefined : created.data.url,
      error: mail.sent ? undefined : 'E-mail não configurado (RESEND_API_KEY). Copie o link e mande você mesma.',
    };
  } catch (e) {
    return adminActionError(e, 'Erro ao gerar o link de redefinição.');
  }
}

// ───────────────────────────── 2. Link mágico ─────────────────────────────

/** URL de uso único, 15 minutos, que loga a profissional direto. Mostrada uma vez. */
export async function createMagicLinkAction(professionalId: string): Promise<Result & { url?: string; expiresAt?: string }> {
  try {
    const admin = await assertAdmin();
    const target = await authUserOf(professionalId);

    const created = await createAccessToken({
      professionalId, profileId: target.profileId, kind: 'magic', createdBy: admin.email,
    });
    if (!created.success || !created.data) return { success: false, error: created.error };

    await logAdminAction({
      action: 'access.magiclink.create',
      entityType: 'professional',
      entityId: professionalId,
      after: { expires_in_minutes: TOKEN_TTL_MINUTES.magic, brand: target.brand },
    });
    revalidateAccess(professionalId);

    return { success: true, url: created.data.url, expiresAt: created.data.expiresAt };
  } catch (e) {
    return adminActionError(e, 'Erro ao gerar o link mágico.');
  }
}

// ───────────────────────────── 3. Senha temporária ─────────────────────────────

/**
 * Define uma senha temporária forte. O sistema guarda só o hash (o GoTrue faz isso);
 * marca `must_change_password` e força a troca no próximo login. O valor volta UMA
 * vez para a tela e depois não é recuperável por ninguém — nem por nós.
 */
export async function setTemporaryPasswordAction(professionalId: string): Promise<Result & { password?: string }> {
  try {
    await assertAdmin();
    if (!isSupabaseConfigured) return { success: false, error: 'Banco não configurado.' };
    const client = getSupabaseAdmin();
    if (!client) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

    const target = await authUserOf(professionalId);
    if (!target.uid) return { success: false, error: 'Esta conta não tem usuário de autenticação. Use "Entrar como" ou cadastre o acesso.' };

    // Aleatória e forte. Nunca derivada de telefone/nome — isso já foi um bug aqui.
    const password = `Lume-${randomBytes(9).toString('base64url')}`;

    const { error } = await client.auth.admin.updateUserById(target.uid, { password });
    if (error) return { success: false, error: error.message };

    if (target.profileId) {
      const { error: pfErr } = await db().from('profiles')
        .update({ must_change_password: true, password_set_at: new Date().toISOString() })
        .eq('id', target.profileId);
      if (pfErr && !missing(pfErr.message)) console.error('[profiles.must_change_password]', pfErr.message);
    }

    await logAdminAction({
      action: 'access.temp_password.set',
      entityType: 'professional',
      entityId: professionalId,
      // O valor NÃO entra aqui. Só o fato de ter sido definida.
      after: { must_change_password: true, brand: target.brand },
    });
    revalidateAccess(professionalId);

    return { success: true, password };
  } catch (e) {
    return adminActionError(e, 'Erro ao definir a senha temporária.');
  }
}

// ───────────────────────────── 4. E-mail de login ─────────────────────────────

/** Troca o e-mail que ela usa para entrar. Avisa o endereço antigo e o novo. */
export async function changeLoginEmailAction(professionalId: string, newEmail: string): Promise<Result> {
  try {
    await assertAdmin();
    const clean = (newEmail || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clean)) return { success: false, error: 'E-mail inválido.' };

    const client = getSupabaseAdmin();
    if (!client) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

    const target = await authUserOf(professionalId);
    if (!target.uid) return { success: false, error: 'Esta conta não tem usuário de autenticação.' };
    if (clean === (target.email || '').toLowerCase()) return { success: false, error: 'Este já é o e-mail de login.' };

    const { error } = await client.auth.admin.updateUserById(target.uid, { email: clean, email_confirm: true });
    if (error) return { success: false, error: error.message };

    if (target.profileId) await db().from('profiles').update({ email: clean }).eq('id', target.profileId);

    const notice = (to: string, body: string) => sendMail({ to, subject: 'Mudança no e-mail de acesso ao seu painel Lume', text: body });
    await Promise.all([
      target.email ? notice(target.email, `O e-mail de acesso da conta ${target.brand} foi alterado para ${clean}. Se não foi você, fale com a gente agora.`) : Promise.resolve(null),
      notice(clean, `Este endereço passou a ser o e-mail de acesso da conta ${target.brand} no Lume.`),
    ]);

    await logAdminAction({
      action: 'access.login_email.change',
      entityType: 'professional',
      entityId: professionalId,
      before: { email: target.email },
      after: { email: clean },
    });
    revalidateAccess(professionalId);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao trocar o e-mail de login.');
  }
}

// ───────────────────────────── 5. Sessões ─────────────────────────────

/** Derruba todas as sessões abertas da conta (útil quando a conta foi compartilhada). */
export async function revokeSessionsAction(professionalId: string): Promise<Result & { count?: number }> {
  try {
    await assertAdmin();
    const client = getSupabaseAdmin();
    if (!client) return { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY não configurada.' };

    const target = await authUserOf(professionalId);
    if (!target.uid) return { success: false, error: 'Esta conta não tem usuário de autenticação.' };

    const { data, error } = await client.rpc('admin_revoke_sessions', { p_uid: target.uid });
    if (error) {
      if (missing(error.message)) return { success: false, error: 'Rode supabase/migration_v36_access.sql para encerrar sessões.' };
      return { success: false, error: error.message };
    }

    await logAdminAction({
      action: 'access.sessions.revoke',
      entityType: 'professional',
      entityId: professionalId,
      after: { revoked: Number(data ?? 0) },
    });
    revalidateAccess(professionalId);
    return { success: true, count: Number(data ?? 0) };
  } catch (e) {
    return adminActionError(e, 'Erro ao encerrar as sessões.');
  }
}

// ───────────────────────────── 6. Export da visão de acessos ─────────────────────────────

/** Confere se a conta tem tudo que precisa para conseguir entrar. Usado no aviso da aba. */
export async function accessHealthAction(professionalId: string): Promise<{ ok: boolean; problems: string[] }> {
  try {
    await assertAdmin();
    const overview = await getAccessOverview(professionalId);
    if (!overview) return { ok: false, problems: ['Conta não encontrada.'] };

    const problems: string[] = [];
    if (!overview.auth) problems.push('Sem usuário de autenticação — ela não consegue entrar de jeito nenhum.');
    else {
      if (overview.method === 'none') problems.push('Sem senha e sem Google: nenhum caminho de login funciona.');
      if (overview.method === 'google') problems.push('Só entra pelo Google. Se o Google falhar, não há senha de reserva.');
      if (!overview.auth.emailConfirmedAt) problems.push('E-mail nunca confirmado.');
      if (overview.auth.bannedUntil) problems.push('Conta bloqueada no provedor de autenticação.');
    }
    return { ok: problems.length === 0, problems };
  } catch {
    return { ok: false, problems: ['Não autorizado.'] };
  }
}
