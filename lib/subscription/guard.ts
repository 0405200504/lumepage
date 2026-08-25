import 'server-only';
import { dbService } from '@/lib/supabase/db';
import { canAccess, type Capability } from './entitlements';
import type { CheckoutIdentity } from '@/lib/lp/site';

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

/**
 * Identidade pro checkout da Hubla (id, e-mail, nome e telefone da conta).
 *
 * O `sck` que vai junto do link é o que devolve o pagamento pra ESTA conta no
 * webhook — sem ele, o vínculo depende do e-mail digitado no checkout bater com
 * o do cadastro. Fail-open: sem os dados, o link continua valendo, só sem carimbo.
 */
export async function checkoutIdentityFor(professionalId: string): Promise<CheckoutIdentity | null> {
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return null;
    return {
      professionalId: prof.id,
      email: prof.email,
      name: prof.name || prof.brand_name,
      phone: prof.whatsapp,
    };
  } catch {
    return null;
  }
}
