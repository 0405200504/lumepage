'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import {
  findUazapiChats, findUazapiMessages, markUazapiChatRead, sendWhatsAppText, sendUazapiMedia,
  requestUazapiHistorySync, getUazapiChatAvatar, type InboxMessage,
} from '@/lib/uazapi';
import {
  listInboxMessages, upsertInboxMessages, toInboxRow, fromInboxRow, lastInboxMessageByChat, inboxStoreReady,
} from '@/lib/whatsapp/inbox-store';

// Nada de `export type` aqui: num módulo 'use server' o Next reescreve os
// exports e o re-export de tipo vira referência de valor em runtime
// ("ReferenceError: InboxChat is not defined"). Os tipos vivem em lib/uazapi e
// a tela importa de lá.

const PAGE = 60;
const THIRTY_DAYS_MS = 30 * 86_400_000;

/**
 * Credenciais da instância desta profissional. `mutating` recusa a sessão de
 * suporte em modo leitura — o admin entrou para ver, não para mandar mensagem
 * no WhatsApp da cliente.
 */
async function getCreds(mutating = false): Promise<{ url: string; token: string; pid: string } | null> {
  try {
    const session = await authService.getCurrentUser('pro');
    if (!session?.professional_id) return null;
    if (mutating && session.impersonated_by && session.readonly) return null;

    const settings = await dbService.getWhatsAppSettings(session.professional_id).catch(() => null);
    if (!settings?.uazapi_url || !settings?.uazapi_token) return null;
    return { url: settings.uazapi_url, token: settings.uazapi_token, pid: session.professional_id };
  } catch {
    return null;
  }
}

export async function listChatsAction(opts: { search?: string; offset?: number } = {}) {
  const creds = await getCreds();
  if (!creds) return { success: false as const, chats: [], total: 0, error: 'WhatsApp não conectado.' };

  const res = await findUazapiChats(creds.url, creds.token, {
    search: opts.search,
    offset: opts.offset ?? 0,
    limit: 40,
  });
  if (!res.success) return { success: false as const, chats: [], total: 0, error: res.error };

  // Segundo sinal de "ela já respondeu": a última mensagem que GUARDAMOS do
  // chat é dela. Cobre o caso em que a uazapi não identifica o remetente.
  try {
    const withTs = res.chats.filter(c => c.lastMessageAt);
    if (withTs.length) {
      const notBefore = Math.min(...withTs.map(c => c.lastMessageAt as number)) - 60_000;
      const last = await lastInboxMessageByChat(creds.pid, withTs.map(c => c.chatid), notBefore);
      for (const chat of res.chats) {
        const mine = last.get(chat.chatid);
        if (mine?.from_me && chat.lastMessageAt && mine.timestamp >= chat.lastMessageAt - 5_000) {
          chat.lastFromMe = true;
          chat.unread = 0;
        }
      }
    }
  } catch { /* best-effort */ }

  return { success: true as const, chats: res.chats, total: res.total };
}

// Primeira abertura de um chat nesta instância da função: puxa páginas extras
// da uazapi até cobrir 30 dias. Depois disso o banco já tem tudo.
const backfilled = new Map<string, number>();
const BACKFILL_TTL_MS = 15 * 60_000;

/**
 * Mensagens de uma conversa.
 *  - sem opções: primeira carga (uazapi ao vivo + nosso banco);
 *  - `since`: polling — o que mudou desde então (mensagens novas e recibos);
 *  - `before`: página para cima, só do banco (a uazapi não tem mais que 7 dias).
 */
export async function listMessagesAction(chatid: string, opts: { before?: number; since?: number } = {}) {
  const creds = await getCreds();
  if (!creds) return { success: false as const, messages: [] as InboxMessage[], hasMore: false, storeReady: false, error: 'WhatsApp não conectado.' };

  if (opts.before) {
    const rows = await listInboxMessages(creds.pid, chatid, { before: opts.before, limit: PAGE });
    return { success: true as const, messages: rows.map(fromInboxRow), hasMore: rows.length >= PAGE, storeReady: inboxStoreReady() };
  }

  const live = await findUazapiMessages(creds.url, creds.token, chatid, { limit: 100 });
  let stored = 0;
  if (live.success && live.messages.length) {
    stored = await upsertInboxMessages(live.messages.map(m => toInboxRow(creds.pid, m, chatid)));

    const key = `${creds.pid}:${chatid}`;
    const lastFill = backfilled.get(key) ?? 0;
    if (stored && !opts.since && Date.now() - lastFill > BACKFILL_TTL_MS) {
      backfilled.set(key, Date.now());
      let offset = live.nextOffset;
      let more = live.hasMore;
      let oldest = live.messages[0]?.timestamp ?? Date.now();
      for (let i = 0; i < 4 && more && oldest > Date.now() - THIRTY_DAYS_MS; i++) {
        const page = await findUazapiMessages(creds.url, creds.token, chatid, { limit: 100, offset });
        if (!page.success || !page.messages.length) break;
        await upsertInboxMessages(page.messages.map(m => toInboxRow(creds.pid, m, chatid)));
        oldest = page.messages[0].timestamp;
        offset = page.nextOffset;
        more = page.hasMore;
      }
    }
  }

  // Recibos mudam o status de mensagens antigas: no polling, traz 2 h de folga.
  const since = opts.since ? Math.max(0, opts.since - 2 * 3_600_000) : undefined;
  const rows = await listInboxMessages(creds.pid, chatid, { since, limit: opts.since ? 200 : PAGE });

  if (!rows.length) {
    // Banco sem a migração v45 (ou chat vazio): mostra o que a uazapi tem.
    if (!live.success) return { success: false as const, messages: [] as InboxMessage[], hasMore: false, storeReady: false, error: live.error };
    const messages = since ? live.messages.filter(m => m.timestamp >= since) : live.messages.slice(-PAGE);
    return { success: true as const, messages, hasMore: !since && (live.hasMore || live.messages.length > PAGE), storeReady: false };
  }

  return {
    success: true as const,
    messages: rows.map(fromInboxRow),
    hasMore: !since && rows.length >= PAGE,
    storeReady: true,
  };
}

