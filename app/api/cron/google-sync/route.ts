import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { syncFromGoogle, setupWatch } from '@/lib/google/calendar';

/**
 * GET /api/cron/google-sync
 * Cron job (cada 15 min) — fallback de sync para quando o webhook expira ou falha.
 * Também renova watches próximos de expirar.
 */
export async function GET(request: NextRequest) {
  // Verificar token de segurança do cron
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'DB não configurado' }, { status: 500 });
    }

    // Buscar todas as conexões ativas
    const { data: connections } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('enabled', true);

    if (!connections?.length) {
      return NextResponse.json({ message: 'Nenhuma conexão ativa.', synced: 0 });
    }

    const results = [];

    for (const conn of connections) {
      try {
        // Sync incremental
        const syncResult = await syncFromGoogle(conn, conn.professional_id);
        results.push({
          professionalId: conn.professional_id,
          email: conn.google_email,
          ...syncResult,
        });

        // Renovar watch se expira em menos de 24h ou se não tem watch
        const watchExpiration = conn.sync_expiration
          ? new Date(conn.sync_expiration).getTime()
          : 0;
        const hoursUntilExpiry = (watchExpiration - Date.now()) / (1000 * 60 * 60);

        if (hoursUntilExpiry < 24 || !conn.sync_channel_id) {
          const origin = request.headers.get('x-forwarded-proto')
            ? `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}`
            : new URL(request.url).origin;
          const webhookUrl = `${origin}/api/google/webhook`;
          await setupWatch(conn, webhookUrl);
        }
      } catch (e) {
        console.error(`[Google Cron] Erro para ${conn.google_email}:`, e);
        results.push({
          professionalId: conn.professional_id,
          email: conn.google_email,
          error: String(e),
        });
      }
    }

    return NextResponse.json({
      synced: results.length,
      results,
    });
  } catch (e) {
    console.error('[Google Cron] Erro geral:', e);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
