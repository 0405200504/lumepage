import { dbService } from '@/lib/supabase/db';
import { checkUazapiStatus, configureUazapiWebhook } from '@/lib/uazapi';
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

// Estado guardado na própria whatsapp_conversations (sem migração), com prefixo
// _debug_ para ser filtrado da lista de conversas do painel
// (getAllWhatsAppConversations exclui client_phone like '_debug_%').
const HEALTH_KEY = '_debug_health_state';
const REALERT_MS = 6 * 60 * 60 * 1000;   // re-alerta o mesmo problema a cada 6h
const REASSERT_MS = 60 * 60 * 1000;       // re-registra o webhook a cada ~60min (reseta circuit-breaker da uazapi)

type HealthState = { status: string; alertedAt: number; reassertAt: number };
export type HealthResult = Record<string, unknown>;

/**
 * Monitor de saúde do bot. Para cada profissional com bot ativo:
 *  1. confere se a instância uazapi está conectada;
 *  2. confere a config do webhook e RE-REGISTRA sozinho se errada/ausente, além de
 *     re-afirmar a cada ~60min para resetar circuit-breaker de entrega da uazapi
 *     (causa de o webhook parar de ser chamado mesmo com config aparentemente ok);
 *  3. envia push à profissional quando há algo que exige ação humana (instância
 *     desconectada), com dedupe; e avisa quando normaliza.
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

  for (const s of allSettings) {
    // Monitora quem tem alguma automação ligada (ou a IA, quando voltar):
    // é a conexão que faz os disparos chegarem na cliente.
    const usesWhatsApp = s.bot_enabled
      || s.automation_booking_enabled
      || s.automation_day_before_enabled
      || s.automation_day_of_enabled
      || s.automation_5days_enabled
      || s.automation_followup_enabled;
    if (!usesWhatsApp) continue;
    const pid = s.professional_id;
    try {
      const state = await loadState(pid);
      const now = Date.now();

      const status = await checkUazapiStatus(s.uazapi_url, s.uazapi_token).catch(() => ({ status: 'error' as const }));
      const connected = status.status === 'open';

      const webhookOk = connected ? await isWebhookHealthy(s) : false;

      let healed = false;
      const needsReassert = now - (state.reassertAt || 0) > REASSERT_MS;
      if (connected && appUrl && (!webhookOk || needsReassert)) {
        const webhookUrl = `${appUrl}/api/whatsapp/webhook?pid=${pid}&secret=${s.webhook_secret}`;
        const res = await configureUazapiWebhook(s.uazapi_url, s.uazapi_token, webhookUrl).catch(() => ({ success: false }));
        healed = !!res.success;
        if (healed) state.reassertAt = now;
      }

      const problem = !connected
        ? 'disconnected'
        : (!webhookOk && !healed)
          ? 'webhook_failed'
          : null;

      let pushed = false;
      if (problem) {
        const changed = state.status !== problem;
        const stale = now - (state.alertedAt || 0) > REALERT_MS;
        if (changed || stale) {
          pushed = await sendHealthPush(pid, problem);
          state.alertedAt = now;
        }
      } else if (state.status && state.status !== 'ok') {
        pushed = await sendHealthPush(pid, 'recovered');
        state.alertedAt = 0;
      }

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
        && events.includes('messages');
    });
  } catch {
    return false;
  }
}

async function loadState(pid: string): Promise<HealthState> {
  try {
    const conv = await dbService.getWhatsAppConversation(pid, HEALTH_KEY);
    const raw = conv?.messages?.slice(-1)[0]?.content;
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HealthState>;
      return { status: parsed.status || 'ok', alertedAt: parsed.alertedAt || 0, reassertAt: parsed.reassertAt || 0 };
    }
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
    title: '⚠️ WhatsApp do bot desconectou',
    body: 'O bot parou de responder porque a conexão caiu. Abra Configurações → WhatsApp e reconecte escaneando o QR.',
  },
  webhook_failed: {
    title: '⚠️ Bot não está recebendo mensagens',
    body: 'O webhook do WhatsApp falhou e não consegui recadastrar sozinho. Abra Configurações → WhatsApp e reconecte.',
  },
  recovered: {
    title: '✅ WhatsApp do bot normalizado',
    body: 'A conexão e o recebimento de mensagens voltaram ao normal.',
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
    const payload = JSON.stringify({ title: alert.title, body: alert.body, url: '/dashboard/settings' });
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
