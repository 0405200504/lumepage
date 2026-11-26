import { dbService } from '@/lib/supabase/db';
import { checkUazapiStatus, configureUazapiWebhook, getUazapiQRCode, type UazapiStatusResult } from '@/lib/uazapi';
import { purgeOldInboxMessages } from '@/lib/whatsapp/inbox-store';
import { HEALTH_KEY, parseHealthState, decideHealthAlert, type HealthState } from '@/lib/whatsapp/health-state';
import type { WhatsAppSettings } from '@/types/database';
import webpush from 'web-push';

// Configuração do Web Push (mesma de app/actions/booking.ts)
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:contato@lumepremium.com',
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// O estado fica na própria whatsapp_conversations (lib/whatsapp/health-state.ts).
const REASSERT_MS = 60 * 60 * 1000;       // re-registra o webhook a cada ~60min (reseta circuit-breaker da uazapi)
const ERROR_GRACE = 3;                    // rodadas seguidas sem resposta do servidor antes de tratar como queda

export type HealthResult = Record<string, unknown>;

/**
 * Monitor de saúde do bot. Para cada profissional com bot ativo:
 *  1. confere se a instância uazapi está conectada — e, se o servidor só pausou a
 *     sessão (`hibernated`, uazapi 3.x), pede a reconexão: o pareamento está
 *     guardado e ela volta sem QR Code, sem ninguém abrir o painel;
 *  2. confere a config do webhook e RE-REGISTRA sozinho se errada/ausente, além de
 *     re-afirmar a cada ~60min para resetar circuit-breaker de entrega da uazapi
 *     (causa de o webhook parar de ser chamado mesmo com config aparentemente ok);
 *  3. envia push à profissional quando há algo que exige ação humana (instância
 *     desconectada), com dedupe; e avisa quando normaliza. Quando quem recusa é
 *     o servidor (sem vaga no plano), o aviso é outro e sai uma vez só: não
 *     adianta pedir para ela ler um QR Code que o servidor não vai entregar.
 *
 * Best-effort: nunca lança — pode ser chamado de dentro de outro cron sem risco.
 */
