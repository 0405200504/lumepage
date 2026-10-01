import { NextRequest, NextResponse } from 'next/server';
import { BudgetUnavailable } from '@/lib/assistant/budget';
import { sweepExpiredVoiceCalls } from '@/lib/assistant/voice-calls';

export const maxDuration = 60;

/**
 * Guarda da conversa por voz — chamada a cada minuto pelo pg_cron (migração
 * v42). Encerra na OpenAI toda chamada que passou do prazo. É o que segura o
 * teto mesmo se o app for adulterado para não desligar sozinho.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Fail-closed, como os outros crons: sem segredo configurado, recusa.
  if (!secret) return NextResponse.json({ error: 'Cron disabled (missing secret)' }, { status: 503 });
  if (req.headers.get('authorization')?.replace('Bearer ', '') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const closed = await sweepExpiredVoiceCalls();
    return NextResponse.json({ ok: true, closed });
  } catch (e) {
    if (e instanceof BudgetUnavailable) return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    throw e;
  }
}
