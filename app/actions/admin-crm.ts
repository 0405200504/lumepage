'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase } from '@/lib/supabase/client';
import { isMissingTable, MIGRATION_CRM, HublaEventRow } from '@/lib/admin/crm';
import { parseHublaEvent, matchPlan, intentOf, accessEndsAt } from '@/lib/subscription/hubla';

/**
 * Ações do CRM do admin: metadados por conta, notas, tarefas, alertas adiados,
 * conciliação de pagamentos da Hubla e criação de administradores.
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

// ───────────────────────────── Conciliação da Hubla ─────────────────────────────

/**
 * Liga um pagamento sem dona a uma conta e, se for um evento de liberação,
 * aplica o plano do mesmo jeito que o webhook faria. Fica na auditoria.
 */
export async function linkHublaEventAction(idempotencyKey: string, professionalId: string): Promise<Result & { applied?: string }> {
  try {
    const admin = await assertAdmin();
    const { data: evData, error: evErr } = await db().from('hubla_webhook_events').select('*').eq('idempotency_key', idempotencyKey).maybeSingle();
    if (evErr) return fail(evErr);
    const ev = evData as HublaEventRow | null;
    if (!ev) return { success: false, error: 'Evento não encontrado.' };

    const { data: profData } = await db().from('professionals')
      .select('id, subscription_plan, subscription_status, subscription_ends_at, hubla_subscription_id')
      .eq('id', professionalId).maybeSingle();
    if (!profData) return { success: false, error: 'Conta não encontrada.' };
    const prof = profData as { id: string; subscription_plan: string | null; subscription_status: string | null; subscription_ends_at: string | null };

    const event = parseHublaEvent(ev.payload);
    const intent = intentOf(event.type);
    let applied = 'vinculado';

    if (intent === 'activate') {
      const match = matchPlan(event.offerIds);
      const months = event.billingCycleMonths || match?.months || 1;
      const plan = (match?.plan ?? prof.subscription_plan ?? 'start') as string;
      const endsAt = accessEndsAt(months);
      const patch: Record<string, unknown> = { subscription_status: 'active', subscription_plan: plan, subscription_ends_at: endsAt };
      if (event.subscriptionId) patch.hubla_subscription_id = event.subscriptionId;
      const { error } = await db().from('professionals').update(patch).eq('id', prof.id);
      if (error) return { success: false, error: error.message };
      await db().from('subscription_events').insert({
        professional_id: prof.id, plan_key: plan, status: 'active', current_period_end: endsAt,
        note: `Hubla · ${event.type} · conciliado manualmente por ${admin.email}`, changed_by: admin.email,
      });
      applied = `ativado · ${plan} · ${months} mês(es)`;
    }

    const { error: upErr } = await db().from('hubla_webhook_events')
      .update({ professional_id: prof.id, result: intent === 'activate' ? 'activated_manual' : 'linked_manual', processed_at: new Date().toISOString() })
      .eq('idempotency_key', idempotencyKey);
    if (upErr) return { success: false, error: upErr.message };

    await logAdminAction({ action: 'hubla.event.link', entityType: 'professional', entityId: prof.id, before: { result: ev.result }, after: { idempotencyKey, applied } });
    revalidate(prof.id);
    revalidatePath('/admin/subscriptions');
    return { success: true, applied };
  } catch (e) {
    return adminActionError(e, 'Erro ao conciliar o pagamento.');
  }
}

export async function dismissHublaEventAction(idempotencyKey: string): Promise<Result> {
  try {
    await assertAdmin();
    const { error } = await db().from('hubla_webhook_events')
      .update({ result: 'dismissed', processed_at: new Date().toISOString() }).eq('idempotency_key', idempotencyKey);
    if (error) return fail(error);
    await logAdminAction({ action: 'hubla.event.dismiss', entityType: 'hubla_event', entityId: idempotencyKey });
    revalidatePath('/admin/subscriptions');
    revalidatePath('/admin');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao descartar o evento.');
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
