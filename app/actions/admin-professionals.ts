'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { dbService } from '@/lib/supabase/db';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { signSession, verifySession } from '@/lib/auth/cookie';
import { PRO_COOKIE_NAME, SessionData } from '@/lib/auth/auth';
import { logAccessEvent } from '@/lib/access-tokens';
import { sendMail } from '@/lib/mail';
import { ProfessionalStatus } from '@/types/database';

/**
 * Ações do admin sobre CONTAS (FASE 1).
 * Toda action começa por assertAdmin() e termina em logAdminAction().
 */

const db = () => getSupabaseAdmin() || supabase;

type Result = { success: boolean; error?: string; count?: number };

function revalidateProfessional(id?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/professionals');
  if (id) revalidatePath(`/admin/professionals/${id}`);
}

// ───────────────────────────── Ações em massa ─────────────────────────────

/** Pausa/reativa/cancela várias contas de uma vez. */
export async function bulkSetStatusAction(ids: string[], status: ProfessionalStatus): Promise<Result> {
  try {
    await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhuma conta selecionada.' };

    const { data: before } = await db().from('professionals').select('id, status').in('id', ids);
    const { error } = await db().from('professionals').update({ status }).in('id', ids);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'professional.status.bulk',
      entityType: 'professional',
      entityId: ids.join(','),
      before,
      after: { status, ids },
    });
    revalidateProfessional();
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao alterar status.');
  }
}

/** Estende o trial (ou o vencimento do acesso) em N dias, a partir de hoje ou da data atual. */
export async function bulkExtendTrialAction(ids: string[], days: number): Promise<Result> {
  try {
    await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhuma conta selecionada.' };
    if (!Number.isFinite(days) || days <= 0 || days > 365) return { success: false, error: 'Informe de 1 a 365 dias.' };

    const { data: rows } = await db().from('professionals')
      .select('id, trial_ends_at, subscription_ends_at').in('id', ids);

    for (const r of (rows || []) as { id: string; trial_ends_at: string | null; subscription_ends_at: string | null }[]) {
      // Estende a partir da data que ainda estiver no futuro; se já venceu, de hoje.
      const base = [r.subscription_ends_at, r.trial_ends_at]
        .map(v => (v ? new Date(v) : null))
        .filter((d): d is Date => !!d && d.getTime() > Date.now())
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();
      const next = new Date(base);
      next.setDate(next.getDate() + days);
      await db().from('professionals')
        .update({ trial_ends_at: next.toISOString(), subscription_ends_at: next.toISOString() })
        .eq('id', r.id);
    }

    await logAdminAction({
      action: 'subscription.trial.extend',
      entityType: 'professional',
      entityId: ids.join(','),
      before: rows,
      after: { days },
    });
    revalidateProfessional();
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao estender o período.');
  }
}

export interface PlanChange {
  plan: 'start' | 'pro' | 'premium' | null;
  status: 'active' | 'trialing' | 'past_due' | 'canceled';
  endsAt: string | null;
  /** Motivo/observação — vai para o histórico. */
  note?: string;
}

/**
 * Muda o plano de uma ou várias contas.
 * Grava nos campos de `professionals` (que é o que o app lê para liberar recursos) E
 * no histórico `subscriptions` (migration v33), quando a tabela existir.
 */
export async function changePlanAction(ids: string[], change: PlanChange): Promise<Result> {
  try {
    const admin = await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhuma conta selecionada.' };

    const { data: before } = await db().from('professionals')
      .select('id, subscription_plan, subscription_status, subscription_ends_at').in('id', ids);

    const { error } = await db().from('professionals').update({
      subscription_plan: change.plan,
      subscription_status: change.status,
      subscription_ends_at: change.endsAt,
    }).in('id', ids);
    if (error) return { success: false, error: error.message };

    // Histórico (não bloqueia se a migration v33 ainda não rodou).
    const history = ids.map(id => ({
      professional_id: id,
      plan_key: change.plan,
      status: change.status,
      current_period_end: change.endsAt,
      note: change.note ?? null,
      changed_by: admin.email,
    }));
    const { error: histErr } = await db().from('subscription_events').insert(history);
    if (histErr && !/does not exist|schema cache|PGRST205/i.test(histErr.message)) {
      console.error('[subscription_events]', histErr.message);
    }

    await logAdminAction({
      action: 'subscription.plan.change',
      entityType: 'professional',
      entityId: ids.join(','),
      before,
      after: change,
    });
    revalidateProfessional(ids[0]);
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao mudar o plano.');
  }
}

/** Move várias contas para a lixeira. */
export async function bulkTrashAction(ids: string[]): Promise<Result> {
  try {
    await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhuma conta selecionada.' };
    for (const id of ids) await dbService.softDeleteProfessional(id);
    await logAdminAction({ action: 'professional.trash.bulk', entityType: 'professional', entityId: ids.join(','), before: { ids } });
    revalidateProfessional();
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao mover para a lixeira.');
  }
}

// ───────────────────────────── Entrar como (impersonation) ─────────────────────────────

/** Duração curta de propósito: sessão de suporte, não segundo login permanente. */
const IMPERSONATION_MINUTES = 30;

/** Leitura é o padrão. Editar é escolha consciente, feita na hora de entrar. */
export type SupportMode = 'read' | 'edit';

export interface ImpersonationResult {
  success: boolean;
  error?: string;
  /** Para onde abrir (nova aba). O admin fica na aba de origem. */
  url?: string;
  expiresAt?: number;
}

