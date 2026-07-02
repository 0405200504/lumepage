import 'server-only';
import { dbService } from '@/lib/supabase/db';
import { canAccess, type Capability } from './entitlements';

/**
 * Checagem de servidor — use antes de renderizar/rodar recursos pagos.
 * Lê o profissional fresh do banco (plano/status mudam via webhook após o login)
 * e considera legado/trial: conta existente ou em teste passa direto. Em caso de
 * erro de leitura, NÃO bloqueia (fail-open) para não derrubar o app.
 */
export async function professionalCan(professionalId: string, capability: Capability): Promise<boolean> {
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return true;
    return canAccess(prof, capability);
  } catch {
    return true;
  }
}
