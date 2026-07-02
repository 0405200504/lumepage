import 'server-only';
import { dbService } from '@/lib/supabase/db';
import { can, type Capability } from './entitlements';

/**
 * Busca o plano atual da profissional direto do banco (fresh) — o plano muda via
 * webhook da Hubla após o login, então não dá pra confiar no cookie de sessão.
 */
export async function getCurrentPlan(professionalId: string): Promise<string | null> {
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    return prof?.subscription_plan ?? null;
  } catch {
    return null;
  }
}

/** Checagem de servidor — use antes de renderizar/rodar recursos pagos. */
export async function professionalCan(professionalId: string, capability: Capability): Promise<boolean> {
  return can(await getCurrentPlan(professionalId), capability);
}
