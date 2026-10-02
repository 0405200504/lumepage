import { getSupabaseAdmin } from '@/lib/supabase/client';
import { downloadUazapiMedia } from '@/lib/uazapi';
import { getInboxMessage, setInboxMedia, INBOX_BUCKET } from '@/lib/whatsapp/inbox-store';
import { extensionFor, jidUser, type InboxKind } from '@/lib/whatsapp/inbox-shared';

/**
 * Mídia das mensagens, com cache no nosso Storage.
 *
 * Na uazapi o arquivo some em 2 dias e a mensagem em 7. Então, na primeira vez
 * que uma mídia é pedida (pela tela ou pelo webhook, logo que chega), o Lume
 * baixa pela `fileURL` pública que a uazapi devolve e guarda uma cópia no
 * bucket privado `whatsapp-media`. Daí em diante serve a cópia por URL
 * assinada — a foto de 30 dias atrás continua abrindo.
 *
 * Nunca pede base64: a própria uazapi desaconselha e a função da Vercel não
 * devolve corpo acima de 4,5 MB (era por isso que foto grande não abria).
 */

const MAX_COPY_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL_S = 60 * 60;

export type MediaResolution =
  | { kind: 'redirect'; url: string; cached: boolean }
  | { kind: 'bytes'; buffer: Buffer; mimetype: string }
  | { kind: 'error'; status: number; error: string };

interface Creds { uazapi_url: string; uazapi_token: string }

async function signedUrl(path: string): Promise<string | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin.storage.from(INBOX_BUCKET).createSignedUrl(path, SIGNED_URL_TTL_S);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Caminho estável no bucket: <pid>/<chat>/<messageid>.<ext> */
function storagePath(pid: string, chatid: string, messageid: string, mimetype: string | null, kind: InboxKind): string {
  const chat = (jidUser(chatid) || 'chat').replace(/[^a-zA-Z0-9_-]/g, '');
  const id = messageid.replace(/[^a-zA-Z0-9_-]/g, '');
  return `${pid}/${chat}/${id}.${extensionFor(mimetype, kind)}`;
}

/**
 * Baixa pela URL pública da uazapi e grava no bucket. Devolve o caminho ou
 * null (arquivo grande demais, bucket ausente, rede…). Nunca lança.
 */
