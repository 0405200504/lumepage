import { authService } from '@/lib/auth/auth';
import { BudgetUnavailable } from '@/lib/assistant/budget';
import { finishVoiceCall, getOwnVoiceCall } from '@/lib/assistant/voice-calls';

/**
 * Fim da conversa pelo app (botão encerrar, prazo, silêncio longo ou a aba
 * fechando — neste caso chega por navigator.sendBeacon, como texto). O
 * servidor encerra a chamada na OpenAI e fecha a conta dela.
 */
export async function POST(req: Request) {
  const session = await authService.getCurrentUser();
  if (!session?.professional_id) return Response.json({ error: 'Não autorizado.' }, { status: 401 });

  let callId = '';
  try {
    const body = JSON.parse(await req.text());
    callId = typeof body?.callId === 'string' ? body.callId : '';
  } catch { /* corpo inválido */ }
  if (!callId) return Response.json({ error: 'Chamada não informada.' }, { status: 400 });

  try {
    const call = await getOwnVoiceCall(callId, session.professional_id);
    if (call && call.status === 'active') await finishVoiceCall(call);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof BudgetUnavailable) return Response.json({ ok: false }, { status: 503 });
    throw e;
  }
}
