'use server';

import { revalidatePath } from 'next/cache';
import { assertAdmin, adminActionError } from '@/lib/auth/require-admin';
import { logAdminAction } from '@/lib/audit';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/** Avisos para a base e configurações globais (FASE 4 · migration v34). */

const db = () => getSupabaseAdmin() || supabase;
const missing = (msg?: string) => /does not exist|schema cache|PGRST205/i.test(msg || '');

export interface NoticeInput {
  title: string;
  body: string;
  level: 'info' | 'warn' | 'success';
  audience: 'all' | 'active' | 'trialing' | 'no_bot';
  endsAt: string | null;
}

export interface NoticeRow extends NoticeInput {
  id: string;
  active: boolean;
  created_by: string | null;
  created_at: string;
  ends_at: string | null;
}

export async function listNoticesAction(): Promise<{ notices: NoticeRow[]; available: boolean }> {
  if (!isSupabaseConfigured) return { notices: [], available: false };
  const { data, error } = await db().from('admin_notices').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) return { notices: [], available: !missing(error.message) };
  return { notices: (data || []) as NoticeRow[], available: true };
}

export async function createNoticeAction(input: NoticeInput): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertAdmin();
    if (!input.title.trim() || !input.body.trim()) return { success: false, error: 'Título e mensagem são obrigatórios.' };

    const { error } = await db().from('admin_notices').insert({
      title: input.title.trim(),
      body: input.body.trim(),
      level: input.level,
      audience: input.audience,
      ends_at: input.endsAt,
      created_by: admin.email,
    });
    if (error) {
      if (missing(error.message)) return { success: false, error: 'Rode supabase/migration_v34_admin_system.sql para publicar avisos.' };
      return { success: false, error: error.message };
    }

    await logAdminAction({ action: 'notice.create', entityType: 'notice', after: input });
    revalidatePath('/admin/broadcast');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao publicar o aviso.');
  }
}

export async function setNoticeActiveAction(id: string, active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    await assertAdmin();
    const { error } = await db().from('admin_notices').update({ active }).eq('id', id);
    if (error) return { success: false, error: error.message };
    await logAdminAction({ action: 'notice.toggle', entityType: 'notice', entityId: id, after: { active } });
    revalidatePath('/admin/broadcast');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao alterar o aviso.');
  }
}

// ───────────────────────────── Configurações globais ─────────────────────────────

export async function getAppSettingsAction(): Promise<{ settings: Record<string, unknown>; available: boolean }> {
  if (!isSupabaseConfigured) return { settings: {}, available: false };
  const { data, error } = await db().from('app_settings').select('key, value');
  if (error) return { settings: {}, available: !missing(error.message) };
  const settings: Record<string, unknown> = {};
  for (const row of (data || []) as { key: string; value: unknown }[]) settings[row.key] = row.value;
  return { settings, available: true };
}

export async function saveAppSettingAction(key: string, value: unknown): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = await assertAdmin();
    const { data: before } = await db().from('app_settings').select('value').eq('key', key).maybeSingle();
    const { error } = await db().from('app_settings')
      .upsert({ key, value, updated_by: admin.email, updated_at: new Date().toISOString() });
    if (error) {
      if (missing(error.message)) return { success: false, error: 'Rode supabase/migration_v34_admin_system.sql para salvar configurações.' };
      return { success: false, error: error.message };
    }
    await logAdminAction({ action: 'settings.update', entityType: 'settings', entityId: key, before, after: value });
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (e) {
    return adminActionError(e, 'Erro ao salvar a configuração.');
  }
}
