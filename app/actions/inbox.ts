'use server';

import { authService } from '@/lib/auth/auth';
import { dbService } from '@/lib/supabase/db';
import {
  findUazapiChats, findUazapiMessages, markUazapiChatRead, sendWhatsAppText, sendUazapiMedia,
  type InboxChat, type InboxMessage,
} from '@/lib/uazapi';

export type { InboxChat, InboxMessage };

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
  return res.success
    ? { success: true as const, chats: res.chats, total: res.total }
    : { success: false as const, chats: [], total: 0, error: res.error };
}

export async function listMessagesAction(chatid: string, offset = 0) {
  const creds = await getCreds();
  if (!creds) return { success: false as const, messages: [], hasMore: false, error: 'WhatsApp não conectado.' };

  const res = await findUazapiMessages(creds.url, creds.token, chatid, { offset, limit: 50 });
  return res.success
    ? { success: true as const, messages: res.messages, hasMore: res.hasMore }
    : { success: false as const, messages: [], hasMore: false, error: res.error };
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