async function copyToStorage(
  pid: string, chatid: string, messageid: string, kind: InboxKind, fileUrl: string, mimetypeHint: string | null,
): Promise<{ path: string; mimetype: string } | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  try {
    const res = await fetch(fileUrl, { signal: AbortSignal.timeout(45_000) });
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length') || 0);
    if (len > MAX_COPY_BYTES) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length || buf.length > MAX_COPY_BYTES) return null;
    const mimetype = (res.headers.get('content-type') || mimetypeHint || 'application/octet-stream').split(';')[0].trim();
    const path = storagePath(pid, chatid, messageid, mimetype, kind);

    let { error } = await admin.storage.from(INBOX_BUCKET)
      .upload(path, buf, { contentType: mimetype, cacheControl: '31536000', upsert: true });
    if (error && /bucket.*not found|not found.*bucket/i.test(error.message || '')) {
      // Migração v45 não rodada: cria o bucket privado aqui mesmo e tenta de novo.
      await admin.storage.createBucket(INBOX_BUCKET, { public: false, fileSizeLimit: MAX_COPY_BYTES }).catch(() => null);
      ({ error } = await admin.storage.from(INBOX_BUCKET)
        .upload(path, buf, { contentType: mimetype, cacheControl: '31536000', upsert: true }));
    }
    if (error) { console.warn('[inbox-media] upload falhou:', error.message); return null; }
    return { path, mimetype };
  } catch (e) {
    console.warn('[inbox-media] cópia falhou:', e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Pede a mídia à uazapi tentando o id do WhatsApp e, se não achar, o id
 * interno dela — a documentação mostra o primeiro, o fork já aceitou o segundo.
 */
async function downloadFromUazapi(creds: Creds, messageid: string, uazapiId: string | null) {
  const ids = [messageid, uazapiId].filter((v, i, a): v is string => !!v && a.indexOf(v) === i);
  let last: Awaited<ReturnType<typeof downloadUazapiMedia>> = { success: false, error: 'id ausente' };
  for (const id of ids) {
    last = await downloadUazapiMedia(creds.uazapi_url, creds.uazapi_token, id);
    if (last.success) return last;
    // 404/400 = mensagem não existe mais ou não tem mídia — próximo id não ajuda em erro de rede.
  }
  return last;
}

/**
 * Resolve a mídia de uma mensagem para a tela: cópia nossa → uazapi (e copia).
 * `hint` evita uma consulta quando o chamador já tem a linha do banco.
 */
export async function resolveInboxMedia(
  pid: string,
  creds: Creds,
  messageid: string,
  hint?: { chatid?: string | null; kind?: InboxKind | null; uazapiId?: string | null },
): Promise<MediaResolution> {
  const row = await getInboxMessage(pid, messageid).catch(() => null);

  // 1. Já temos a cópia: URL assinada de 1 hora.
  if (row?.media_path) {
    const url = await signedUrl(row.media_path);
    if (url) return { kind: 'redirect', url, cached: true };
  }

  // 2. Busca na uazapi.
  const media = await downloadFromUazapi(creds, messageid, row?.uazapi_id ?? hint?.uazapiId ?? null);
  if (!media.success) {
    const gone = /404|not found|no media|unsupported/i.test(media.error || '');
    if (row) await setInboxMedia(pid, messageid, { media_error: (media.error || 'indisponível').slice(0, 200) }).catch(() => {});
    return { kind: 'error', status: gone ? 404 : 502, error: media.error || 'Arquivo indisponível.' };
  }

  const chatid = row?.chatid ?? hint?.chatid ?? '';
  const kind = row?.kind ?? hint?.kind ?? 'other';

  // 3. Copia para o nosso bucket (quando a mensagem está no banco) e serve a cópia.
  if (media.fileURL) {
    if (row) {
      const copied = await copyToStorage(pid, chatid, messageid, kind, media.fileURL, media.mimetype ?? null);
      if (copied) {
        await setInboxMedia(pid, messageid, { media_path: copied.path, mimetype: copied.mimetype, media_error: null }).catch(() => {});
        const url = await signedUrl(copied.path);
        if (url) return { kind: 'redirect', url, cached: true };
      }
    }
    // Sem banco/bucket: a URL pública da uazapi ainda vale 2 dias.
    return { kind: 'redirect', url: media.fileURL, cached: false };
  }

  // 4. Fork antigo que só devolve base64.
  if (media.base64) {
    const raw = media.base64.includes(',') ? media.base64.split(',')[1] : media.base64;
    return { kind: 'bytes', buffer: Buffer.from(raw, 'base64'), mimetype: media.mimetype || 'application/octet-stream' };
  }
  return { kind: 'error', status: 404, error: 'A uazapi não devolveu o arquivo.' };
}

/**
 * Chamado pelo webhook assim que uma mídia chega: copia já, antes de a uazapi
 * descartar. Best-effort e silencioso.
 */
export async function cacheInboxMediaNow(pid: string, creds: Creds, messageid: string, uazapiId: string | null): Promise<boolean> {
  try {
    const row = await getInboxMessage(pid, messageid);
    if (!row || row.media_path) return !!row?.media_path;
    const media = await downloadFromUazapi(creds, messageid, uazapiId ?? row.uazapi_id);
    if (!media.success || !media.fileURL) {
      await setInboxMedia(pid, messageid, { media_error: (media.error || 'sem fileURL').slice(0, 200) });
      return false;
    }
    const copied = await copyToStorage(pid, row.chatid, messageid, row.kind, media.fileURL, media.mimetype ?? null);
    if (!copied) return false;
    await setInboxMedia(pid, messageid, { media_path: copied.path, mimetype: copied.mimetype, media_error: null });
    return true;
  } catch {
    return false;
  }
}
