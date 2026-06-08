'use server';

import { cookies } from 'next/headers';
import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import { ACTING_COOKIE } from '@/lib/auth/session';

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
