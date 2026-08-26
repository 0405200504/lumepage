import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth/auth';
import { handleCallback, readState, setupWatch, getConnection } from '@/lib/google/calendar';

/** Base pública do app — a mesma cadastrada no Google Cloud Console. */
function appOrigin(request: NextRequest): string {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/+$/, '');
}

function back(request: NextRequest, status: string) {
  return NextResponse.redirect(`${appOrigin(request)}/dashboard/settings?google=${status}`);
}

/**
 * GET /api/google/callback?code=...&state=<assinado>
 * Recebe o code do Google após autorização OAuth, troca por tokens, salva e
 * redireciona de volta para configurações.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const denied = url.searchParams.get('error');

    // Ela clicou em "Cancelar" na tela do Google.
    if (denied) return back(request, 'cancelado');

    // O state é assinado pelo servidor (HMAC) e vale 15 min — sem isso alguém
    // poderia conectar a própria agenda na conta de outra profissional.
    const professionalId = readState(url.searchParams.get('state'));
    if (!code || !professionalId) return back(request, 'error');

    // Confere contra a sessão de quem está voltando: o state precisa ser DELA.
    const session = await authService.getCurrentUser('pro');
    if (!session?.professional_id) return NextResponse.redirect(`${appOrigin(request)}/login`);
    if (session.professional_id !== professionalId) return back(request, 'conta_diferente');

    await handleCallback(code, professionalId);

    // Push notifications: sem isso a agenda só atualiza no cron (15 min).
    // Registrar antes de responder mantém previsível — a chamada é rápida e
    // falhar aqui não impede a conexão de existir.
    try {
      const conn = await getConnection(professionalId);
      if (conn) await setupWatch(conn, `${appOrigin(request)}/api/google/webhook`);
    } catch (e) {
      console.error('[Google Callback] Erro ao registrar watch:', e);
    }

    return back(request, 'success');
  } catch (e) {
    console.error('[Google Callback] Erro:', e);
    return back(request, 'error');
  }
}
