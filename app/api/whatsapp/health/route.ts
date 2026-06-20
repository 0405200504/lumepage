import { NextRequest, NextResponse } from 'next/server';
import { runWhatsAppHealthCheck } from '@/lib/whatsapp/health';

export const maxDuration = 60;

/**
 * Monitor de saúde do bot — acionável manualmente com Authorization: Bearer <CRON_SECRET>.
 * Também roda automaticamente ao final de /api/cron/reminders (mesma cadência),
 * então não depende de um cron próprio no vercel.json.
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    if (auth !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const results = await runWhatsAppHealthCheck();
  return NextResponse.json({ ok: true, checked: results.length, results });
}
