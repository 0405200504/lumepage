/**
 * Testa como o Lume lê as respostas de conexão da uazapi — sem rede.
 *
 *   npx tsx scripts/test-uazapi-conexao.mts
 *
 * O `fetch` é trocado por respostas gravadas do servidor real (uazapi 3.0.2,
 * 26/11/2026): instância hibernada, servidor sem vaga (429), conexão já em
 * andamento (409) e o QR que chega pelo /instance/status. Foram essas
 * respostas, que a versão antiga do código não conhecia, que deixaram as duas
 * abas do WhatsApp mostrando erro.
 */

// lib/uazapi lê o servidor e o admintoken ao ser carregado: definir antes de importar.
process.env.UAZAPI_SERVER_URL = 'https://uazapi.teste/';
process.env.UAZAPI_ADMIN_TOKEN = 'admintoken-de-teste';
const { checkUazapiStatus, getUazapiQRCode, locateUazapiInstance, isUazapiAdminServer } = await import('../lib/uazapi.ts');
import { parseHealthState, decideHealthAlert, REALERT_MS, type HealthReading } from '../lib/whatsapp/health-state.ts';

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail = '') {
  if (ok) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
  else { failed++; console.log(`  \x1b[31m✗ ${name}\x1b[0m ${detail}`); }
}

