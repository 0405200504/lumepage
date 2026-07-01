import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { disconnect } from '@/lib/google/calendar';

/**
 * POST /api/google/disconnect
 * Desconecta a conta Google Calendar da profissional.
 */
export async function POST() {
  try {
    const session = await authService.getCurrentUser();
    if (!session?.professional_id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    await disconnect(session.professional_id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('[Google Disconnect] Erro:', e);
    return NextResponse.json({ error: 'Erro ao desconectar.' }, { status: 500 });
  }
}
