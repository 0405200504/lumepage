import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { syncFromGoogle } from '@/lib/google/calendar';

/**
 * POST /api/google/webhook
 * Recebe push notifications do Google Calendar quando eventos mudam.
 * Dispara sync incremental para a conexão correspondente.
 */
export async function POST(request: NextRequest) {
  try {
    // Google envia o channel ID no header
    const channelId = request.headers.get('x-goog-channel-id');
    const resourceState = request.headers.get('x-goog-resource-state');

    // Ignorar notificação de "sync" (confirmação de registro)
    if (resourceState === 'sync') {
      return NextResponse.json({ ok: true });
    }

    if (!channelId) {
      return NextResponse.json({ error: 'Missing channel ID' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'DB não configurado' }, { status: 500 });
    }

    // Buscar conexão pelo channel ID
    const { data: conn } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('sync_channel_id', channelId)
      .eq('enabled', true)
      .maybeSingle();

    if (!conn) {
      console.warn('[Google Webhook] Conexão não encontrada para channel:', channelId);
      return NextResponse.json({ ok: true }); // 200 para o Google não reenviar
    }

    // Sync incremental
    const result = await syncFromGoogle(conn, conn.professional_id);
    console.log('[Google Webhook] Sync result:', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[Google Webhook] Erro:', e);
    return NextResponse.json({ ok: true }); // 200 para evitar retry do Google
  }
}
