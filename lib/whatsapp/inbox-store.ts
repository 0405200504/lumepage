import { getSupabaseAdmin } from '@/lib/supabase/client';
import type { InboxMessage } from '@/lib/uazapi';
import {
  normalizeStatus, statusesBelow, type InboxKind, type InboxStatus,
} from '@/lib/whatsapp/inbox-shared';

/**
 * Histórico PRÓPRIO da caixa de entrada (tabela whatsapp_inbox_messages,
 * migração v45). A uazapi só guarda 7 dias; aqui ficam 90.
 *
 * Tudo é best-effort: se a migração ainda não rodou, cada função devolve
 * vazio/false e a aba segue funcionando só com o que a uazapi tem.
 */

export const INBOX_TABLE = 'whatsapp_inbox_messages';
export const INBOX_RETENTION_DAYS = 90;

export interface InboxRow {
  professional_id: string;
  chatid: string;
  messageid: string;
  uazapi_id: string | null;
  from_me: boolean;
  is_group: boolean;
  kind: InboxKind;
  raw_type: string | null;
  text: string;
  sender_jid: string | null;
  sender_name: string | null;
  timestamp: number;
  status: InboxStatus | null;
  has_media: boolean;
  mimetype: string | null;
  media_path: string | null;
  media_error: string | null;
  quoted_id: string | null;
}

/** Linha mínima para gravar — o resto tem default no banco. */
export type InboxRowInput = Omit<InboxRow, 'media_path' | 'media_error'> & Partial<Pick<InboxRow, 'media_path' | 'media_error'>>;

// Depois de descobrir que a tabela não existe, para de tentar por 1 min —
// senão cada polling da tela bate no erro de novo.
let unavailableUntil = 0;
const storeAvailable = () => Date.now() > unavailableUntil;

function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === '42P01' || error.code === 'PGRST205'
    || /does not exist|could not find the table|schema cache/i.test(error.message || '');
}

function handleError(where: string, error: { code?: string; message?: string } | null): void {
  if (!error) return;
  if (isMissingTable(error)) {
    unavailableUntil = Date.now() + 60_000;
    console.warn(`[inbox-store] tabela ${INBOX_TABLE} ausente — rode supabase/migration_v45_whatsapp_inbox.sql`);
    return;
  }
  console.warn(`[inbox-store] ${where}:`, error.message);
}

/** Grava (ou atualiza) um lote. Colunas ausentes no objeto não são tocadas no banco. */
export async function upsertInboxMessages(rows: InboxRowInput[]): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !rows.length || !storeAvailable()) return 0;
  // Mesmo messageid repetido no lote faz o upsert do Postgres falhar — fica o mais novo.
  const byId = new Map<string, InboxRowInput>();
  for (const r of rows) if (r.messageid) byId.set(r.messageid, r);
  const unique = [...byId.values()];
  if (!unique.length) return 0;
  const { error } = await admin
    .from(INBOX_TABLE)
    // JSON.parse(JSON.stringify()) tira as chaves undefined — coluna ausente no payload não é tocada no banco.
    .upsert(unique.map(r => JSON.parse(JSON.stringify({ ...r, updated_at: new Date().toISOString() }))), { onConflict: 'professional_id,messageid' });
  if (error) { handleError('upsert', error); return 0; }
  return unique.length;
}

/**
 * Aplica um recibo (Delivered/Read/Played…) sem rebaixar quem já está à frente.
 * O status "read" vale mais que "delivered", e assim por diante.
 */
export async function applyInboxReceipt(professionalId: string, messageids: string[], rawState: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const next = normalizeStatus(rawState);
  if (!admin || !next || !messageids.length || !storeAvailable()) return;
  const below = statusesBelow(next);
  let q = admin.from(INBOX_TABLE)
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('professional_id', professionalId)
    .in('messageid', messageids.slice(0, 200));
  // `failed` sempre vence (é o que a profissional precisa ver); os demais só sobem.
  if (next !== 'failed') q = q.or(`status.is.null,status.in.(${below.join(',')})`);
  const { error } = await q;
  if (error) handleError('receipt', error);
}

export interface ListInboxOpts {
  /** Só mensagens mais antigas que este timestamp (ms) — paginação para cima. */
  before?: number;
  /** Só mensagens a partir deste timestamp (ms) — polling do que chegou. */
  since?: number;
  limit?: number;
}

/** Mensagens de um chat, em ordem cronológica (antigas primeiro). */
export async function listInboxMessages(professionalId: string, chatid: string, opts: ListInboxOpts = {}): Promise<InboxRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !storeAvailable()) return [];
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  let q = admin.from(INBOX_TABLE)
    .select('*')
    .eq('professional_id', professionalId)
    .eq('chatid', chatid)
    .neq('kind', 'skip')
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (opts.before) q = q.lt('timestamp', opts.before);
  if (opts.since) q = q.gte('timestamp', opts.since);
  const { data, error } = await q;
  if (error) { handleError('list', error); return []; }
  return ((data || []) as InboxRow[]).reverse();
}

export async function getInboxMessage(professionalId: string, messageid: string): Promise<InboxRow | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !storeAvailable()) return null;
  const { data, error } = await admin.from(INBOX_TABLE)
    .select('*')
    .eq('professional_id', professionalId)
    .eq('messageid', messageid)
    .maybeSingle();
  if (error) { handleError('get', error); return null; }
  return (data as InboxRow | null) ?? null;
}