/**
 * Cria uma sessão de PROFISSIONAL escopada, marcada e com validade de 30 minutos.
 * Nunca reaproveita o cookie de admin: escreve em `lume_pro_session`, então o painel
 * administrativo continua aberto na outra aba.
 *
 * `mode`:
 *  - 'read' (padrão) → a sessão é marcada readonly e TODA mutação sobre esta conta é
 *    recusada em lib/auth/authorize-professional.ts. Serve para investigar sem medo.
 *  - 'edit' → mutações passam, e cada uma vai para a auditoria com o e-mail do admin.
 */
export async function impersonateAction(professionalId: string, mode: SupportMode = 'read'): Promise<ImpersonationResult> {
  try {
    const admin = await assertAdmin();
    if (!isSupabaseConfigured) return { success: false, error: 'Indisponível sem banco configurado.' };

    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return { success: false, error: 'Profissional não encontrada.' };

    const { data: profile } = await db().from('profiles')
      .select('id, auth_user_id, name, email').eq('professional_id', professionalId).limit(1).maybeSingle();

    const expiresAt = Date.now() + IMPERSONATION_MINUTES * 60_000;
    const session: SessionData = {
      profile_id: (profile as { id?: string } | null)?.id ?? `impersonated-${professionalId}`,
      auth_user_id: (profile as { auth_user_id?: string | null } | null)?.auth_user_id ?? null,
      name: prof.name,
      email: prof.email,
      role: 'professional',
      professional_id: professionalId,
      salon_id: prof.salon_id ?? null,
      is_salon_manager: false,
      impersonated_by: admin.email,
      readonly: mode === 'read',
      return_to: `/admin/professionals/${professionalId}`,
      exp: expiresAt,
    };

    const cookieStore = await cookies();
    cookieStore.set(PRO_COOKIE_NAME, signSession(session), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: IMPERSONATION_MINUTES * 60,
      path: '/',
    });

    await logAdminAction({
      action: 'professional.impersonate.start',
      entityType: 'professional',
      entityId: professionalId,
      after: { brand: prof.brand_name, minutes: IMPERSONATION_MINUTES, mode },
    });

    // Transparência: a entrada do suporte fica no MESMO histórico que a profissional vê.
    await logAccessEvent({
      professionalId,
      email: prof.email,
      method: 'impersonation',
      impersonatedBy: admin.email,
    });

    await notifyImpersonation(prof.email, prof.brand_name || prof.name, admin.email, mode);

    return { success: true, url: '/dashboard', expiresAt };
  } catch (e) {
    return adminActionError(e, 'Erro ao entrar como a profissional.');
  }
}

/**
 * Avisa a profissional por e-mail que o suporte entrou na conta dela.
 * Ligado por padrão; desligável em /admin/settings (`notify_on_impersonation`).
 * Best-effort: e-mail que não sai não impede o atendimento.
 */
async function notifyImpersonation(email: string, brand: string, adminEmail: string, mode: SupportMode): Promise<void> {
  try {
    const { data } = await db().from('app_settings').select('value').eq('key', 'notify_on_impersonation').maybeSingle();
    const raw = (data as { value?: unknown } | null)?.value;
    const enabled = raw === undefined || raw === null
      ? true // padrão: ligado
      : Boolean(typeof raw === 'object' && raw !== null && 'value' in raw ? (raw as { value: unknown }).value : raw);
    if (!enabled || !email) return;

    await sendMail({
      to: email,
      subject: 'O suporte da Lume acessou seu painel',
      text: [
        `Oi! Alguém do suporte da Lume (${adminEmail}) abriu o painel da conta ${brand} agora para te ajudar.`,
        mode === 'read'
          ? 'O acesso é somente leitura: nada foi alterado.'
          : 'O acesso permite edição — tudo que for alterado fica registrado e você pode conferir na sua conta.',
        '',
        'A sessão expira sozinha em 30 minutos. Se você não pediu ajuda, responda este e-mail.',
      ].join('\n'),
    });
  } catch {
    /* aviso é cortesia, não pré-requisito */
  }
}

/** Encerra a impersonação (limpa só o cookie de profissional). */
export async function stopImpersonationAction(): Promise<{ success: boolean; returnTo: string }> {
  const cookieStore = await cookies();
  const current = verifySession<SessionData>(cookieStore.get(PRO_COOKIE_NAME)?.value);
  cookieStore.delete(PRO_COOKIE_NAME);
  await logAdminAction({
    action: 'professional.impersonate.stop',
    entityType: 'professional',
    entityId: current?.professional_id ?? null,
  });
  // Volta para o detalhe da conta, não para a home do admin.
  return { success: true, returnTo: current?.return_to || '/admin/professionals' };
}

// ───────────────────────────── Limpeza de dados de teste ─────────────────────────────

/**
 * Manda para a lixeira as contas obviamente de teste ("page 1".."page 5", "teste",
 * e-mail @example.com). Reversível — vai para a lixeira, não some.
 */
export async function trashTestAccountsAction(): Promise<Result> {
  try {
    await assertAdmin();
    const { data } = await db().from('professionals').select('id, name, brand_name, email').is('deleted_at', null);
    const targets = ((data || []) as { id: string; name: string; brand_name: string; email: string }[]).filter(p =>
      /^(page\s*\d+|teste|test)$/i.test((p.name || '').trim())
      || /^(page\s*\d+|teste|test)$/i.test((p.brand_name || '').trim())
      || /@example\.com$/i.test(p.email || ''));

    if (!targets.length) return { success: true, count: 0 };
    for (const t of targets) await dbService.softDeleteProfessional(t.id);

    await logAdminAction({
      action: 'professional.testdata.trash',
      entityType: 'professional',
      entityId: targets.map(t => t.id).join(','),
      before: targets,
    });
    revalidateProfessional();
    return { success: true, count: targets.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao limpar contas de teste.');
  }
}
