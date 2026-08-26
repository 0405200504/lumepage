import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { getConnection, syncFromGoogle } from '@/lib/google/calendar';

export const maxDuration = 60;

/**
 * POST /api/google/sync
 * Sincroniza agora, a pedido da profissional (botão "Sincronizar agora").
 * O push do Google e o cron cobrem o automático; isto existe para quem acabou
 * de mexer na agenda e quer ver o resultado na hora.
 */
export async function POST() {
  try {
    const session = await authService.getCurrentUser('pro');
    if (!session?.professional_id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const conn = await getConnection(session.professional_id);
    if (!conn) {
      return NextResponse.json({ error: 'Google Agenda não está conectada.' }, { status: 400 });
    }

    const result = await syncFromGoogle(conn, session.professional_id);
    return NextResponse.json({ success: result.errors === 0, ...result });
  } catch (e) {
    console.error('[Google Sync] Erro:', e);
    return NextResponse.json({ error: 'Erro ao sincronizar.' }, { status: 500 });
  }
}
