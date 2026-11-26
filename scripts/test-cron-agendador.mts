/**
 * Testa o agendador das mensagens automáticas (migração v49) — sem rede.
 *
 *   npx tsx scripts/test-cron-agendador.mts
 *
 * O `fetch` é trocado por um PostgREST de mentira com a tabela `lume_cron` em
 * memória, que aplica os mesmos filtros que o Postgres aplicaria. Cobre a
 * trava (duas rodadas juntas → só uma passa), o segredo do banco e a rota
 * /api/cron/reminders inteira com o banco vazio.
 */

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://banco.teste';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-de-teste';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-de-teste';
delete process.env.CRON_SECRET;

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; console.log(`  \x1b[31m✗ ${name}\x1b[0m ${detail}`); }
}

// ── PostgREST de mentira ─────────────────────────────────────────────────────
type Row = { name: string; token: string; locked_until: string; last_run_at: string | null; created_at: string };
const state: { table: 'ok' | 'missing'; rows: Row[]; other: string[] } = { table: 'ok', rows: [], other: [] };
const realFetch = globalThis.fetch;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = new URL(String(input instanceof Request ? input.url : input));
  const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
  if (!url.pathname.startsWith('/rest/v1/')) throw new Error(`chamada inesperada: ${method} ${url.href}`);
  const table = url.pathname.replace('/rest/v1/', '');
  if (table !== 'lume_cron') {
    // O resto do banco está vazio: a rota roda inteira sem ter o que enviar.
    state.other.push(`${method} ${table}`);
    return method === 'HEAD' ? new Response(null, { status: 200, headers: { 'content-range': '*/0' } }) : json(200, []);
  }
  if (state.table === 'missing') {
    return json(404, { code: 'PGRST205', message: "Could not find the table 'public.lume_cron' in the schema cache" });
  }
  // Filtros no formato do PostgREST: coluna=op.valor
  const match = (r: Row) => [...url.searchParams].every(([k, v]) => {
    if (k === 'select') return true;
    const [op, ...rest] = v.split('.');
    const value = rest.join('.');
    const cell = (r as unknown as Record<string, string | null>)[k];
    if (op === 'eq') return cell === value;
    if (op === 'lt') return cell !== null && new Date(cell).getTime() < new Date(value).getTime();
    throw new Error(`filtro não suportado no teste: ${k}=${v}`);
  });
  const hit = state.rows.filter(match);
  if (method === 'PATCH') {
    const patch = JSON.parse(String(init?.body)) as Partial<Row>;
    for (const r of hit) Object.assign(r, patch);
  }
  return json(200, hit.map(r => ({ ...r })));
}) as typeof fetch;

const { claimCronRun, getCronToken, cronSilenceMs, CRON_STALE_MS } = await import('../lib/cron/scheduler.ts');
const seed = (over: Partial<Row> = {}) => {
  state.table = 'ok';
  state.rows = [{ name: 'reminders', token: 'segredo-do-banco', locked_until: new Date(0).toISOString(), last_run_at: null, created_at: new Date(T - 3_600_000).toISOString(), ...over }];
};
const T = Date.parse('2026-11-26T16:00:00Z');
const at = (ms: number) => new Date(T + ms);

console.log('\ntrava da rodada');
{
  seed();
  check('primeira chamada fica com a rodada', await claimCronRun('reminders', at(0)) === 'claimed');
  check('…e registra a hora em que rodou', state.rows[0].last_run_at === at(0).toISOString());
  check('segunda chamada 2 s depois encontra a trava', await claimCronRun('reminders', at(2_000)) === 'busy');
  check('a que foi barrada não mexe na hora da última rodada', state.rows[0].last_run_at === at(0).toISOString());
  check('ainda travada aos 60 s (tempo máximo de uma rodada)', await claimCronRun('reminders', at(60_000)) === 'busy');
  check('5 min depois a próxima rodada passa', await claimCronRun('reminders', at(300_000)) === 'claimed');

  seed();
  const [a, b] = await Promise.all([claimCronRun('reminders', at(0)), claimCronRun('reminders', at(1))]);
  check('duas chamadas no mesmo instante: uma passa, a outra não', [a, b].sort().join() === 'busy,claimed', `${a} ${b}`);

  state.table = 'missing';
  check('sem a migração v49 não trava ninguém (comportamento de antes)', await claimCronRun('reminders', at(0)) === 'unavailable');
  state.table = 'ok'; state.rows = [];
  check('tabela sem a linha do job também não trava', await claimCronRun('reminders', at(0)) === 'unavailable');
}

