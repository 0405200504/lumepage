import { NextRequest, NextResponse } from 'next/server';
import { handleCallback, setupWatch } from '@/lib/google/calendar';

/**
 * GET /api/google/callback?code=...&state=professionalId
 * Recebe o code do Google após autorização OAuth,
 * troca por tokens, salva e redireciona de volta para configurações.
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const professionalId = url.searchParams.get('state');

    if (!code || !professionalId) {
      return NextResponse.redirect(new URL('/dashboard/settings?google=error', request.url));
    }

    const { googleEmail } = await handleCallback(code, professionalId);
    console.log(`[Google Callback] Conectado: ${googleEmail} para profissional ${professionalId}`);

    // Tentar registrar push notification (webhook)
    const webhookUrl = `${url.origin}/api/google/webhook`;
    // Fire-and-forget — não bloqueia o redirect
    import('@/lib/google/calendar').then(async (mod) => {
      const conn = await mod.getConnection(professionalId);
      if (conn) {
        await setupWatch(conn, webhookUrl);
      }
    }).catch(e => console.error('[Google Callback] Erro ao registrar watch:', e));

    return NextResponse.redirect(new URL('/dashboard/settings?google=success', request.url));
  } catch (e) {
    console.error('[Google Callback] Erro:', e);
    return NextResponse.redirect(new URL('/dashboard/settings?google=error', request.url));
  }
}
