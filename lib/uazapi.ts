import {
  simplifyMessageType, kindHasMedia, normalizeStatus, senderIsOwner, mimetypeFromContent,
  type InboxKind, type InboxStatus,
} from '@/lib/whatsapp/inbox-shared';

/**
 * Envia indicador "digitando..." no WhatsApp e aguarda o delay antes de retornar.
 * Best-effort: engole erros para não quebrar o bot se o endpoint não existir.
 */
export async function sendTypingPresence(
  baseUrl: string,
  token: string,
  phone: string,
  durationMs: number
): Promise<void> {
  try {
    await fetch(`${baseUrl}/chat/presence`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, presence: 'composing' }),
      signal: AbortSignal.timeout(5000),
    });
    await new Promise(r => setTimeout(r, durationMs));
  } catch {
    // silencioso — o bot funciona mesmo se o endpoint não existir
  }
}

/** Extrai o número de telefone do JID do WhatsApp (remove @s.whatsapp.net). */
export function phoneFromJid(jid: string): string {
  return jid.replace(/@s\.whatsapp\.net$/, '').replace(/@g\.us$/, '');
}

/** Envia uma mensagem de texto via uazapi. Retorna true se enviado com sucesso. */
export async function sendWhatsAppText(
  baseUrl: string,
  token: string,
  phone: string,
  text: string
): Promise<boolean> {
  try {
    // Timeout obrigatório: sem ele, um /send/text lento ou travado da uazapi pendura
    // o fetch indefinidamente e o Vercel mata a função (60s) antes de salvar/concluir.
    const res = await fetch(`${baseUrl}/send/text`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.error('[uazapi] sendText falhou:', res.status, await res.text());
    }
    return res.ok;
  } catch (e) {
    console.error('[uazapi] Erro ao enviar mensagem:', e);
    return false;
  }
}

/**
 * Envia um documento (ex.: PDF) via uazapi. A uazapi baixa o arquivo da URL
 * pública informada em `fileUrl` — a URL precisa estar acessível na internet.
 * Tenta POST /send/media (formato uazapiGO) e cai para /send/document.
 */
export async function sendWhatsAppDocument(
  baseUrl: string,
  token: string,
  phone: string,
  fileUrl: string,
  docName: string,
  caption?: string
): Promise<boolean> {
  const headers = { token, 'Content-Type': 'application/json' };
  const attempts: Array<{ path: string; body: Record<string, unknown> }> = [
    { path: '/send/media', body: { number: phone, type: 'document', file: fileUrl, docName, text: caption || '' } },
    { path: '/send/document', body: { number: phone, file: fileUrl, docName, filename: docName, caption: caption || '' } },
  ];
  for (const { path, body } of attempts) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) return true;
      console.error(`[uazapi] sendDocument ${path} falhou:`, res.status, (await res.text().catch(() => '')).slice(0, 200));
    } catch (e) {
      console.error(`[uazapi] Erro ao enviar documento (${path}):`, e);
    }
  }
  return false;
}

