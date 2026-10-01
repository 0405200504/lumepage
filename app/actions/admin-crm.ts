'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase } from '@/lib/supabase/client';
import { isMissingTable, MIGRATION_CRM } from '@/lib/admin/crm';
import { PLAN_LABEL, resolvePlan } from '@/lib/subscription/entitlements';
import {
  getOrphanPurchase, claimOrphanPurchase, dismissOrphanPurchase, resendOrphanWelcome,
} from '@/lib/subscription/orphans';

/**
 * Ações do CRM do admin: metadados por conta, notas, tarefas, alertas adiados,
 * compras órfãs da Hubla e criação de administradores.
 * Toda action começa por assertAdmin() e termina em logAdminAction().
 */

const db = () => getSupabaseAdmin() || supabase;
type Result = { success: boolean; error?: string; id?: string };

const missingMsg = `Rode ${MIGRATION_CRM} no Supabase para ativar este recurso.`;
const fail = (error: { code?: string; message: string }): Result =>
  ({ success: false, error: isMissingTable(error) ? missingMsg : error.message });

function revalidate(professionalId?: string | null) {
  revalidatePath('/admin');
  revalidatePath('/admin/tasks');
  revalidatePath('/admin/professionals');
  if (professionalId) revalidatePath(`/admin/professionals/${professionalId}`);
}

// ───────────────────────────── Metadados da conta ─────────────────────────────

export interface AccountMetaInput {
  ownerEmail?: string | null;
  tags?: string[];
  nextFollowUp?: string | null;
  churnReason?: string | null;
}

