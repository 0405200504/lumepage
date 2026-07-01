import { NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { getAuthUrl } from '@/lib/google/calendar';

/**
 * GET /api/google/auth
 * Redireciona a profissional para a tela de autorização OAuth do Google.
 */
export async function GET() {
  try {
    const session = await authService.getCurrentUser();
    if (!session?.professional_id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }

    const url = getAuthUrl(session.professional_id);
    return NextResponse.redirect(url);
  } catch (e) {
    console.error('[Google Auth] Erro:', e);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
