/**
 * Helpers PUROS da caixa de entrada do WhatsApp — sem acesso a banco, rede
 * ou sessão. Importados tanto pelo servidor (webhook, actions, proxy de
 * mídia) quanto pela tela, então nada de 'server-only' aqui.
 */

/** Tipo simplificado de mensagem — é o que a bolha da tela entende. */
export type InboxKind =
  | 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker'
  | 'location' | 'contact' | 'poll' | 'call' | 'other'
  /** Reações, edições, apagamentos e afins: não viram bolha. */
  | 'skip';

export const MEDIA_KINDS: ReadonlyArray<InboxKind> = ['image', 'video', 'audio', 'document', 'sticker'];

/**
 * A uazapi manda o tipo em dois lugares: `messageType` ("ImageMessage",
 * "ExtendedTextMessage", "Conversation"…) e, no webhook deste fork, um
 * `type` curto ("text", "image"…). Reduz os dois ao mesmo vocabulário.
 */
export function simplifyMessageType(messageType?: string | null, shortType?: string | null): InboxKind {
  const t = String(shortType || messageType || '').toLowerCase().replace(/message$/, '').trim();
  if (!t || t === 'text' || t === 'conversation' || t === 'extendedtext' || t === 'chat') return 'text';
  if (t.includes('reaction') || t.includes('protocol') || t.includes('revoke') || t.includes('edited')
    || t.includes('receipt') || t.includes('keep') || t.includes('senderkey') || t.includes('devicesent')) return 'skip';
  if (t.includes('sticker')) return 'sticker';
  if (t.includes('image')) return 'image';
  if (t.includes('video') || t === 'ptv') return 'video';
  if (t.includes('audio') || t === 'ptt' || t === 'myaudio') return 'audio';
  if (t.includes('document')) return 'document';
  if (t.includes('location')) return 'location';
  if (t.includes('contact') || t.includes('vcard')) return 'contact';
  if (t.includes('poll')) return 'poll';
  if (t.includes('call')) return 'call';
  return 'other';
}

export function kindHasMedia(kind: InboxKind): boolean {
  return MEDIA_KINDS.includes(kind);
}

/** Estado da mensagem já normalizado — o que o "tique" da bolha mostra. */
export type InboxStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'played' | 'failed';

/** Ordem de progressão: um recibo nunca rebaixa a mensagem (Read → Delivered). */
export const STATUS_RANK: Record<InboxStatus, number> = {
  failed: -1, pending: 0, sent: 1, delivered: 2, read: 3, played: 4,
};

export function normalizeStatus(raw?: string | null): InboxStatus | null {
  const s = String(raw || '').toLowerCase();
  if (!s) return null;
  if (s.includes('play')) return 'played';
  if (s.includes('read')) return 'read';
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('sent') || s.includes('server') || s.includes('success')) return 'sent';
  if (s.includes('queue') || s.includes('pending')) return 'pending';
  if (s.includes('fail') || s.includes('cancel') || s.includes('error')) return 'failed';
  return null;
}

/** Estados que um recibo `next` pode SUBSTITUIR (os de rank menor). */
export function statusesBelow(next: InboxStatus): InboxStatus[] {
  return (Object.keys(STATUS_RANK) as InboxStatus[]).filter(s => STATUS_RANK[s] < STATUS_RANK[next]);
}

export const digitsOf = (s: string | null | undefined): string => String(s || '').replace(/\D/g, '');

/** "5511999999999@s.whatsapp.net" → "5511999999999"; tira sufixo de aparelho ":12". */
export function jidUser(jid: string | null | undefined): string {
  return String(jid || '').split('@')[0].split(':')[0];
}

/**
 * A última mensagem do chat foi da própria profissional?
 * A uazapi não zera `wa_unreadCount` quando ela responde pelo celular, então
 * a tela deduz: se quem falou por último foi a dona da conta, ela já leu.
 * Conservador — na dúvida devolve false e o contador da uazapi prevalece.
 */
export function senderIsOwner(
  sender: string | null | undefined,
  owner: string | null | undefined,
  chatid: string | null | undefined,
  chatlid?: string | null,
): boolean {
  if (!sender) return false;
  const user = jidUser(sender);
  const domain = String(sender).split('@')[1] || '';
  const ownerDigits = digitsOf(owner);
  if (ownerDigits && digitsOf(user) === ownerDigits) return true;
  if (domain === 'lid') {
    // LID: só dá pra saber que NÃO é a cliente se o LID dela for conhecido.
    return false;
  }
  if (!domain || domain === 's.whatsapp.net') {
    const contact = jidUser(chatid);
    return !!contact && !!user && user !== contact && !String(chatid || '').endsWith('@g.us');
  }
  void chatlid;
  return false;
}

/** +55 (11) 99999-9999 — formato de leitura do telefone brasileiro. */
export function formatPhoneBR(phone: string): string {
  const d = digitsOf(phone);
  if (d.length === 13) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  if (d.length === 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  return phone;
}

/** Extensão de arquivo a partir do mimetype — para o caminho no Storage. */
export function extensionFor(mimetype: string | null | undefined, kind: InboxKind): string {
  const m = String(mimetype || '').toLowerCase().split(';')[0].trim();
  const map: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/3gpp': '3gp', 'video/quicktime': 'mov', 'video/webm': 'webm',
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/ogg': 'ogg', 'audio/opus': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };
  if (map[m]) return map[m];
  const tail = m.split('/')[1];
  if (tail && /^[a-z0-9.+-]{1,12}$/.test(tail)) return tail.replace(/^x-/, '').replace(/[^a-z0-9]/g, '') || 'bin';
  if (kind === 'image' || kind === 'sticker') return 'jpg';
  if (kind === 'video') return 'mp4';
  if (kind === 'audio') return 'mp3';
  return 'bin';
}

/** Tenta achar o mimetype dentro do `content` bruto da uazapi (JSON ou string). */
export function mimetypeFromContent(content: unknown): string | null {
  try {
    const obj = typeof content === 'string' ? JSON.parse(content) : content;
    if (!obj || typeof obj !== 'object') return null;
    const stack: unknown[] = [obj];
    let guard = 0;
    while (stack.length && guard++ < 40) {
      const cur = stack.pop() as Record<string, unknown>;
      if (!cur || typeof cur !== 'object') continue;
      const m = cur.mimetype ?? cur.mimeType ?? cur.Mimetype;
      if (typeof m === 'string' && m.includes('/')) return m;
      for (const v of Object.values(cur)) if (v && typeof v === 'object') stack.push(v);
    }
  } catch { /* conteúdo não é JSON */ }
  return null;
}
