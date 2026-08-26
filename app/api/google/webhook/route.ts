import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { syncFromGoogle } from '@/lib/google/calendar';

function sameToken(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * POST /api/google/webhook
 * Recebe push notifications do Google Calendar quando eventos mudam.
 * Dispara sync incremental para a conexão correspondente.
 *
 * Responde 200 em quase todo caso: erro faz o Google reenviar com backoff e,
 * depois de muitas falhas, derrubar o canal.
 */
export async function POST(request: NextRequest) {
  try {
    const channelId = request.headers.get('x-goog-channel-id');
    const resourceState = request.headers.get('x-goog-resource-state');
    const channelToken = request.headers.get('x-goog-channel-token');

    // Notificação de "sync" = confirmação de que o canal foi criado.
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

    // O token do canal é o segredo combinado no watch. Canais criados antes da
    // migração v38 não têm token salvo — esses seguem aceitos até renovarem.
    if (conn.webhook_token && (!channelToken || !sameToken(conn.webhook_token, channelToken))) {
      console.warn('[Google Webhook] Token do canal inválido:', channelId);
      return NextResponse.json({ error: 'Token inválido' }, { status: 403 });
    }

    const result = await syncFromGoogle(conn, conn.professional_id);
    console.log('[Google Webhook] Sync result:', result);

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error('[Google Webhook] Erro:', e);
    return NextResponse.json({ ok: true }); // 200 para evitar retry do Google
  }
}
