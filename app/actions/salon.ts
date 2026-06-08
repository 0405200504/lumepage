'use server';

import { cookies } from 'next/headers';
import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { ACTING_COOKIE } from '@/lib/auth/session';
import { isSupabaseConfigured, supabase, getSupabaseAdmin } from '@/lib/supabase/client';
import { ProfessionalStatus } from '@/types/database';

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

/**
 * Gerente "assume" o painel de uma profissional do seu salão.
 * Valida no servidor que a profissional pertence ao salão do gerente.
 */
export async function actAsProfessionalAction(professionalId: string) {
  try {
    const session = await authService.getCurrentUser();
    if (!session || !session.is_salon_manager) {
      return { success: false, error: 'Não autorizado.' };
    }
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof || (prof.salon_id ?? null) !== (session.salon_id ?? null)) {
      return { success: false, error: 'Profissional não pertence ao seu salão.' };
    }
    const cookieStore = await cookies();
    cookieStore.set(ACTING_COOKIE, professionalId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 12,
      path: '/',
    });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao abrir painel.' };
  }
}

/** Sai do modo "atuando como" e volta ao painel do salão. */
export async function exitActingAction() {
  const cookieStore = await cookies();
  cookieStore.delete(ACTING_COOKIE);
  return { success: true };
}

/**
 * Gerente cria a conta de uma FUNCIONÁRIA (profissional) no SEU salão.
 * Gera login + senha temporária; a profissional já entra vinculada ao salão.
 */
export async function createProfessionalForSalonAction(input: { name: string; brandName: string; email: string; whatsapp: string }) {
  try {
    const session = await authService.getCurrentUser();
    if (!session || !session.is_salon_manager || !session.salon_id) {
      return { success: false, error: 'Não autorizado.' };
    }
    const name = input.name.trim();
    const brandName = input.brandName.trim();
    const email = input.email.trim().toLowerCase();
    const whatsapp = (input.whatsapp || '').replace(/\D/g, '');
    if (!name || !brandName || !email || whatsapp.length < 10) {
      return { success: false, error: 'Preencha nome, marca, e-mail e WhatsApp válido.' };
    }
    if (await dbService.getProfileByEmail(email)) return { success: false, error: 'Já existe uma conta com esse e-mail.' };

    let slug = slugify(brandName);
    if (await dbService.getProfessionalBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

    const profId = isSupabaseConfigured ? crypto.randomUUID() : 'prof_' + Math.random().toString(36).slice(2, 9);
    const tempPassword = 'Lume' + whatsapp.substring(0, 4) + '!';

    await dbService.createProfessional({
      id: profId, owner_user_id: null, salon_id: session.salon_id,
      name, brand_name: brandName, slug, email, whatsapp,
      instagram: null, logo_url: null, profile_image_url: null,
      primary_color: '#500b18', secondary_color: '#eccbd2',
      address: null, city: null, state: null, description: null, public_bio: null, status: 'active',
    });

    if (isSupabaseConfigured) {
      const clientAdmin = getSupabaseAdmin();
      if (!clientAdmin) { await supabase.from('professionals').delete().eq('id', profId); return { success: false, error: 'Service role não configurada.' }; }
      const { data: authUser, error: authErr } = await clientAdmin.auth.admin.createUser({
        email, password: tempPassword, email_confirm: true, user_metadata: { name, professional_id: profId },
      });
      if (authErr) { await clientAdmin.from('professionals').delete().eq('id', profId); return { success: false, error: authErr.message }; }
      if (authUser.user) {
        await clientAdmin.from('professionals').update({ owner_user_id: authUser.user.id }).eq('id', profId);
        await clientAdmin.from('profiles').update({ professional_id: profId }).eq('auth_user_id', authUser.user.id);
      }
    } else {
      await dbService.createProfile({ id: 'pf_' + Math.random().toString(36).slice(2, 8), auth_user_id: 'mock_' + Math.random().toString(36).slice(2, 8), name, email, role: 'professional', professional_id: profId });
    }
    return { success: true, tempPassword, slug };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao criar funcionária.' };
  }
}

/** Gerente pausa/ativa uma funcionária do seu salão. */
export async function setProfessionalStatusForSalonAction(professionalId: string, status: ProfessionalStatus) {
  try {
    const session = await authService.getCurrentUser();
    if (!session || !session.is_salon_manager) return { success: false, error: 'Não autorizado.' };
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof || (prof.salon_id ?? null) !== (session.salon_id ?? null)) return { success: false, error: 'Profissional não pertence ao seu salão.' };
    await dbService.upsertProfessional({ id: professionalId, status });
    return { success: true };
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro ao atualizar status.' };
  }
}
