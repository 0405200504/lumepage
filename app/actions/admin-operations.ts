'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { AppointmentStatus } from '@/types/database';
import { normalizePhone } from '@/lib/admin/queries';

/**
 * Ações do admin sobre a OPERAÇÃO da rede (FASE 2): agendamentos, clientes e
 * conversas. Antes o admin via 340 agendamentos e não podia mudar um status sequer.
 */

const db = () => getSupabaseAdmin() || supabase;
type Result = { success: boolean; error?: string; count?: number };

// ───────────────────────────── Agendamentos ─────────────────────────────

export async function setAppointmentStatusAction(
  ids: string[], status: AppointmentStatus, reason?: string,
): Promise<Result> {
  try {
    await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhum agendamento selecionado.' };

    const { data: before } = await db().from('appointments').select('id, status, date, client_name').in('id', ids);
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'cancelled') patch.cancellation_reason = reason?.trim() || 'Cancelado pelo administrador';

    const { error } = await db().from('appointments').update(patch).in('id', ids);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'appointment.status.update',
      entityType: 'appointment',
      entityId: ids.join(','),
      before,
      after: { status, reason: reason ?? null },
    });
    revalidatePath('/admin/appointments');
    revalidatePath('/admin');
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao alterar o status.');
  }
}

/** Remarca um agendamento (data e/ou horário). Mantém duração. */
export async function rescheduleAppointmentAction(
  id: string, date: string, startTime: string,
): Promise<Result> {
  try {
    await assertAdmin();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}/.test(startTime)) {
      return { success: false, error: 'Data ou horário inválidos.' };
    }

    const { data: before } = await db().from('appointments')
      .select('id, date, start_time, end_time').eq('id', id).maybeSingle();
    if (!before) return { success: false, error: 'Agendamento não encontrado.' };

    const b = before as { date: string; start_time: string; end_time: string };
    const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
    const duration = Math.max(15, toMin(b.end_time) - toMin(b.start_time));
    const startMin = toMin(startTime);
    const endMin = startMin + duration;
    const fmt = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}:00`;

    const { error } = await db().from('appointments')
      .update({ date, start_time: `${startTime}:00`.slice(0, 8), end_time: fmt(endMin), updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { success: false, error: error.message };

    await logAdminAction({
      action: 'appointment.reschedule', entityType: 'appointment', entityId: id,
      before: b, after: { date, start_time: startTime },
    });
    revalidatePath('/admin/appointments');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao remarcar.');
  }
}

// ───────────────────────────── Clientes ─────────────────────────────

/**
 * Funde clientes duplicadas em uma só.
 * Regra: a principal fica; as outras vão para a lixeira depois que os agendamentos
 * apontam para ela. Nada é apagado de verdade — o histórico é preservado.
 */
export async function mergeClientsAction(primaryId: string, duplicateIds: string[]): Promise<Result> {
  try {
    await assertAdmin();
    if (!primaryId || !duplicateIds.length) return { success: false, error: 'Selecione a principal e ao menos uma duplicata.' };
    if (duplicateIds.includes(primaryId)) return { success: false, error: 'A principal não pode estar na lista de duplicatas.' };
    if (!isSupabaseConfigured) return { success: false, error: 'Indisponível sem banco.' };

    const { data: all } = await db().from('clients').select('*').in('id', [primaryId, ...duplicateIds]);
    const rows = (all || []) as { id: string; professional_id: string; name: string; whatsapp: string; email: string | null; total_appointments: number | null; last_appointment_at: string | null; created_at: string }[];
    const primary = rows.find(r => r.id === primaryId);
    if (!primary) return { success: false, error: 'Cliente principal não encontrada.' };
    if (rows.some(r => r.professional_id !== primary.professional_id)) {
      return { success: false, error: 'Só dá para fundir clientes da mesma profissional.' };
    }

    // 1. Agendamentos das duplicatas passam a apontar para a principal.
    await db().from('appointments').update({ client_id: primaryId }).in('client_id', duplicateIds);

    // 2. A principal herda os totais e a visita mais recente.
    const totals = rows.reduce((s, r) => s + (r.total_appointments || 0), 0);
    const lastVisit = rows.map(r => r.last_appointment_at).filter(Boolean).sort().pop() ?? null;
    const oldest = rows.map(r => r.created_at).sort()[0];
    await db().from('clients').update({
      total_appointments: totals,
      last_appointment_at: lastVisit,
      created_at: oldest,
      whatsapp: normalizePhone(primary.whatsapp) || primary.whatsapp,
      email: primary.email ?? rows.find(r => r.email)?.email ?? null,
    }).eq('id', primaryId);

    // 3. Duplicatas para a lixeira.
    await db().from('clients').update({ deleted_at: new Date().toISOString() }).in('id', duplicateIds);

    await logAdminAction({
      action: 'client.merge', entityType: 'client', entityId: primaryId,
      before: rows, after: { primaryId, merged: duplicateIds, total_appointments: totals },
    });
    revalidatePath('/admin/clients');
    revalidatePath('/admin/clients/duplicates');
    return { success: true, count: duplicateIds.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao fundir as clientes.');
  }
}

/** Corrige o nome de uma cliente (as que ficaram com o telefone no lugar do nome). */
export async function renameClientAction(id: string, name: string): Promise<Result> {
  try {
    await assertAdmin();
    const clean = name.trim();
    if (clean.length < 2) return { success: false, error: 'Informe um nome válido.' };
    const { data: before } = await db().from('clients').select('id, name').eq('id', id).maybeSingle();
    const { error } = await db().from('clients').update({ name: clean }).eq('id', id);
    if (error) return { success: false, error: error.message };
    await logAdminAction({ action: 'client.rename', entityType: 'client', entityId: id, before, after: { name: clean } });
    revalidatePath('/admin/clients');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao renomear.');
  }
}

/**
 * Normaliza os telefones da base para E.164 (55 + DDD + número).
 * É o passo que faz "5514981378956" e "14981378956" pararem de ser duas pessoas.
 */
export async function normalizePhonesAction(): Promise<Result> {
  try {
    await assertAdmin();
    if (!isSupabaseConfigured) return { success: false, error: 'Indisponível sem banco.' };

    const { data } = await db().from('clients').select('id, whatsapp').is('deleted_at', null).limit(20000);
    const rows = (data || []) as { id: string; whatsapp: string }[];
    let changed = 0;
    for (const r of rows) {
      const normalized = normalizePhone(r.whatsapp);
      if (normalized && normalized !== r.whatsapp) {
        await db().from('clients').update({ whatsapp: normalized }).eq('id', r.id);
        changed++;
      }
    }
    await logAdminAction({ action: 'client.phones.normalize', entityType: 'client', after: { changed, scanned: rows.length } });
    revalidatePath('/admin/clients');
    return { success: true, count: changed };
  } catch (e) {
    return adminActionError(e, 'Erro ao normalizar telefones.');
  }
}

// ───────────────────────────── Conversas ─────────────────────────────

/** Devolve a conversa ao bot (deixa de esperar atendimento humano). */
export async function resolveConversationAction(ids: string[]): Promise<Result> {
  try {
    await assertAdmin();
    if (!ids.length) return { success: false, error: 'Nenhuma conversa selecionada.' };
    const { error } = await db().from('whatsapp_conversations')
      .update({ bot_paused: false, bot_cooldown_until: null }).in('id', ids);
    if (error) return { success: false, error: error.message };
    await logAdminAction({ action: 'conversation.resolve', entityType: 'conversation', entityId: ids.join(','), after: { count: ids.length } });
    revalidatePath('/admin/conversations');
    revalidatePath('/admin');
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao resolver a conversa.');
  }
}

/** Mantém a conversa com a pessoa (bot pausado) — usado ao escalar de volta para a profissional. */
export async function holdConversationAction(ids: string[]): Promise<Result> {
  try {
    await assertAdmin();
    const { error } = await db().from('whatsapp_conversations').update({ bot_paused: true }).in('id', ids);
    if (error) return { success: false, error: error.message };
    await logAdminAction({ action: 'conversation.hold', entityType: 'conversation', entityId: ids.join(',') });
    revalidatePath('/admin/conversations');
    return { success: true, count: ids.length };
  } catch (e) {
    return adminActionError(e, 'Erro ao escalar a conversa.');
  }
}