export async function saveAccountMetaAction(professionalId: string, input: AccountMetaInput): Promise<Result> {
  try {
    const admin = await assertAdmin();
    const tags = (input.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean).slice(0, 12);
    const row = {
      professional_id: professionalId,
      owner_email: input.ownerEmail?.trim() || null,
      tags,
      next_follow_up: input.nextFollowUp || null,
      churn_reason: input.churnReason?.trim() || null,
      updated_by: admin.email,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db().from('admin_account_meta').upsert(row, { onConflict: 'professional_id' });
    if (error) return fail(error);
    await logAdminAction({ action: 'account.meta.update', entityType: 'professional', entityId: professionalId, after: row });
    revalidate(professionalId);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao salvar os dados da conta.');
  }
}

// ───────────────────────────── Notas ─────────────────────────────

export async function addNoteAction(professionalId: string, body: string, pinned = false): Promise<Result> {
  try {
    const admin = await assertAdmin();
    const text = body.trim();
    if (!text) return { success: false, error: 'Escreva alguma coisa.' };
    if (text.length > 4000) return { success: false, error: 'Nota longa demais (máx. 4000 caracteres).' };
    const { data, error } = await db().from('admin_notes')
      .insert({ professional_id: professionalId, admin_email: admin.email, body: text, pinned })
      .select('id').single();
    if (error) return fail(error);
    await logAdminAction({ action: 'account.note.add', entityType: 'professional', entityId: professionalId, after: { pinned, length: text.length } });
    revalidate(professionalId);
    return { success: true, id: (data as { id: string }).id };
  } catch (e) {
    return adminActionError(e, 'Erro ao salvar a nota.');
  }
}

export async function setNotePinnedAction(noteId: string, pinned: boolean): Promise<Result> {
  try {
    await assertAdmin();
    const { data, error } = await db().from('admin_notes').update({ pinned }).eq('id', noteId).select('professional_id').single();
    if (error) return fail(error);
    revalidate((data as { professional_id: string }).professional_id);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao fixar a nota.');
  }
}

export async function deleteNoteAction(noteId: string): Promise<Result> {
  try {
    await assertAdmin();
    const { data, error } = await db().from('admin_notes').delete().eq('id', noteId).select('professional_id').single();
    if (error) return fail(error);
    await logAdminAction({ action: 'account.note.delete', entityType: 'professional', entityId: (data as { professional_id: string }).professional_id, after: { noteId } });
    revalidate((data as { professional_id: string }).professional_id);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao apagar a nota.');
  }
}

// ───────────────────────────── Tarefas ─────────────────────────────

export interface TaskInput {
  title: string;
  professionalId?: string | null;
  dueDate?: string | null;
  source?: string;
}

export async function createTaskAction(input: TaskInput): Promise<Result> {
  try {
    const admin = await assertAdmin();
    const title = input.title.trim();
    if (!title) return { success: false, error: 'Dê um nome à tarefa.' };
    const { data, error } = await db().from('admin_tasks').insert({
      title, professional_id: input.professionalId || null, due_date: input.dueDate || null,
      created_by: admin.email, source: input.source ?? 'manual',
    }).select('id').single();
    if (error) return fail(error);
    revalidate(input.professionalId);
    return { success: true, id: (data as { id: string }).id };
  } catch (e) {
    return adminActionError(e, 'Erro ao criar a tarefa.');
  }
}

export async function setTaskDoneAction(taskId: string, done: boolean): Promise<Result> {
  try {
    await assertAdmin();
    const { data, error } = await db().from('admin_tasks')
      .update({ done_at: done ? new Date().toISOString() : null }).eq('id', taskId).select('professional_id').single();
    if (error) return fail(error);
    revalidate((data as { professional_id: string | null }).professional_id);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao atualizar a tarefa.');
  }
}

export async function deleteTaskAction(taskId: string): Promise<Result> {
  try {
    await assertAdmin();
    const { data, error } = await db().from('admin_tasks').delete().eq('id', taskId).select('professional_id').single();
    if (error) return fail(error);
    revalidate((data as { professional_id: string | null }).professional_id);
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao apagar a tarefa.');
  }
}

// ───────────────────────────── Alertas adiados ─────────────────────────────

export async function snoozeAlertAction(key: string, days: number): Promise<Result> {
  try {
    const admin = await assertAdmin();
    if (!Number.isFinite(days) || days < 1 || days > 90) return { success: false, error: 'Adie de 1 a 90 dias.' };
    const until = new Date(); until.setDate(until.getDate() + days);
    const { error } = await db().from('admin_alert_snoozes')
      .upsert({ key, until: until.toISOString(), admin_email: admin.email }, { onConflict: 'key' });
    if (error) return fail(error);
    revalidate();
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao adiar o alerta.');
  }
}

// ───────────────────────────── Compras órfãs da Hubla ─────────────────────────────

function revalidateOrphans(professionalId?: string | null) {
  revalidate(professionalId);
  revalidatePath('/admin/subscriptions');
  revalidatePath('/admin/subscriptions/orphans');
}

/**
 * Liga uma compra órfã (todos os avisos da mesma compradora) a uma conta e, se
 * o pagamento vale, aplica o plano — mesmo caminho do webhook e do cadastro.
 */
export async function linkOrphanPurchaseAction(key: string, professionalId: string): Promise<Result & { applied?: string }> {
  try {
    const admin = await assertAdmin();
    if (!professionalId) return { success: false, error: 'Escolha a conta.' };
    const before = await getOrphanPurchase(key);
    if (!before) return { success: false, error: 'Essa compra não está mais pendente — atualize a página.' };

    const r = await claimOrphanPurchase({ key, professionalId, via: 'manual', linkedBy: admin.email });
    const applied = r ? `${PLAN_LABEL[resolvePlan(r.plan)]} ativo · ${r.months === 12 ? 'anual' : `${r.months} mês(es)`}` : 'vinculada sem ativar (pagamento não vale mais)';

    await logAdminAction({
      action: 'hubla.orphan.link', entityType: 'professional', entityId: professionalId,
      before: { key, status: before.status, events: before.events.length }, after: { applied },
    });
    revalidateOrphans(professionalId);
    return { success: true, applied };
  } catch (e) {
    return adminActionError(e, 'Erro ao vincular a compra.');
  }
}

export async function dismissOrphanPurchaseAction(key: string): Promise<Result> {
  try {
    await assertAdmin();
    const n = await dismissOrphanPurchase(key);
    if (!n) return { success: false, error: 'Essa compra não está mais pendente — atualize a página.' };
    await logAdminAction({ action: 'hubla.orphan.dismiss', entityType: 'hubla_event', entityId: key, after: { events: n } });
    revalidateOrphans();
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao descartar a compra.');
  }
}

export async function resendOrphanWelcomeAction(key: string): Promise<Result> {
  try {
    const admin = await assertAdmin();
    const error = await resendOrphanWelcome(key, admin.email);
    if (error) return { success: false, error };
    await logAdminAction({ action: 'hubla.orphan.welcome', entityType: 'hubla_event', entityId: key });
    revalidatePath('/admin/subscriptions/orphans');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao reenviar o e-mail.');
  }
}

// ───────────────────────────── Administradores ─────────────────────────────

export async function createAdminUserAction(input: { name: string; email: string; password: string }): Promise<Result> {
  try {
    await assertAdmin();
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || !email || !input.password) return { success: false, error: 'Preencha nome, e-mail e senha.' };
    if (input.password.length < 8) return { success: false, error: 'A senha precisa ter ao menos 8 caracteres.' };

    const admin = getSupabaseAdmin();
    if (!admin) return { success: false, error: 'Service role não configurada.' };

    const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
    if (existing) return { success: false, error: 'Já existe uma conta com esse e-mail.' };

    const { data: authUser, error: authErr } = await admin.auth.admin.createUser({
      email, password: input.password, email_confirm: true, user_metadata: { name },
    });
    if (authErr) return { success: false, error: authErr.message };

    // A trigger do banco cria o profile; aqui só promovemos.
    const { error: upErr } = await admin.from('profiles')
      .update({ name, role: 'super_admin', professional_id: null })
      .eq('auth_user_id', authUser.user!.id);
    if (upErr) {
      await admin.auth.admin.deleteUser(authUser.user!.id);
      return { success: false, error: `Falha ao promover a administrador: ${upErr.message}` };
    }

    await logAdminAction({ action: 'admin.user.create', entityType: 'profile', entityId: authUser.user!.id, after: { name, email } });
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao criar o administrador.');
  }
}
