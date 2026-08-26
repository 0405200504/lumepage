import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { getAuthUrl, isGoogleCalendarConfigured } from '@/lib/google/calendar';

/**
 * GET /api/google/auth
 * Redireciona a profissional para a tela de autorização OAuth do Google.
 */
export async function GET(request: NextRequest) {
  // Base pública: precisa ser a mesma cadastrada no Google Cloud Console.
  const origin = (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
  try {
    const session = await authService.getCurrentUser('pro');
    if (!session?.professional_id) {
      return NextResponse.redirect(`${origin}/login`);
    }

    if (!isGoogleCalendarConfigured()) {
      console.error('[Google Auth] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/redirect URI não configurados.');
      return NextResponse.redirect(`${origin}/dashboard/settings?google=nao_configurado`);
    }

    // no-store: a URL do OAuth carrega um state de uso único e curta validade.
    return NextResponse.redirect(getAuthUrl(session.professional_id), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    console.error('[Google Auth] Erro:', e);
    return NextResponse.redirect(`${origin}/dashboard/settings?google=error`);
  }
}
