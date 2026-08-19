'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { PlanRow, FALLBACK_PLANS } from '@/lib/admin/plans';

/** Catálogo de planos (migration v33). */

const db = () => getSupabaseAdmin() || supabase;

export async function listPlansAction(): Promise<{ plans: PlanRow[]; persisted: boolean }> {
  if (!isSupabaseConfigured) return { plans: FALLBACK_PLANS, persisted: false };
  const { data, error } = await db().from('plans').select('*').order('sort_order');
  if (error || !data?.length) return { plans: FALLBACK_PLANS, persisted: false };
  return { plans: data as PlanRow[], persisted: true };
}

export async function upsertPlanAction(plan: PlanRow): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();
    if (!plan.key.trim() || !plan.name.trim()) return { success: false, error: 'Chave e nome são obrigatórios.' };

    const { data: before } = await db().from('plans').select('*').eq('key', plan.key).maybeSingle();
    const { error } = await db().from('plans').upsert({
      key: plan.key.trim(),
      name: plan.name.trim(),
      price_cents: Math.max(0, Math.round(plan.price_cents)),
      billing_cycle: plan.billing_cycle,
      description: plan.description,
      is_active: plan.is_active,
      sort_order: plan.sort_order,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      if (/does not exist|schema cache|PGRST205/i.test(error.message)) {
        return { success: false, error: 'Rode supabase/migration_v33_plans.sql para poder editar os planos.' };
      }
      return { success: false, error: error.message };
    }

    await logAdminAction({ action: 'plan.upsert', entityType: 'plan', entityId: plan.key, before, after: plan });
    revalidatePath('/admin/plans');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao salvar o plano.');
  }
}
