import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { BudgetUnavailable } from '@/lib/assistant/budget';
import { getVoiceGuardToken, sweepExpiredVoiceCalls } from '@/lib/assistant/voice-calls';

export const maxDuration = 60;

const digest = (s: string) => createHash('sha256').update(s).digest();
const same = (a: string, b: string) => timingSafeEqual(digest(a), digest(b));

/**
 * Guarda da conversa por voz — chamada a cada minuto pelo pg_cron (migração
 * v43). Encerra na OpenAI toda chamada que passou do prazo. É o que segura o
 * teto mesmo se o app for adulterado para não desligar sozinho.
 *
 * O job manda o segredo que a própria migração gerou e guardou no banco
 * (ai_voice_guard), então ninguém precisa copiar segredo à mão. O CRON_SECRET
 * também vale, para acionar manualmente. Sem nenhum dos dois, recusa.
 */
export async function GET(req: NextRequest) {
  const got = req.headers.get('authorization')?.replace('Bearer ', '') || '';
  try {
    const cron = process.env.CRON_SECRET;
    let ok = !!got && !!cron && same(got, cron);
    if (!ok && got) {
      const token = await getVoiceGuardToken();
      ok = !!token && same(got, token);
    }
    if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const closed = await sweepExpiredVoiceCalls();
    return NextResponse.json({ ok: true, closed });
  } catch (e) {
    if (e instanceof BudgetUnavailable) return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    throw e;
  }
}
