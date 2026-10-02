import { normalizeMessage, type InboxMessage } from '@/lib/uazapi';
import { upsertInboxMessages, applyInboxReceipt, toInboxRow } from '@/lib/whatsapp/inbox-store';
import { cacheInboxMediaNow } from '@/lib/whatsapp/inbox-media';
import type { WhatsAppSettings } from '@/types/database';

/**
 * Entrada da caixa de entrada: transforma cada evento do webhook da uazapi em
 * linhas do nosso histórico. Roda ANTES do bot e nunca lança.
 *
 *  • `messages`         → grava a mensagem (recebida ou enviada, qualquer tipo)
 *                         e já copia a mídia para o Storage.
 *  • `messages_update`  → aplica o recibo (entregue/lida) às mensagens citadas.
 *  • `history`          → grava o lote de mensagens antigas (pareamento ou
 *                         /message/history-sync). Mídia fica para quando abrir.
 *
 * Devolve 'done' quando o evento não interessa ao bot (recibo, histórico…).
 */
export type InboxWebhookBody = {
  EventType?: string;
  message?: Record<string, unknown>;
  messages?: unknown[];
  event?: Record<string, unknown> | string;
  state?: string;
  type?: string;
  [key: string]: unknown;
};

export async function recordInboxEvent(
  professionalId: string,
  settings: Pick<WhatsAppSettings, 'uazapi_url' | 'uazapi_token'>,
  body: InboxWebhookBody,
): Promise<'done' | 'continue'> {
  const ev = String(body.EventType || '').toLowerCase();
  try {
    if (ev === 'messages_update') {
      const event = (typeof body.event === 'object' && body.event) ? body.event : {};
      const ids = Array.isArray(event.MessageIDs) ? event.MessageIDs.filter((v): v is string => typeof v === 'string') : [];
      const state = String(body.state || event.Type || '');
      if (ids.length && state) await applyInboxReceipt(professionalId, ids, state);
      return 'done';
    }

    if (ev === 'history') {
      const list = Array.isArray(body.messages) ? body.messages : [];
      if (list.length) {
        const rows = list
          .map(m => normalizeMessage(m as Record<string, unknown>))
          .filter(m => m.id && m.chatid && m.timestamp > 0 && m.kind !== 'skip')
          .slice(0, 500)
          .map(m => toInboxRow(professionalId, m));
        const n = await upsertInboxMessages(rows);
        console.log('[inbox] histórico gravado:', n, 'de', list.length);
      }
      return 'done';
    }

    // Eventos que não carregam mensagem: nada a guardar, nada para o bot.
    if (ev && ev !== 'messages' && ev !== 'message') return 'done';

    if (body.message && typeof body.message === 'object') {
      const m: InboxMessage = normalizeMessage(body.message);
      if (!m.timestamp) m.timestamp = Date.now();
      if (m.id && m.chatid && m.kind !== 'skip') {
        const n = await upsertInboxMessages([toInboxRow(professionalId, m)]);
        // Copia a mídia agora — em 2 dias a uazapi descarta o arquivo.
        if (n && m.hasMedia && settings.uazapi_url && settings.uazapi_token) {
          await cacheInboxMediaNow(professionalId, settings, m.id, m.uazapiId || null);
        }
      }
    }
  } catch (e) {
    console.warn('[inbox] falha ao gravar evento', ev, e instanceof Error ? e.message : e);
  }
  return 'continue';
}