type Reply = { status: number; body: unknown };
const realFetch = globalThis.fetch;
const calls: string[] = [];
/** Responde por "MÉTODO caminho"; cada chave pode ter uma fila de respostas. */
function mock(routes: Record<string, Reply | Reply[]>) {
  calls.length = 0;
  const queues = new Map(Object.entries(routes).map(([k, v]) => [k, Array.isArray(v) ? [...v] : [v]]));
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${new URL(String(input)).pathname}`;
    calls.push(key);
    const queue = queues.get(key);
    if (!queue?.length) throw new Error(`chamada inesperada: ${key}`);
    const reply = queue.length > 1 ? queue.shift()! : queue[0];
    const text = typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body);
    return new Response(text, { status: reply.status });
  }) as typeof fetch;
}

const BASE = 'https://uazapi.teste';
const QR = `data:image/png;base64,${'A'.repeat(64)}`;
const QR2 = `data:image/png;base64,${'B'.repeat(64)}`;
const instance = (status: string, extra: Record<string, unknown> = {}) => ({
  id: 'r0', token: 'x', status, paircode: '', qrcode: '', name: 'teste', ...extra,
});
const statusBody = (status: string, extra: Record<string, unknown> = {}, connected = false) => ({
  instance: instance(status, extra),
  status: { connected, jid: null, loggedIn: connected, resetting: false },
});

console.log('\nstatus da instância');
{
  mock({ 'GET /instance/status': { status: 200, body: statusBody('hibernated') } });
  const r = await checkUazapiStatus(BASE, 't');
  check('"hibernated" não vira erro', r.status === 'hibernated', `veio ${r.status}`);

  mock({ 'GET /instance/status': { status: 200, body: statusBody('connected', {}, true) } });
  check('conectada → open', (await checkUazapiStatus(BASE, 't')).status === 'open');

  mock({ 'GET /instance/status': { status: 200, body: statusBody('disconnected') } });
  const closed = await checkUazapiStatus(BASE, 't');
  check('desconectada → close, sem código', closed.status === 'close' && !closed.qrcode);

  mock({ 'GET /instance/status': { status: 200, body: statusBody('connecting', { qrcode: QR }) } });
  const scanning = await checkUazapiStatus(BASE, 't');
  check('conectando traz o QR atual', scanning.status === 'connecting' && scanning.qrcode === QR);

  mock({ 'GET /instance/status': { status: 200, body: statusBody('disconnected', { qrcode: QR }) } });
  check('QR velho de conexão encerrada é ignorado', !(await checkUazapiStatus(BASE, 't')).qrcode);

  mock({ 'GET /instance/status': { status: 502, body: '<html>bad gateway</html>' } });
  check('resposta que não é JSON → error', (await checkUazapiStatus(BASE, 't')).status === 'error');
}

console.log('\npedido de conexão');
{
  mock({ 'POST /instance/connect': { status: 200, body: { connected: false, instance: instance('connecting', { qrcode: QR }) } } });
  const fresh = await getUazapiQRCode(BASE, 't');
  check('instância nova devolve o QR', fresh.success && fresh.qrcode === QR && !fresh.pending);

  // Corpo real do servidor em 26/11/2026, com o limite do plano em 0.
  mock({ 'POST /instance/connect': { status: 429, body: { error: 'Maximum number of instances connected reached' } } });
  const full = await getUazapiQRCode(BASE, 't');
  check('429 de limite → limitReached, sem "uazapi retornou 429"',
    !full.success && full.limitReached === true && !/429/.test(full.error ?? ''), JSON.stringify(full));

  mock({ 'POST /instance/connect': { status: 429, body: { error: 'too many requests' } } });
  const rate = await getUazapiQRCode(BASE, 't');
  check('429 de excesso de chamadas não é falta de vaga', !rate.success && !rate.limitReached);

  mock({
    'POST /instance/connect': { status: 409, body: { error: 'connection flow already in progress' } },
    'GET /instance/status': { status: 200, body: statusBody('connecting', { qrcode: QR2 }) },
  });
  const busy = await getUazapiQRCode(BASE, 't');
  check('409 (conexão em andamento) pega o QR atual no status', busy.success && busy.qrcode === QR2, JSON.stringify(busy));
  check('…sem pedir outra conexão', calls.join(' | ') === 'POST /instance/connect | GET /instance/status', calls.join(' | '));

  mock({
    'POST /instance/connect': { status: 200, body: { connected: false, loggedIn: true, instance: instance('connecting') } },
    'GET /instance/status': { status: 200, body: statusBody('connecting') },
  });
  const waking = await getUazapiQRCode(BASE, 't');
  check('sessão hibernada voltando sem QR → pending, não erro', waking.success && waking.pending === true && !waking.qrcode, JSON.stringify(waking));

  mock({
    'POST /instance/connect': { status: 200, body: { connected: false, instance: instance('connecting') } },
    'GET /instance/status': { status: 200, body: statusBody('connected', {}, true) },
  });
  const back = await getUazapiQRCode(BASE, 't');
  check('…e se já voltou no meio do caminho → alreadyConnected', back.success && back.alreadyConnected === true);

  mock({ 'POST /instance/connect': { status: 200, body: { connected: true, instance: instance('connected') } } });
  check('já conectada → alreadyConnected', (await getUazapiQRCode(BASE, 't')).alreadyConnected === true);

  mock({ 'POST /instance/connect': { status: 200, body: { connected: false, instance: instance('disconnected') } } });
  const none = await getUazapiQRCode(BASE, 't');
  check('desconectada e sem código continua sendo erro', !none.success && !none.limitReached);

  mock({ 'POST /instance/connect': { status: 503, body: { error: 'capacity unavailable' } } });
  const cap = await getUazapiQRCode(BASE, 't');
  check('503 → erro passageiro, não falta de vaga', !cap.success && !cap.limitReached);
}

console.log('\ninstância apagada no servidor');
{
  // Corpo real do servidor para um token que não existe mais (26/11/2026).
  mock({ 'POST /instance/connect': { status: 401, body: { code: 401, message: 'Invalid token.', data: {} } } });
  const dead = await getUazapiQRCode(BASE, 'token-apagado');
  check('401 no pedido de conexão → instanceMissing', !dead.success && dead.instanceMissing === true && !dead.limitReached, JSON.stringify(dead));

  const list = [
    { token: 'tok-julia', name: 'kdp8dA', adminField01: '' },
    { token: 'tok-ana', name: 'ana-1234', adminField01: 'pid-ana' },
  ];
  mock({ 'GET /instance/all': { status: 200, body: list } });
  check('token ainda está no servidor → exists', (await locateUazapiInstance('tok-julia', 'pid-julia')).state === 'exists');
  const moved = await locateUazapiInstance('tok-velho', 'pid-ana');
  check('instância da conta com outro token → moved, com o token atual', moved.state === 'moved' && moved.token === 'tok-ana', JSON.stringify(moved));
  check('nem o token nem a conta estão na lista → gone', (await locateUazapiInstance('tok-velho', 'pid-outra')).state === 'gone');
  check('conta sem id não "adota" instância de adminField01 vazio', (await locateUazapiInstance('tok-velho', '')).state === 'gone');

  mock({ 'GET /instance/all': { status: 200, body: { instances: list } } });
  check('lista embrulhada em { instances } também serve', (await locateUazapiInstance('tok-ana', 'x')).state === 'exists');
  mock({ 'GET /instance/all': { status: 500, body: { error: 'x' } } });
  check('lista fora do ar → unknown (não cria nada no escuro)', (await locateUazapiInstance('tok-velho', 'pid-ana')).state === 'unknown');
  mock({ 'GET /instance/all': { status: 200, body: { error: 'formato inesperado' } } });
  check('resposta que não é lista → unknown', (await locateUazapiInstance('tok-velho', 'pid-ana')).state === 'unknown');

  check('reconhece o próprio servidor, com ou sem barra no fim',
    isUazapiAdminServer('https://uazapi.teste') && isUazapiAdminServer('https://uazapi.teste/') && !isUazapiAdminServer('https://outro.uazapi.com'));
}

console.log('\nestado do monitor');
{
  const row = (state: unknown) => [{ role: 'user', content: JSON.stringify(state), at: 1 }];
  check('lê server_limit', parseHealthState(row({ status: 'server_limit', alertedAt: 5, reassertAt: 7 })).status === 'server_limit');
  const old = parseHealthState(row({ status: 'disconnected', alertedAt: 5, reassertAt: 7 }));
  check('estado antigo (sem errors) continua valendo', old.alertedAt === 5 && old.reassertAt === 7 && old.errors === 0);
  check('linha vazia → ok', parseHealthState([]).status === 'ok' && parseHealthState(null).status === 'ok');
  check('conteúdo quebrado → ok', parseHealthState([{ content: '{nao é json' }]).status === 'ok');
}

console.log('\nmonitor: o que avisa à profissional');
{
  const HOUR = 3_600_000;
  const T = 1_800_000_000_000;
  const paused: HealthReading = { connected: false, hibernated: true, serverFull: false, webhookOk: false };
  const full: HealthReading = { ...paused, serverFull: true };
  const fine: HealthReading = { connected: true, hibernated: false, serverFull: false, webhookOk: true };
  const down: HealthReading = { connected: false, hibernated: false, serverFull: false, webhookOk: false };
  /** Roda rodadas seguidas do monitor, carregando o estado de uma para a outra. */
  function run(start: { status: string; alertedAt: number }, rounds: Array<[HealthReading, number]>) {
    let state = { ...start };
    return rounds.map(([reading, at]) => {
      const d = decideHealthAlert(reading, state, at);
      state = { status: d.problem || 'ok', alertedAt: d.alertedAt };
      return `${d.problem ?? 'ok'}${d.push ? `+${d.push}` : ''}`;
    });
  }

  // A Júlia em 26/11: o código antigo gravou "disconnected" e avisava "leia o QR" a cada 6 h.
  const julia = run({ status: 'disconnected', alertedAt: T }, [
    [full, T + HOUR], [full, T + 2 * HOUR], [full, T + 9 * HOUR], [full, T + 30 * HOUR],
  ]);
  check('servidor sem vaga avisa uma vez e não repete', julia.join(' ') === 'server_limit+server_limit server_limit server_limit server_limit', julia.join(' '));

  const voltou = run({ status: 'server_limit', alertedAt: T }, [[paused, T + HOUR], [fine, T + HOUR + 300_000]]);
  check('vaga volta: acorda calado e avisa que normalizou', voltou.join(' ') === 'waking ok+recovered', voltou.join(' '));

  const piscou = run({ status: 'ok', alertedAt: 0 }, [[paused, T], [fine, T + 300_000]]);
  check('pausa que se resolve sozinha não gera notificação nenhuma', piscou.join(' ') === 'waking ok', piscou.join(' '));

  const naoVoltou = run({ status: 'ok', alertedAt: 0 }, [[paused, T], [paused, T + 300_000], [paused, T + 600_000]]);
  check('pausa que não volta em uma rodada vira "desconectou", uma vez', naoVoltou.join(' ') === 'waking disconnected+disconnected disconnected', naoVoltou.join(' '));

  const caiu = run({ status: 'ok', alertedAt: 0 }, [[down, T], [down, T + HOUR], [down, T + REALERT_MS + 1], [fine, T + REALERT_MS + HOUR]]);
  check('queda comum: avisa, repete a cada 6 h e avisa a volta',
    caiu.join(' ') === 'disconnected+disconnected disconnected disconnected+disconnected ok+recovered', caiu.join(' '));

  const webhook = run({ status: 'ok', alertedAt: 0 }, [[{ ...fine, webhookOk: false }, T], [fine, T + HOUR]]);
  check('webhook que não religa avisa; religou, normaliza', webhook.join(' ') === 'webhook_failed+webhook_failed ok+recovered', webhook.join(' '));

  const calmo = run({ status: 'ok', alertedAt: 0 }, [[fine, T], [fine, T + HOUR]]);
  check('tudo certo não avisa nada', calmo.join(' ') === 'ok ok', calmo.join(' '));
}

globalThis.fetch = realFetch;
console.log(`\n${passed} passaram, ${failed} falharam\n`);
process.exit(failed ? 1 : 0);
