// Aplica supabase/migration_push.sql via Management API (Personal Access Token)
// Uso:  SUPABASE_ACCESS_TOKEN=seu_token  node scripts/apply-push-migration.mjs
// Gere o token em: https://supabase.com/dashboard/account/tokens
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8').split('\n').filter(Boolean).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
);
const ref = env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)/)[1];
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) { console.error('Defina SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens)'); process.exit(1); }

const sql = fs.readFileSync('supabase/migration_push.sql', 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
const body = await res.text();
if (!res.ok) { console.error('Falha ao aplicar:', res.status, body); process.exit(1); }
console.log('✓ Migração de push aplicada com sucesso.');

// Verificação pós-aplicação
const c = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { error } = await c.from('push_subscriptions').select('id').limit(1);
console.log('push_subscriptions:', error ? `FALTA (${error.message})` : 'OK');
