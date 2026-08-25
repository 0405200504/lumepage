/**
 * Diagnóstico da caixa de entrada (aba Conversas).
 *
 * Roda exatamente o que a tela roda no servidor — /chat/find e /message/find —
 * usando as credenciais gravadas para a profissional, e mostra o que a uazapi
 * devolveu de verdade: HTTP, tempo, campos.
 *
 *   node --env-file=.env node_modules/.bin/tsx scripts/test-inbox.mts
 *   npx tsx scripts/test-inbox.mts                 (lê o .env sozinho)
 *   npx tsx scripts/test-inbox.mts <professional_id>
 *
 * Sem argumento, usa a primeira profissional com WhatsApp configurado.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const pid = process.argv[2];
const q = db.from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token')
  .not('uazapi_url', 'is', null).not('uazapi_token', 'is', null).limit(1);
const { data, error } = pid ? await q.eq('professional_id', pid) : await q;

if (error) { console.error('Supabase:', error.message); process.exit(1); }
if (!data?.length) { console.error('Nenhuma profissional com uazapi_url/token gravados.'); process.exit(1); }

const { professional_id, uazapi_url, uazapi_token } = data[0];
console.log(`profissional ${professional_id}`);
console.log(`servidor     ${uazapi_url}`);
console.log(`token        ••••${uazapi_token.slice(-4)}\n`);

async function call(path: string, body: unknown) {
  const t0 = Date.now();
  try {
    const res = await fetch(`${uazapi_url}${path}`, {
      method: 'POST',
      headers: { token: uazapi_token, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    console.log(`POST ${path} → HTTP ${res.status} em ${Date.now() - t0}ms`);
    if (!res.ok) { console.log('  corpo:', text.slice(0, 400)); return null; }
    try { return JSON.parse(text); } catch { console.log('  resposta não-JSON:', text.slice(0, 300)); return null; }
  } catch (e) {
    console.log(`POST ${path} → EXCEÇÃO em ${Date.now() - t0}ms:`, e instanceof Error ? e.message : e);
    return null;
  }
}

// 1. Status da instância
const st0 = Date.now();
const stRes = await fetch(`${uazapi_url}/instance/status`, { headers: { token: uazapi_token } }).catch(() => null);
console.log(`GET /instance/status → HTTP ${stRes?.status ?? 'erro'} em ${Date.now() - st0}ms`);
if (stRes?.ok) console.log('  ', (await stRes.text()).slice(0, 200), '\n');

// 2. Chats — o que a lista da esquerda consome
const chats = await call('/chat/find', { sort: '-wa_lastMsgTimestamp', limit: 5, offset: 0 });
if (chats) {
  const list = Array.isArray(chats) ? chats : (chats.chats ?? []);
  console.log(`  chats recebidos: ${list.length} (formato: ${Array.isArray(chats) ? 'array na raiz' : 'objeto { chats }'})`);
  if (list[0]) {
    console.log('  campos do primeiro:', Object.keys(list[0]).slice(0, 18).join(', '));
    console.log('  amostra:', JSON.stringify({
      wa_chatid: list[0].wa_chatid, name: list[0].name, wa_contactName: list[0].wa_contactName,
      wa_lastMsgTimestamp: list[0].wa_lastMsgTimestamp, wa_unreadCount: list[0].wa_unreadCount,
    }));
    // 3. Mensagens do primeiro chat — o que a thread consome
    const msgs = await call('/message/find', { chatid: list[0].wa_chatid, limit: 3, offset: 0 });
    if (msgs) {
      const ml = Array.isArray(msgs) ? msgs : (msgs.messages ?? []);
      console.log(`  mensagens recebidas: ${ml.length}`);
      if (ml[0]) {
        console.log('  campos:', Object.keys(ml[0]).slice(0, 18).join(', '));
        console.log('  amostra:', JSON.stringify({
          id: ml[0].id, fromMe: ml[0].fromMe, messageType: ml[0].messageType,
          messageTimestamp: ml[0].messageTimestamp, status: ml[0].status,
          text: String(ml[0].text ?? '').slice(0, 40),
        }));
        const ts = Number(ml[0].messageTimestamp);
        console.log('  timestamp interpretado:', new Date(ts > 1e12 ? ts : ts * 1000).toLocaleString('pt-BR'),
                    ts > 1e12 ? '(milissegundos)' : '(SEGUNDOS — a tela precisa multiplicar por 1000)');
      }
    }
  } else {
    console.log('  nenhuma conversa nesta instância.');
  }
}
