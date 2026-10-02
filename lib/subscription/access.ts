import 'server-only';
import { dbService } from '@/lib/supabase/db';
import { accessBlockFor, type AccessBlock } from './access-rules';

/**
 * Lê a conta fresh do banco e devolve o motivo do bloqueio (ou null).
 *
 * Fail-open em erro de leitura, como lib/subscription/guard.ts: uma falha
 * momentânea do banco não pode derrubar quem está em dia.
 */
export async function accessBlockForProfessional(professionalId: string): Promise<AccessBlock | null> {
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof) return null;
    return accessBlockFor(prof);
  } catch {
    return null;
  }
}
