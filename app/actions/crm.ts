'use server';

import { dbService } from '@/lib/supabase/db';
import { authService } from '@/lib/auth/auth';
import { TransactionType } from '@/types/database';
import { isDemo } from '@/lib/demo';

const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

async function authorize(professionalId: string): Promise<boolean> {
  const session = await authService.getCurrentUser();
  if (!session) return false;
  if (session.role === 'super_admin') return true;
  if (session.professional_id === professionalId) return true;
  // Gerente de contas pode agir sobre as funcionárias do seu salão
  if (session.is_salon_manager) {
    const prof = await dbService.getProfessionalById(professionalId);
    return !!prof && (prof.salon_id ?? null) === (session.salon_id ?? null);
  }
  return false;
}

// ===================== FINANCEIRO =====================
export async function createTransactionAction(professionalId: string, input: {
  type: TransactionType;
  amountCents: number;
  category: string;
  description?: string;
  date: string;
}) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!input.amountCents || input.amountCents <= 0) return { success: false, error: 'Informe um valor válido.' };

    const tx = await dbService.createTransaction({
      professional_id: professionalId,
      type: input.type,
      amount_cents: Math.round(input.amountCents),
      category: input.category || 'Geral',
      description: input.description || null,
      date: input.date,
    });
    return { success: true, transaction: tx };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao salvar lançamento.' };
  }
}

export async function deleteTransactionAction(professionalId: string, id: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteTransaction(id, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir lançamento.' };
  }
}

// ===================== TAREFAS =====================
export async function createTaskAction(
  professionalId: string,
  input: string | { content: string; dueDate?: string | null; dueTime?: string | null }
) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const content = (typeof input === 'string' ? input : input.content || '').trim();
    if (!content) return { success: false, error: 'Escreva algo na tarefa.' };
    const dueDate = typeof input === 'string' ? null : (input.dueDate || null);
    const dueTime = typeof input === 'string' ? null : (input.dueTime || null);
    const task = await dbService.createTask({
      professional_id: professionalId, content,
      due_date: dueDate, due_time: dueTime,
    });
    return { success: true, task };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao criar tarefa.' };
  }
}

export async function updateTaskAction(
  professionalId: string, id: string,
  fields: { content?: string; done?: boolean; dueDate?: string | null; dueTime?: string | null }
) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const payload: { content?: string; done?: boolean; due_date?: string | null; due_time?: string | null } = {};
    if (fields.content !== undefined) payload.content = fields.content.trim();
    if (fields.done !== undefined) payload.done = fields.done;
    if (fields.dueDate !== undefined) payload.due_date = fields.dueDate;
    if (fields.dueTime !== undefined) payload.due_time = fields.dueTime;
    await dbService.updateTask(id, payload, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar tarefa.' };
  }
}

export async function toggleTaskAction(professionalId: string, id: string, done: boolean) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.toggleTask(id, done, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar tarefa.' };
  }
}

export async function deleteTaskAction(professionalId: string, id: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteTask(id, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir tarefa.' };
  }
}

// ===================== CONTAS FIXAS =====================
export async function createFixedExpenseAction(professionalId: string, name: string, amountCents: number) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!name.trim()) return { success: false, error: 'Dê um nome para a conta fixa.' };
    if (!amountCents || amountCents <= 0) return { success: false, error: 'Informe um valor válido.' };
    const fx = await dbService.createFixedExpense({ professional_id: professionalId, name: name.trim(), amount_cents: Math.round(amountCents) });
    return { success: true, fixedExpense: fx };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao salvar conta fixa.' };
  }
}

export async function deleteFixedExpenseAction(professionalId: string, id: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteFixedExpense(id, professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir conta fixa.' };
  }
}