export async function runWhatsAppHealthCheck(): Promise<HealthResult[]> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const results: HealthResult[] = [];
  let allSettings: WhatsAppSettings[] = [];
  try {
    allSettings = await dbService.getAllWhatsAppSettingsForCron();
  } catch {
    return results;
  }

  // Faxina do histórico da caixa de entrada (90 dias), aproveitando a cadência.
  try {
    const purged = await purgeOldInboxMessages();
    if (purged) console.log('[whatsapp/health] mensagens antigas apagadas:', purged);
  } catch { /* best-effort */ }

  for (const s of allSettings) {
    // Monitora toda instância com credenciais: além das automações, a aba
    // WhatsApp depende do webhook para guardar as conversas (histórico de 30+
    // dias, fotos). Sem o webhook no ar, a caixa de entrada fica cega.
    if (!s.uazapi_url || !s.uazapi_token) continue;
    const pid = s.professional_id;
    try {
      const state = await loadState(pid);
      const now = Date.now();

      let status: UazapiStatusResult = await checkUazapiStatus(s.uazapi_url, s.uazapi_token).catch(() => ({ status: 'error' as const }));
      const hibernated = status.status === 'hibernated';
      let serverFull = false;
      if (hibernated) {
        const wake = await getUazapiQRCode(s.uazapi_url, s.uazapi_token).catch(() => null);
        if (wake?.success && wake.alreadyConnected) status = { status: 'open' };
        else if (wake?.limitReached) serverFull = true;
      }
      const connected = status.status === 'open';

      // Servidor não respondeu (ou respondeu algo que não dá para ler): pode ser
      // passageiro. Sem informação, não muda o estado nem avisa ninguém — só
      // depois de algumas rodadas seguidas isso conta como queda.
      if (status.status === 'error') {
        state.errors = (state.errors || 0) + 1;
        if (state.errors < ERROR_GRACE) {
          await saveState(pid, state);
          results.push({ pid, connected: false, skipped: 'sem resposta do servidor', errors: state.errors });
          continue;
        }
      } else {
        state.errors = 0;
      }

      const webhookOk = connected ? await isWebhookHealthy(s) : false;

      let healed = false;
      const needsReassert = now - (state.reassertAt || 0) > REASSERT_MS;
      if (connected && appUrl && (!webhookOk || needsReassert)) {
        const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${pid}&secret=${s.webhook_secret}`;
        const res = await configureUazapiWebhook(s.uazapi_url, s.uazapi_token, webhookUrl).catch(() => ({ success: false }));
        healed = !!res.success;
        if (healed) state.reassertAt = now;
      }

      const { problem, push, alertedAt } = decideHealthAlert(
        { connected, hibernated, serverFull, webhookOk: webhookOk || healed },
        state,
        now,
      );
      const pushed = push ? await sendHealthPush(pid, push) : false;

      state.alertedAt = alertedAt;
      state.status = problem || 'ok';
      await saveState(pid, state);
      results.push({ pid, connected, webhookOk, healed, problem, pushed });
    } catch (e) {
      console.error('[whatsapp/health] erro pid:', pid, e);
      results.push({ pid, error: e instanceof Error ? e.message : String(e) });
    }
  }
  console.log('[whatsapp/health] verificados:', results.length);
  return results;
}

/** Confere se o webhook na uazapi está ativo, apontando para nós e com o evento certo. */
async function isWebhookHealthy(s: WhatsAppSettings): Promise<boolean> {
  try {
    const r = await fetch(`${s.uazapi_url}/webhook`, {
      headers: { token: s.uazapi_token },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return false;
    const parsed = await r.json();
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries.some((w: Record<string, unknown>) => {
      const url = typeof w?.url === 'string' ? w.url : '';
      const events = Array.isArray(w?.events) ? (w.events as string[]) : [];
      return w?.enabled === true
        && url.includes(`pid=${s.professional_id}`)
        && url.includes(`secret=${s.webhook_secret}`)
        && events.includes('messages')
        // Recibos de leitura: sem eles o "tique azul" e o "não lida" ficam velhos.
        && events.includes('messages_update');
    });
  } catch {
    return false;
  }
}

async function loadState(pid: string): Promise<HealthState> {
  try {
    const conv = await dbService.getWhatsAppConversation(pid, HEALTH_KEY);
    return parseHealthState(conv?.messages);
  } catch { /* estado novo */ }
  return { status: 'ok', alertedAt: 0, reassertAt: 0 };
}

async function saveState(pid: string, state: HealthState): Promise<void> {
  await dbService.upsertWhatsAppConversation(pid, HEALTH_KEY, [
    { role: 'user' as const, content: JSON.stringify(state), at: Date.now() },
  ]).catch(() => {});
}

const ALERTS: Record<string, { title: string; body: string }> = {
  disconnected: {
    title: '⚠️ Seu WhatsApp desconectou',
    body: 'As mensagens automáticas pararam de sair. Abra Mensagens automáticas e leia o QR Code para reconectar.',
  },
  webhook_failed: {
    title: '⚠️ WhatsApp sem receber mensagens',
    body: 'Não consegui religar o recebimento sozinho. Abra Mensagens automáticas e reconecte seu número.',
  },
  server_limit: {
    title: '⚠️ Mensagens automáticas em pausa',
    body: 'O serviço de WhatsApp do Lume está fora do ar e suas mensagens não estão saindo. Não é nada com o seu número. Avisamos aqui quando voltar.',
  },
  recovered: {
    title: '✅ WhatsApp normalizado',
    body: 'A conexão voltou e as mensagens automáticas estão saindo de novo.',
  },
};

/** Envia push para todas as inscrições da profissional (mesmo padrão de booking.ts). */
async function sendHealthPush(pid: string, kind: string): Promise<boolean> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  const alert = ALERTS[kind];
  if (!alert) return false;
  try {
    const subs = await dbService.getPushSubscriptionsByProfessional(pid);
    if (!subs || !subs.length) return false;
    const payload = JSON.stringify({ title: alert.title, body: alert.body, url: '/dashboard/whatsapp' });
    let any = false;
    await Promise.allSettled(subs.map(async (sub) => {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } }, payload);
        any = true;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) await dbService.removePushSubscription(sub.endpoint);
        else console.error('[whatsapp/health] push erro:', err);
      }
    }));
    return any;
  } catch (e) {
    console.error('[whatsapp/health] falha ao enviar push:', e);
    return false;
  }
}
