import webpush from 'web-push';
import { dbService } from '@/lib/supabase/db';
import type { PushPayload } from './messages';

let vapidReady: boolean | null = null;

/** Configura o Web Push uma vez. false = faltam as chaves VAPID no ambiente. */
export function pushConfigured(): boolean {
  if (vapidReady !== null) return vapidReady;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  vapidReady = !!publicKey && !!privateKey;
  if (vapidReady) webpush.setVapidDetails('mailto:contato@lumepremium.com', publicKey!, privateKey!);
  return vapidReady;
}

/**
 * Envia a notificação para todos os aparelhos da profissional (celular,
 * computador...). Inscrição vencida (404/410) sai do banco. Nunca lança:
 * devolve quantos aparelhos receberam.
 */
export async function pushToProfessional(professionalId: string, payload: PushPayload): Promise<number> {
  if (!pushConfigured()) return 0;
  try {
    const subs = await dbService.getPushSubscriptionsByProfessional(professionalId);
    if (!subs?.length) return 0;
    const body = JSON.stringify(payload);
    const results = await Promise.allSettled(subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, body);
        return true;
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await dbService.removePushSubscription(sub.endpoint);
        } else {
          console.error('[push] Erro ao enviar notificação:', err);
        }
        return false;
      }
    }));
    return results.filter(r => r.status === 'fulfilled' && r.value).length;
  } catch (e) {
    console.error('[push] Falha geral no envio:', e);
    return 0;
  }
}