// ===================== CLIENTES =====================
export async function createClientAction(professionalId: string, input: {
  name: string; whatsapp: string; email?: string; birthday?: string; notes?: string;
}) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const name = input.name.trim();
    const whatsapp = onlyDigits(input.whatsapp);
    if (!name) return { success: false, error: 'Informe o nome da cliente.' };
    if (whatsapp.length < 10) return { success: false, error: 'Informe um WhatsApp válido com DDD.' };

    const existing = await dbService.getClientsByProfessional(professionalId);
    if (existing.some(c => onlyDigits(c.whatsapp) === whatsapp)) {
      return { success: false, error: 'Já existe uma cliente com esse WhatsApp.' };
    }

    const client = await dbService.createClient({
      professional_id: professionalId,
      name,
      whatsapp,
      email: input.email?.trim() || null,
    });
    if (input.birthday) {
      await dbService.setClientBirthday(professionalId, whatsapp, input.birthday);
    }
    if (input.notes?.trim()) {
      await dbService.updateClientNotes(client.id, input.notes.trim());
    }
    return { success: true, client };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao cadastrar cliente.' };
  }
}

// Ficha técnica / observações da cliente
export async function updateClientNotesAction(professionalId: string, clientId: string, notes: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    const client = await dbService.getClientById(clientId);
    if (!client || client.professional_id !== professionalId) {
      return { success: false, error: 'Cliente não encontrada.' };
    }
    const ok = await dbService.updateClientNotes(clientId, notes, professionalId);
    if (!ok) return { success: false, error: 'Não foi possível salvar. Rode a migração v7 no Supabase.' };
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao salvar a ficha.' };
  }
}

interface ImportRow { name: string; whatsapp: string; email?: string; birthday?: string; }

export async function importClientsAction(professionalId: string, rows: ImportRow[]) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!Array.isArray(rows) || rows.length === 0) return { success: false, error: 'Nenhuma linha válida encontrada no arquivo.' };

    const existing = await dbService.getClientsByProfessional(professionalId);
    const seen = new Set(existing.map(c => onlyDigits(c.whatsapp)));

    let imported = 0, skipped = 0;
    for (const r of rows) {
      const name = (r.name || '').trim();
      const whatsapp = onlyDigits(r.whatsapp || '');
      if (!name || whatsapp.length < 10 || seen.has(whatsapp)) { skipped++; continue; }
      seen.add(whatsapp);
      try {
        await dbService.createClient({
          professional_id: professionalId,
          name,
          whatsapp,
          email: (r.email || '').trim() || null,
        });
        if (r.birthday) await dbService.setClientBirthday(professionalId, whatsapp, r.birthday);
        imported++;
      } catch { skipped++; }
    }
    return { success: true, imported, skipped };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao importar lista.' };
  }
}

// Exclusão em lote de clientes
export async function deleteClientsAction(professionalId: string, ids: string[]) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!ids?.length) return { success: false, error: 'Nenhum cliente selecionado.' };
    await dbService.deleteClientsByIds(ids, professionalId);
    return { success: true, count: ids.length };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir clientes.' };
  }
}

export async function deleteAllClientsAction(professionalId: string) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    await dbService.deleteAllClientsForProfessional(professionalId);
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir clientes.' };
  }
}

// ===================== LIXEIRA DE CLIENTES =====================
export async function getTrashedClientsAction(professionalId: string) {
  try {
    if (!await authorize(professionalId)) return [];
    return await dbService.getTrashedClients(professionalId);
  } catch {
    return [];
  }
}

export async function restoreClientsAction(professionalId: string, ids: string[]) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!ids?.length) return { success: false, error: 'Nenhum cliente selecionado.' };
    await dbService.restoreClients(ids, professionalId);
    return { success: true, count: ids.length };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao restaurar clientes.' };
  }
}

export async function purgeClientsAction(professionalId: string, ids: string[]) {
  try {
    if (isDemo(professionalId)) return { success: true };
    if (!await authorize(professionalId)) return { success: false, error: 'Não autorizado.' };
    if (!ids?.length) return { success: false, error: 'Nenhum cliente selecionado.' };
    await dbService.purgeClients(ids, professionalId);
    return { success: true, count: ids.length };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao excluir definitivamente.' };
  }
}