/** Configura o webhook da instância na uazapi para receber eventos de mensagem. */
export async function configureUazapiWebhook(
  baseUrl: string,
  token: string,
  webhookUrl: string
): Promise<{ success: boolean; error?: string; debug?: string }> {
  const headers = { token, 'Content-Type': 'application/json' };
  const logs: string[] = [];

  // 1. Busca o webhook existente para obter o ID e o estado atual
  let existingId: string | null = null;
  try {
    const getRes = await fetch(`${baseUrl}/webhook`, { headers, signal: AbortSignal.timeout(6000) });
    const getText = await getRes.text().catch(() => '');
    logs.push(`GET /webhook → ${getRes.status}: ${getText.slice(0, 300)}`);
    if (getRes.ok) {
      let parsed: unknown;
      try { parsed = JSON.parse(getText); } catch { /* ignore */ }
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      const first = entries[0] as Record<string, unknown> | null;
      existingId = (first?.id ?? null) as string | null;
    }
  } catch (e) {
    logs.push(`GET /webhook → exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 2. Payload completo — addUrlEvents:true é o que manda eventos para a URL.
  // `events` inclui 'messages' (plural) porque é o EventType realmente entregue
  // por esta instância (fork uazapiGO); manter só 'message' já levou a uazapi a
  // parar de chamar o webhook. Reenviar este POST também reseta o estado de
  // entrega quando a uazapi entra em circuit-breaker após falhas (ex.: deploys).
  const payload = {
    url: webhookUrl,
    webhookUrl,
    enabled: true,
    addUrlEvents: true,
    addUrlTypesMessages: true,
    // 'messages_update' traz os recibos de entrega/leitura e 'history' os
    // lotes de mensagens antigas (pareamento e /message/history-sync) — os
    // dois alimentam a caixa de entrada do painel.
    events: ['messages', 'message', 'messages_update', 'history'],
    excludeMessages: [],
  };

  // 3a. Se existe ID: tenta DELETE do existente e depois POST com novo
  if (existingId) {
    try {
      const delRes = await fetch(`${baseUrl}/webhook/${existingId}`, {
        method: 'DELETE', headers, signal: AbortSignal.timeout(6000),
      });
      logs.push(`DELETE /webhook/${existingId} → ${delRes.status}`);
    } catch (e) {
      logs.push(`DELETE /webhook/${existingId} → exception: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // 3b. POST para criar novo webhook limpo
  try {
    const postRes = await fetch(`${baseUrl}/webhook`, {
      method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    });
    const postText = await postRes.text().catch(() => '');
    logs.push(`POST /webhook → ${postRes.status}: ${postText.slice(0, 200)}`);
    if (postRes.ok) return { success: true, debug: logs.join(' | ') };
  } catch (e) {
    logs.push(`POST /webhook → exception: ${e instanceof Error ? e.message : String(e)}`);
  }

  // 3c. Fallback: PUT /webhook (sem ID)
  try {
    const putRes = await fetch(`${baseUrl}/webhook`, {
      method: 'PUT', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(8000),
    });
    const putText = await putRes.text().catch(() => '');
    logs.push(`PUT /webhook → ${putRes.status}: ${putText.slice(0, 200)}`);
    if (putRes.ok) return { success: true, debug: logs.join(' | ') };
    return { success: false, error: `uazapi retornou ${putRes.status}`, debug: logs.join(' | ') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro de rede';
    logs.push(`PUT /webhook → exception: ${msg}`);
  }

  return { success: false, error: 'uazapi não aceitou configuração de webhook via API. Configure manualmente no painel da uazapi.', debug: logs.join(' | ') };
}

/**
 * Busca o QR code (ou pair code) para conectar/reconectar a instância.
 * Confirmado por inspeção direta: o endpoint real é POST /instance/connect
 * (não GET) e a resposta tem o formato:
 *   { connected: boolean, instance: { status, qrcode, paircode, ... } }
 * Quando já conectado, `qrcode`/`paircode` vêm vazios — não é erro.
 */
export async function getUazapiQRCode(
  baseUrl: string,
  token: string
): Promise<{ success: boolean; qrcode?: string | null; paircode?: string | null; alreadyConnected?: boolean; error?: string; debug?: string }> {
  try {
    const res = await fetch(`${baseUrl}/instance/connect`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { success: false, error: `uazapi retornou ${res.status}`, debug: text.slice(0, 300) };

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      return { success: false, error: 'Resposta inválida da uazapi.', debug: text.slice(0, 300) };
    }

    const instance = data.instance as Record<string, unknown> | undefined;
    const qrcode = [data.qrcode, instance?.qrcode].find(v => typeof v === 'string' && v.length > 20) as string | undefined;
    const paircode = [data.paircode, instance?.paircode].find(v => typeof v === 'string' && v.length > 0) as string | undefined;

    if (qrcode) return { success: true, qrcode, debug: text.slice(0, 200) };
    if (paircode) return { success: true, paircode, debug: text.slice(0, 200) };

    const instanceStatus = (instance?.status as string | undefined)?.toLowerCase() ?? '';
    const connected = data.connected === true || ['connected', 'open'].includes(instanceStatus);
    if (connected) return { success: true, alreadyConnected: true, debug: text.slice(0, 200) };

    return { success: false, error: 'uazapi não retornou QR code nem código de pareamento.', debug: text.slice(0, 300) };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}

/** Verifica o status da conexão da instância WhatsApp. */
export async function checkUazapiStatus(
  baseUrl: string,
  token: string
): Promise<{ status: 'open' | 'connecting' | 'close' | 'qr' | 'error'; rawJson?: string }> {
  try {
    const res = await fetch(`${baseUrl}/instance/status`, {
      headers: { token },
      signal: AbortSignal.timeout(8000),
    });
    const text = await res.text();
    if (!res.ok) return { status: 'error', rawJson: text.slice(0, 200) };

    // Parse manual — evita throw em respostas HTML ou inesperadas
    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch { return { status: 'error', rawJson: text.slice(0, 200) }; }

    // Formato real confirmado: { instance: { status: "connected" }, status: { connected: true, ... } }
    const instance = data.instance as Record<string, unknown> | undefined;
    const statusObj = data.status;
    const connectedBool = (typeof statusObj === 'object' && statusObj !== null)
      ? (statusObj as Record<string, unknown>).connected
      : undefined;
    if (connectedBool === true) return { status: 'open', rawJson: text.slice(0, 300) };

    const instanceStatus = ((instance?.status as string | undefined) ?? '').toLowerCase();
    if (['connected', 'open', 'online'].includes(instanceStatus)) return { status: 'open', rawJson: text.slice(0, 300) };
    if (instanceStatus.includes('connecting')) return { status: 'connecting', rawJson: text.slice(0, 300) };
    if (instanceStatus.includes('qr')) return { status: 'qr', rawJson: text.slice(0, 300) };
    if (['close', 'closed', 'disconnected', 'logout', 'logged_out'].some(v => instanceStatus.includes(v))) {
      return { status: 'close', rawJson: text.slice(0, 300) };
    }

    return { status: 'error', rawJson: text.slice(0, 300) };
  } catch (e) {
    return { status: 'error', rawJson: e instanceof Error ? e.message : String(e) };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Administração do servidor (provisionamento automático de instância)
//
// O servidor uazapi é um só (UAZAPI_SERVER_URL) e cada profissional ganha uma
// instância própria dentro dele, identificada pelo token devolvido na criação.
// Endpoints confirmados na spec OpenAPI da uazapi (docs.uazapi.com):
//   POST   /instance/create  → header `admintoken`, body { name } → { token, ... }
//   GET    /instance/all     → header `admintoken`
//   DELETE /instance         → header `token` (o da própria instância)
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_URL = (process.env.UAZAPI_SERVER_URL || '').trim().replace(/\/$/, '');
const ADMIN_TOKEN = (process.env.UAZAPI_ADMIN_TOKEN || '').trim();

/** true quando o servidor pode criar instâncias sozinho (sem a profissional colar nada). */
export function uazapiAdminConfigured(): boolean {
  return !!(ADMIN_URL && ADMIN_TOKEN);
}

export type CreateInstanceResult =
  | { success: true; url: string; token: string }
  | { success: false; error: string; limitReached?: boolean; debug?: string };

/**
 * Cria uma instância no servidor uazapi e devolve o token dela.
 * `name` precisa ser único no servidor — quem chama monta com o id da profissional.
 * Os adminFields guardam de quem é a instância (visível só via admintoken no painel).
 */
export async function createUazapiInstance(
  name: string,
  meta?: { adminField01?: string; adminField02?: string }
): Promise<CreateInstanceResult> {
  if (!uazapiAdminConfigured()) {
    return { success: false, error: 'Provisionamento automático não configurado no servidor.' };
  }
  try {
    const res = await fetch(`${ADMIN_URL}/instance/create`, {
      method: 'POST',
      headers: { admintoken: ADMIN_TOKEN, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, ...meta }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();

    if (!res.ok) {
      // O servidor tem um teto de instâncias contratado (o painel mostra
      // "Limite de dispositivos"). Estourou: é problema de plano, não da cliente.
      const limitReached = /limit|limite|max|exceed|dispositiv/i.test(text) || res.status === 403;
      return {
        success: false,
        limitReached,
        error: limitReached
          ? 'O servidor de WhatsApp atingiu o limite de números conectados.'
          : `A uazapi recusou a criação (HTTP ${res.status}).`,
        debug: text.slice(0, 300),
      };
    }

    let data: Record<string, unknown> = {};
    try { data = JSON.parse(text); } catch {
      return { success: false, error: 'Resposta inválida da uazapi.', debug: text.slice(0, 300) };
    }

    const instance = data.instance as Record<string, unknown> | undefined;
    const token = [data.token, instance?.token].find(v => typeof v === 'string' && v.length > 0) as string | undefined;
    if (!token) return { success: false, error: 'A uazapi criou a instância mas não devolveu o token.', debug: text.slice(0, 300) };

    return { success: true, url: ADMIN_URL, token };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro de rede ao falar com a uazapi.' };
  }
}

/**
 * Desconecta o número da instância sem apagá-la (POST /instance/disconnect,
 * autenticado com o token da própria instância). Depois disso,
 * /instance/connect devolve um QR novo — é o "trocar número" do painel.
 */
export async function disconnectUazapiInstance(baseUrl: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/instance/disconnect`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) console.error('[uazapi] disconnect falhou:', res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error('[uazapi] Erro ao desconectar instância:', e);
    return false;
  }
}

/**
 * Apaga a instância no servidor, liberando o slot do plano. Autentica com o
 * token da própria instância (não com o admintoken) — é o que a spec pede.
 */
export async function deleteUazapiInstance(baseUrl: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/instance`, {
      method: 'DELETE',
      headers: { token },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) console.error('[uazapi] delete instance falhou:', res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error('[uazapi] Erro ao apagar instância:', e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Caixa de entrada (o "WhatsApp Web" dentro do Lume)
//
// A uazapi guarda chats e mensagens do lado dela — mas só por 7 DIAS (e as
// mídias por 2). O Lume lê sob demanda daqui e, em paralelo, guarda tudo que
// chega pelo webhook em whatsapp_inbox_messages (lib/whatsapp/inbox-store.ts)
// para a conversa mostrar 30+ dias. Endpoints (spec OpenAPI 2.4.3 da uazapi):
//   POST /chat/find             → { chats: [...], pagination }
//   POST /message/find          → { messages: [...], hasMore, nextOffset }
//   POST /chat/read             → marca lido/não lido
//   POST /message/download      → { fileURL, mimetype } (URL pública por 2 dias)
//   POST /message/history-sync  → pede ao celular mensagens mais antigas
//   POST /chat/avatar           → { url } da foto do contato
// ═══════════════════════════════════════════════════════════════════════════

/** Uma conversa como o painel precisa dela — o resto do payload da uazapi é ignorado. */
export interface InboxChat {
  chatid: string;
  name: string;
  phone: string;
  image: string | null;
  lastMessageAt: number | null;
  lastPreview: string;
  lastMessageType: string | null;
  /** A última mensagem foi da profissional (então ela já leu a conversa). */
  lastFromMe: boolean;
  unread: number;
  isGroup: boolean;
  pinned: boolean;
  archived: boolean;
}

/** Uma mensagem já normalizada para a bolha da tela. */
export interface InboxMessage {
  /** id do WhatsApp — é a chave em tudo (banco, mídia, recibos). */
  id: string;
  /** id interno da uazapi (r + hex) — só para o download de mídia. */
  uazapiId: string;
  chatid: string;
  fromMe: boolean;
  kind: InboxKind;
  /** messageType original da uazapi, para diagnóstico. */
  rawType: string;
  text: string;
  timestamp: number;
  status: InboxStatus | null;
  senderName: string | null;
  hasMedia: boolean;
  mimetype: string | null;
  /** true quando a mídia já tem cópia no nosso Storage (abre mesmo depois de 7 dias). */
  mediaCached: boolean;
  /** Preenchido quando a última tentativa de baixar a mídia falhou. */
  mediaError: string | null;
  quotedId: string | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && v > 0 ? v : null);
const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** Timestamps da uazapi vêm em ms; se algum vier em segundos, corrige. */
export const toMs = (v: unknown): number | null => {
  const n = num(v);
  if (n === null) return null;
  return n < 1e12 ? n * 1000 : n;
};

function normalizeChat(raw: Record<string, unknown>): InboxChat {
  const chatid = str(raw.wa_chatid) || str(raw.id);
  // A uazapi devolve três nomes possíveis; o da agenda ganha do "push name".
  const name = str(raw.wa_contactName) || str(raw.name) || str(raw.wa_name) || str(raw.phone) || chatid.split('@')[0];
  const isGroup = raw.wa_isGroup === true;
  const lastFromMe = !isGroup && senderIsOwner(str(raw.wa_lastMessageSender), str(raw.owner), chatid, str(raw.wa_chatlid) || null);
  const unread = typeof raw.wa_unreadCount === 'number' ? raw.wa_unreadCount : 0;
  return {
    chatid,
    name,
    phone: str(raw.phone) || chatid.split('@')[0],
    image: str(raw.imagePreview) || str(raw.image) || null,
    lastMessageAt: toMs(raw.wa_lastMsgTimestamp),
    lastPreview: str(raw.wa_lastMessageTextVote),
    lastMessageType: str(raw.wa_lastMessageType) || null,
    lastFromMe,
    // Se quem falou por último foi ela, não há nada "não lido" — a uazapi só
    // não zera o contador quando a resposta sai pelo celular.
    unread: lastFromMe ? 0 : unread,
    isGroup,
    pinned: raw.wa_isPinned === true,
    archived: raw.wa_archived === true,
  };
}

/** Normaliza uma mensagem vinda de /message/find OU do webhook (mesmo formato). */
export function normalizeMessage(raw: Record<string, unknown>): InboxMessage {
  const rawType = str(raw.messageType) || str(raw.type) || 'text';
  const kind = simplifyMessageType(str(raw.messageType), str(raw.type));
  const messageid = str(raw.messageid) || str(raw.id);
  return {
    id: messageid,
    uazapiId: str(raw.id),
    chatid: str(raw.chatid),
    fromMe: raw.fromMe === true,
    kind,
    rawType,
    text: str(raw.text),
    timestamp: toMs(raw.messageTimestamp) ?? 0,
    status: normalizeStatus(str(raw.status)),
    senderName: str(raw.senderName) || null,
    hasMedia: kindHasMedia(kind),
    mimetype: str(raw.mimetype) || mimetypeFromContent(raw.content),
    mediaCached: false,
    mediaError: null,
    quotedId: str(raw.quoted) || null,
  };
}

/** Lista as conversas, mais recentes primeiro. `search` filtra pelo nome do contato. */
export async function findUazapiChats(
  baseUrl: string,
  token: string,
  opts: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ success: boolean; chats: InboxChat[]; total: number; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      sort: '-wa_lastMsgTimestamp',
      limit: opts.limit ?? 40,
      offset: opts.offset ?? 0,
    };
    // O filtro da uazapi é por campo; buscamos pelo nome do contato.
    if (opts.search?.trim()) {
      body.operator = 'OR';
      body.wa_contactName = opts.search.trim();
      body.wa_name = opts.search.trim();
      body.name = opts.search.trim();
    }

    const res = await fetch(`${baseUrl}/chat/find`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { success: false, chats: [], total: 0, error: `uazapi retornou ${res.status}` };

    const data = JSON.parse(text) as { chats?: unknown[]; pagination?: { totalRecords?: number } };
    const chats = (data.chats ?? [])
      .map(c => normalizeChat(c as Record<string, unknown>))
      .filter(c => c.chatid);
    return { success: true, chats, total: data.pagination?.totalRecords ?? chats.length };
  } catch (e) {
    return { success: false, chats: [], total: 0, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}

/** Mensagens de um chat. offset=0 traz as mais recentes (a uazapi aceita até 100 por página). */
export async function findUazapiMessages(
  baseUrl: string,
  token: string,
  chatid: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<{ success: boolean; messages: InboxMessage[]; hasMore: boolean; nextOffset: number; error?: string }> {
  try {
    const limit = Math.min(Math.max(opts.limit ?? 100, 1), 100);
    const res = await fetch(`${baseUrl}/message/find`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatid, limit, offset: opts.offset ?? 0 }),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { success: false, messages: [], hasMore: false, nextOffset: 0, error: `uazapi retornou ${res.status}` };

    const data = JSON.parse(text) as { messages?: unknown[]; hasMore?: boolean; nextOffset?: number };
    const messages = (data.messages ?? [])
      .map(m => normalizeMessage(m as Record<string, unknown>))
      .filter(m => m.id && m.timestamp > 0 && m.kind !== 'skip')
      .sort((a, b) => a.timestamp - b.timestamp); // antigas em cima, como no WhatsApp
    const nextOffset = typeof data.nextOffset === 'number' ? data.nextOffset : (opts.offset ?? 0) + limit;
    return { success: true, messages, hasMore: data.hasMore === true, nextOffset };
  } catch (e) {
    return { success: false, messages: [], hasMore: false, nextOffset: 0, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}

/** Marca a conversa como lida (ou não lida) no WhatsApp da profissional. */
export async function markUazapiChatRead(
  baseUrl: string,
  token: string,
  chatid: string,
  read = true
): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/chat/read`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: chatid, read }),
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Pede o arquivo de uma mensagem. Sem base64: a uazapi devolve `fileURL`
 * (pública por 2 dias) e quem chama copia para o nosso Storage.
 */
export async function downloadUazapiMedia(
  baseUrl: string,
  token: string,
  messageId: string
): Promise<{ success: boolean; fileURL?: string; base64?: string; mimetype?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/message/download`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: messageId, return_base64: false, return_link: true, generate_mp3: true }),
      signal: AbortSignal.timeout(30000),
    });
    const text = await res.text();
    if (!res.ok) {
      let detail = '';
      try { detail = String((JSON.parse(text) as { error?: string }).error || ''); } catch { /* texto solto */ }
      return { success: false, error: `uazapi retornou ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ''}` };
    }

    const data = JSON.parse(text) as { base64Data?: string; base64?: string; mimetype?: string; fileURL?: string; fileUrl?: string };
    const fileURL = data.fileURL || data.fileUrl;
    const base64 = data.base64Data || data.base64;
    if (!fileURL && !base64) return { success: false, error: 'A uazapi não devolveu o arquivo.' };
    return { success: true, fileURL, base64, mimetype: data.mimetype || undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}

/**
 * Pede ao WhatsApp do celular mensagens mais antigas de um chat. O retorno
 * NÃO é imediato: elas chegam depois pelo evento `history` do webhook (e vão
 * para o nosso banco). O celular precisa estar com internet e o WhatsApp
 * aberto ou em segundo plano.
 */
export async function requestUazapiHistorySync(
  baseUrl: string,
  token: string,
  chatid: string,
  opts: { anchorMessageId?: string | null; count?: number } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      number: chatid,
      mode: 'history',
      count: Math.min(Math.max(opts.count ?? 100, 1), 100),
    };
    if (opts.anchorMessageId) body.messageid = opts.anchorMessageId;
    const res = await fetch(`${baseUrl}/message/history-sync`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let detail = '';
      try { detail = String((JSON.parse(text) as { error?: string }).error || ''); } catch { /* ignore */ }
      return { success: false, error: `uazapi retornou ${res.status}${detail ? `: ${detail.slice(0, 160)}` : ''}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}

/** Foto do contato (miniatura). URL temporária; string vazia = sem foto. */
export async function getUazapiChatAvatar(baseUrl: string, token: string, chatid: string): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}/chat/avatar`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: chatid, preview: true }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { url?: string };
    return typeof data.url === 'string' && data.url.startsWith('http') ? data.url : null;
  } catch {
    return null;
  }
}

/** Envia mídia (imagem, áudio, documento…) para um chat. `file` é URL ou base64. */
export async function sendUazapiMedia(
  baseUrl: string,
  token: string,
  number: string,
  type: 'image' | 'video' | 'audio' | 'ptt' | 'document' | 'sticker',
  file: string,
  opts: { text?: string; docName?: string; mimetype?: string; replyid?: string } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/send/media`, {
      method: 'POST',
      headers: { token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number, type, file, readchat: true, ...opts }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) return { success: false, error: `uazapi retornou ${res.status}: ${(await res.text()).slice(0, 200)}` };
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Erro de rede.' };
  }
}
