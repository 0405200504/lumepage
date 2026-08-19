import { authService } from './auth';
import { isAdminSession } from './require-admin';
import { dbService } from '@/lib/supabase/db';

/**
 * Quem pode agir sobre os dados de uma profissional.
 *
 * Esta checagem estava duplicada, palavra por palavra, em cinco arquivos de actions
 * (professional, crm, site, anamnesis, waitlist) — e duas cópias em booking.ts tinham
 * divergido, deixando qualquer gerente de salão agir sobre qualquer profissional da
 * plataforma. Agora é uma função só.
 *
 * Permitido:
 *  - Super Admin (sessão de escopo 'admin') — sobre qualquer conta;
 *  - a própria profissional;
 *  - gerente de salão, apenas sobre profissionais DO SEU salão.
 */
export async function authorizeProfessional(professionalId: string): Promise<boolean> {
  if (!professionalId) return false;

  // Admin: lido do cookie de admin, independente de haver sessão de profissional aberta.
  if (await isAdminSession()) return true;

  const session = await authService.getCurrentUser('pro');
  if (!session) return false;
  if (session.professional_id === professionalId) return true;

  if (session.is_salon_manager) {
    const prof = await dbService.getProfessionalById(professionalId);
    return !!prof && (prof.salon_id ?? null) === (session.salon_id ?? null);
  }

  return false;
}
