/**
 * Confere o provisionamento automático de instâncias no servidor uazapi —
 * sem precisar criar uma conta de teste no Lume.
 *
 *   npx tsx scripts/test-uazapi.mts            # só lista (não gasta slot)
 *   npx tsx scripts/test-uazapi.mts --create    # cria uma instância de teste
 *   npx tsx scripts/test-uazapi.mts --delete <token>   # apaga e libera o slot
 *
 * Lê UAZAPI_SERVER_URL e UAZAPI_ADMIN_TOKEN do .env.
 *
 * Endpoints (spec OpenAPI da uazapi):
 *   POST   /instance/create  header admintoken  body { name } → { token }
 *   GET    /instance/all     header admintoken
 *   DELETE /instance         header token (o da instância)
 */

import { readFileSync } from 'fs';

// .env simples — o script roda fora do Next, então não há carregamento automático.
for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const URL_BASE = (process.env.UAZAPI_SERVER_URL || '').replace(/\/$/, '');
const ADMIN = process.env.UAZAPI_ADMIN_TOKEN || '';

if (!URL_BASE || !ADMIN) {
  console.error('Faltam UAZAPI_SERVER_URL / UAZAPI_ADMIN_TOKEN no .env');
  process.exit(1);
}

const [cmd, arg] = process.argv.slice(2);

async function listar() {
  const res = await fetch(`${URL_BASE}/instance/all`, { headers: { admintoken: ADMIN } });
  const text = await res.text();
  if (!res.ok) { console.error(`GET /instance/all → ${res.status}: ${text.slice(0, 300)}`); return; }
  const data = JSON.parse(text);
  const list = Array.isArray(data) ? data : (data.instances ?? []);
  console.log(`${list.length} instância(s):`);
  for (const i of list) {
    console.log(` · ${i.name ?? i.id} — ${i.status ?? '?'} — ${i.owner ?? i.profileName ?? ''} ${i.adminField01 ? `(pid ${i.adminField01})` : ''}`);
  }
}

async function criar() {
  const name = `teste-lume-${Date.now().toString(36)}`;
  const res = await fetch(`${URL_BASE}/instance/create`, {
    method: 'POST',
    headers: { admintoken: ADMIN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, adminField01: 'script-de-teste' }),
  });
  const text = await res.text();
  console.log(`POST /instance/create → ${res.status}`);
  console.log(text.slice(0, 500));
  if (res.ok) {
    const token = JSON.parse(text).token;
    console.log(`\nCriada: ${name}\nApague com:  npx tsx scripts/test-uazapi.mts --delete ${token}`);
  }
}

async function apagar(token: string) {
  const res = await fetch(`${URL_BASE}/instance`, { method: 'DELETE', headers: { token } });
  console.log(`DELETE /instance → ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

if (cmd === '--create') await criar();
else if (cmd === '--delete') {
  if (!arg) { console.error('Passe o token da instância: --delete <token>'); process.exit(1); }
  await apagar(arg);
} else await listar();