// Um pedido de histórico por chat a cada 2 min — a própria uazapi pede para
// não repetir enquanto o celular não responde.
const historyAsked = new Map<string, number>();
const HISTORY_COOLDOWN_MS = 2 * 60_000;

/**
 * Pede ao celular da profissional as mensagens anteriores à mais antiga que
 * temos. Elas chegam depois pelo webhook (evento `history`) e aparecem no
 * próximo polling — se o WhatsApp do aparelho estiver aberto ou em segundo plano.
 */
export async function requestHistoryAction(chatid: string, anchorMessageId?: string | null) {
  const creds = await getCreds();
  if (!creds) return { success: false as const, error: 'WhatsApp não conectado.' };

  const key = `${creds.pid}:${chatid}`;
  const last = historyAsked.get(key) ?? 0;
  if (Date.now() - last < HISTORY_COOLDOWN_MS) {
    return { success: true as const, alreadyAsked: true };
  }
  historyAsked.set(key, Date.now());

  const res = await requestUazapiHistorySync(creds.url, creds.token, chatid, { anchorMessageId, count: 100 });
  if (!res.success) {
    historyAsked.delete(key);
    return { success: false as const, error: res.error ?? 'A uazapi não aceitou o pedido.' };
  }
  return { success: true as const, alreadyAsked: false };
}

export async function sendChatMessageAction(chatid: string, text: string) {
  const creds = await getCreds(true);
  if (!creds) return { success: false as const, error: 'Sem permissão para enviar mensagens.' };
  if (!text.trim()) return { success: false as const, error: 'Mensagem vazia.' };

  const ok = await sendWhatsAppText(creds.url, creds.token, chatid, text.trim());
  return ok ? { success: true as const } : { success: false as const, error: 'A uazapi não enviou a mensagem.' };
}

/**
 * Envia um arquivo escolhido no computador. Chega como data URL do navegador —
 * a uazapi aceita base64 direto, então não precisamos hospedar nada.
 */
export async function sendChatMediaAction(
  chatid: string,
  dataUrl: string,
  kind: 'image' | 'video' | 'audio' | 'document',
  opts: { caption?: string; fileName?: string } = {}
) {
  const creds = await getCreds(true);
  if (!creds) return { success: false as const, error: 'Sem permissão para enviar mensagens.' };

  const res = await sendUazapiMedia(creds.url, creds.token, chatid, kind, dataUrl, {
    text: opts.caption,
    docName: opts.fileName,
  });
  return res.success ? { success: true as const } : { success: false as const, error: res.error };
}

export async function markChatReadAction(chatid: string, read = true) {
  const creds = await getCreds(true);
  if (!creds) return { success: false as const };
  const ok = await markUazapiChatRead(creds.url, creds.token, chatid, read);
  return { success: ok };
}

// Foto do contato: a lista da uazapi nem sempre traz. Cache por 6 h (1 h
// quando não há foto) para não bater em /chat/avatar a cada polling.
const avatarCache = new Map<string, { url: string | null; at: number }>();

export async function getChatAvatarsAction(chatids: string[]) {
  const creds = await getCreds();
  const avatars: Record<string, string | null> = {};
  if (!creds) return { avatars };

  const ids = Array.from(new Set(chatids)).slice(0, 30);
  const pending: string[] = [];
  for (const id of ids) {
    const hit = avatarCache.get(`${creds.pid}:${id}`);
    const ttl = hit?.url ? 6 * 3_600_000 : 3_600_000;
    if (hit && Date.now() - hit.at < ttl) avatars[id] = hit.url;
    else pending.push(id);
  }

  // Quatro por vez — rápido o bastante sem afogar a instância.
  for (let i = 0; i < pending.length; i += 4) {
    await Promise.all(pending.slice(i, i + 4).map(async id => {
      const url = await getUazapiChatAvatar(creds.url, creds.token, id);
      avatarCache.set(`${creds.pid}:${id}`, { url, at: Date.now() });
      avatars[id] = url;
    }));
  }
  return { avatars };
}