export async function setInboxMedia(
  professionalId: string,
  messageid: string,
  patch: { media_path?: string | null; mimetype?: string | null; media_error?: string | null },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin || !storeAvailable()) return;
  const { error } = await admin.from(INBOX_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('professional_id', professionalId)
    .eq('messageid', messageid);
  if (error) handleError('media', error);
}

/**
 * Última mensagem conhecida de cada chat listado — serve para a tela saber
 * que a profissional respondeu pelo celular (e zerar o "não lida").
 */
export async function lastInboxMessageByChat(
  professionalId: string,
  chatids: string[],
  notBefore: number,
): Promise<Map<string, { from_me: boolean; timestamp: number }>> {
  const out = new Map<string, { from_me: boolean; timestamp: number }>();
  const admin = getSupabaseAdmin();
  if (!admin || !chatids.length || !storeAvailable()) return out;
  const { data, error } = await admin.from(INBOX_TABLE)
    .select('chatid, from_me, timestamp')
    .eq('professional_id', professionalId)
    .in('chatid', chatids.slice(0, 60))
    .neq('kind', 'skip')
    .gte('timestamp', Math.max(0, notBefore))
    .order('timestamp', { ascending: false })
    .limit(600);
  if (error) { handleError('lastByChat', error); return out; }
  for (const r of (data || []) as Array<{ chatid: string; from_me: boolean; timestamp: number }>) {
    if (!out.has(r.chatid)) out.set(r.chatid, { from_me: r.from_me, timestamp: r.timestamp });
  }
  return out;
}

/** Timestamp (ms) da mensagem mais antiga guardada de um chat — ou null. */
export async function oldestInboxTimestamp(professionalId: string, chatid: string): Promise<number | null> {
  const admin = getSupabaseAdmin();
  if (!admin || !storeAvailable()) return null;
  const { data, error } = await admin.from(INBOX_TABLE)
    .select('timestamp')
    .eq('professional_id', professionalId)
    .eq('chatid', chatid)
    .order('timestamp', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) { handleError('oldest', error); return null; }
  return (data as { timestamp: number } | null)?.timestamp ?? null;
}

/**
 * Apaga o que passou da retenção (90 dias), inclusive o arquivo no Storage.
 * Em lotes pequenos — roda dentro do cron de lembretes, best-effort.
 */
export async function purgeOldInboxMessages(days = INBOX_RETENTION_DAYS, batch = 300): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !storeAvailable()) return 0;
  const cutoff = Date.now() - days * 86_400_000;
  const { data, error } = await admin.from(INBOX_TABLE)
    .select('id, media_path')
    .lt('timestamp', cutoff)
    .limit(batch);
  if (error) { handleError('purge:select', error); return 0; }
  const rows = (data || []) as Array<{ id: string; media_path: string | null }>;
  if (!rows.length) return 0;
  const paths = rows.map(r => r.media_path).filter((p): p is string => !!p);
  if (paths.length) await admin.storage.from(INBOX_BUCKET).remove(paths).catch(() => null);
  const { error: delError } = await admin.from(INBOX_TABLE).delete().in('id', rows.map(r => r.id));
  if (delError) { handleError('purge:delete', delError); return 0; }
  return rows.length;
}

export const INBOX_BUCKET = 'whatsapp-media';

// ── Conversão entre a linha do banco e a mensagem da tela ──────────────────


/** Mensagem normalizada → linha para gravar. `status` null fica de fora para não apagar recibo já aplicado. */
export function toInboxRow(professionalId: string, m: InboxMessage, chatidFallback?: string): InboxRowInput {
  const row: InboxRowInput = {
    professional_id: professionalId,
    chatid: m.chatid || chatidFallback || '',
    messageid: m.id,
    uazapi_id: m.uazapiId || null,
    from_me: m.fromMe,
    is_group: (m.chatid || chatidFallback || '').endsWith('@g.us'),
    kind: m.kind,
    raw_type: m.rawType || null,
    text: m.text || '',
    sender_jid: null,
    sender_name: m.senderName,
    timestamp: m.timestamp,
    status: m.status,
    has_media: m.hasMedia,
    mimetype: m.mimetype,
    quoted_id: m.quotedId,
  };
  if (row.status === null) delete (row as Partial<InboxRowInput>).status;
  if (row.mimetype === null) delete (row as Partial<InboxRowInput>).mimetype;
  return row;
}

export function fromInboxRow(r: InboxRow): InboxMessage {
  return {
    id: r.messageid,
    uazapiId: r.uazapi_id || '',
    chatid: r.chatid,
    fromMe: r.from_me,
    kind: r.kind,
    rawType: r.raw_type || '',
    text: r.text || '',
    timestamp: Number(r.timestamp),
    status: r.status,
    senderName: r.sender_name,
    hasMedia: r.has_media,
    mimetype: r.mimetype,
    mediaCached: !!r.media_path,
    mediaError: r.media_error,
    quotedId: r.quoted_id,
  };
}

/** true enquanto o banco respondeu bem na última tentativa (migração v45 aplicada). */
export function inboxStoreReady(): boolean {
  return storeAvailable();
}
