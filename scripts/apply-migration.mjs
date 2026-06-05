// Aplica supabase/migration_v3.sql no banco via Management API (Personal Access Token)
// Uso:  SUPABASE_ACCESS_TOKEN=seu_token  node scripts/apply-migration.mjs
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Defina SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)'); process.exit(1); }

const sql = fs.readFileSync('supabase/migration_v3.sql', 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const body = await res.text();
if (!res.ok) { console.error('Falha ao aplicar:', res.status, body); process.exit(1); }
console.log('✓ Migração aplicada com sucesso.');

// Verificação pós-aplicação
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const check = async (t, col) => {
  const q = c.from(t).select(col || '*').limit(1);
  const { error } = await q;
  return error ? `FALTA (${error.message})` : 'OK';
};
console.log('transactions:', await check('transactions'));
console.log('tasks:', await check('tasks'));
console.log('fixed_expenses:', await check('fixed_expenses'));
console.log('clients.birthday:', await check('clients', 'birthday'));
console.log('settings.requires_deposit:', await check('settings', 'requires_deposit'));
console.log('settings.deposit_instructions:', await check('settings', 'deposit_instructions'));