console.log('\nsegredo e silêncio do agendador');
{
  seed();
  check('lê o segredo gerado no banco', await getCronToken('reminders') === 'segredo-do-banco');
  check('nunca rodou: conta desde a criação do job', await cronSilenceMs('reminders', at(0)) === 3_600_000);
  seed({ last_run_at: at(-4 * 60_000).toISOString() });
  const quiet = await cronSilenceMs('reminders', at(0));
  check('rodou há 4 min: dentro do normal', quiet === 4 * 60_000 && quiet < CRON_STALE_MS);
  seed({ last_run_at: at(-3 * 3_600_000).toISOString() });
  check('rodou há 3 h: passa do limite do alerta', (await cronSilenceMs('reminders', at(0)))! > CRON_STALE_MS);
  state.table = 'missing';
  check('sem a v49: segredo nulo e silêncio desconhecido (sem alerta falso)',
    await getCronToken('reminders') === null && await cronSilenceMs('reminders', at(0)) === null);
}

console.log('\nrota /api/cron/reminders');
{
  const { NextRequest } = await import('next/server');
  const { GET } = await import('../app/api/cron/reminders/route.ts');
  const call = async (token?: string) => {
    const res = await GET(new NextRequest('https://lume.teste/api/cron/reminders', { headers: token ? { authorization: `Bearer ${token}` } : {} }));
    return { status: res.status, body: await res.json() as Record<string, unknown> };
  };
  const quiet = async <R,>(fn: () => Promise<R>) => {
    const { log, error, warn } = console;
    console.log = console.error = console.warn = () => {};
    try { return await fn(); } finally { Object.assign(console, { log, error, warn }); }
  };

  seed();
  check('sem segredo nenhum no pedido → 401', (await quiet(() => call())).status === 401);
  check('segredo errado → 401', (await quiet(() => call('chute'))).status === 401);
  check('…e nada do banco foi lido além do segredo', state.other.length === 0, state.other.join(' | '));

  const ran = await quiet(() => call('segredo-do-banco'));
  check('segredo do banco (pg_cron) roda a rota até o fim', ran.status === 200 && ran.body.ok === true && !ran.body.skipped, JSON.stringify(ran));
  const again = await quiet(() => call('segredo-do-banco'));
  check('chamada colada na anterior é dispensada pela trava', again.status === 200 && again.body.skipped === 'outra rodada em andamento', JSON.stringify(again));

  process.env.CRON_SECRET = 'segredo-do-github';
  seed();
  const github = await quiet(() => call('segredo-do-github'));
  check('CRON_SECRET (GitHub) continua valendo', github.status === 200 && github.body.ok === true && !github.body.skipped, JSON.stringify(github));
  const overlap = await quiet(() => call('segredo-do-banco'));
  check('pg_cron chegando junto com o GitHub é dispensado', overlap.body.skipped === 'outra rodada em andamento', JSON.stringify(overlap));

  state.table = 'missing';
  const legacy = await quiet(() => call('segredo-do-github'));
  check('sem a v49, o CRON_SECRET roda como sempre rodou', legacy.status === 200 && legacy.body.ok === true && !legacy.body.skipped, JSON.stringify(legacy));
  check('sem a v49, segredo desconhecido → 401', (await quiet(() => call('segredo-do-banco'))).status === 401);
  delete process.env.CRON_SECRET;
  check('sem CRON_SECRET e sem a v49 → 503 (rota desligada, nunca pública)', (await quiet(() => call('qualquer'))).status === 503);
}

globalThis.fetch = realFetch;
console.log(`\n${passed} passaram, ${failed} falharam\n`);
process.exit(failed ? 1 : 0);
