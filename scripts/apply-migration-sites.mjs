// Aplica as migrações do módulo "Minha Página":
//   v30 → tabela professional_sites + bucket de imagens 'lume-sites'
//   v31 → função lume_claim_slot (trava de concorrência do agendamento)
//
// As duas são ADITIVAS e idempotentes: criam coisas novas, não alteram nem
// apagam nada que já existe, e rodar de novo não quebra.
//
// Uso:
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migration-sites.mjs
//   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/apply-migration-sites.mjs supabase/migration_v31_slot_lock.sql
//
// ATENÇÃO ao token: é o Personal Access Token da CONTA (começa com `sbp_`),
// pego em https://supabase.com/dashboard/account/tokens — NÃO é a service_role
// nem a chave `sb_secret_...`, que servem para dados mas não executam DDL.
//
// Alternativa sem token: abra o SQL Editor do Supabase e cole o conteúdo dos
// dois arquivos, um de cada vez.
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  fs.readFileSync('.env', 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const ref = env.NEXT_PUBLIC_SUPABASE_URL?.match(/https:\/\/([^.]+)/)?.[1];
if (!ref) { console.error('NEXT_PUBLIC_SUPABASE_URL ausente ou inválida no .env'); process.exit(1); }

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Defina SUPABASE_ACCESS_TOKEN (token `sbp_...` de https://supabase.com/dashboard/account/tokens).');
  console.error('Sem ele, cole os SQLs no SQL Editor do Supabase:');
  console.error('  supabase/migration_v30_professional_sites.sql');
  console.error('  supabase/migration_v31_slot_lock.sql');
  process.exit(1);
}

const arquivos = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['supabase/migration_v30_professional_sites.sql', 'supabase/migration_v31_slot_lock.sql'];

for (const file of arquivos) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: fs.readFileSync(file, 'utf8') }),
  });
  if (!res.ok) { console.error(`✗ ${file}:`, res.status, await res.text()); process.exit(1); }
  console.log(`✓ ${file}`);
}

// ── Verificação pós-aplicação ────────────────────────────────────────────────
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { error: tableErr } = await db.from('professional_sites').select('id').limit(1);
console.log('\ntabela professional_sites:', tableErr ? `FALTA (${tableErr.message})` : 'OK');

const { data: buckets, error: bucketErr } = await db.storage.listBuckets();
const bucket = buckets?.find(b => b.id === 'lume-sites');
console.log('bucket lume-sites:', bucketErr ? `ERRO (${bucketErr.message})` : bucket ? `OK (público: ${bucket.public})` : 'FALTA');

// A função existe se o erro NÃO for "função não encontrada" (a chamada abaixo é
// proposital com id inexistente — só queremos saber se o Postgres a conhece).
const probe = await db.rpc('lume_claim_slot', {
  p_professional_id: '00000000-0000-4000-a000-000000000000',
  p_service_id: null, p_service_ids: null, p_client_id: null,
  p_client_name: 'probe', p_client_whatsapp: '0', p_client_email: null,
  p_date: '2099-01-01', p_start_time: '00:00', p_end_time: '00:01',
  p_notes: null, p_payment_method: null, p_buffer_minutes: 0,
});
const semFuncao = /could not find the function|does not exist|PGRST202/i
  .test(`${probe.error?.code} ${probe.error?.message}`);
console.log('função lume_claim_slot:', semFuncao ? 'FALTA' : 'OK');

if (tableErr || !bucket || semFuncao) process.exit(1);
console.log('\nPronto. Abra /dashboard/site no painel para montar a sua página.');
