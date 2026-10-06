// Valida o formato do robô na Graph API sem gastar nada: a campanha e o
// conjunto vão com validate_only; para o conjunto, cria uma campanha PAUSADA
// e apaga no fim.
//
// Como rodar (conta de anúncios de teste, ex.: a da própria Lume):
//   node --env-file=.env scripts/meta-validar.mts act_123
//
import { createJiti } from 'jiti';

const ROOT = process.cwd();
const jiti = createJiti(ROOT + '/', { alias: { '@': ROOT } });
const G = await jiti.import<typeof import('../lib/meta/graph')>('./lib/meta/graph.ts');
const S = await jiti.import<typeof import('../lib/meta/specs')>('./lib/meta/specs.ts');
const CONTA = process.argv[2];
if (!CONTA?.startsWith('act_')) { console.log('uso: meta-validar.mts act_<id da conta de anúncios>'); process.exit(1); }
const so = { execution_options: ['validate_only'] };
const tenta = async (nome: string, f: () => Promise<unknown>) => {
  try { const r = await f(); console.log('✓', nome, JSON.stringify(r).slice(0, 120)); return r; }
  catch (e: any) { console.log('✗', nome, '→', e.codigo, e.subcodigo, e.paraUsuario || e.message); return null; }
};
// localização pelo OpenStreetMap (mesma função do robô, copiada para não puxar o banco)
const u = new URL('https://nominatim.openstreetmap.org/search'); u.searchParams.set('format', 'jsonv2'); u.searchParams.set('limit', '1'); u.searchParams.set('countrycodes', 'br'); u.searchParams.set('q', 'Cerquilho, SP, Brasil');
const [lugar] = await (await fetch(u, { headers: { 'User-Agent': 'Lume/1.0 (contato@lumepage.com.br)' } })).json();
const local = { lat: Number(lugar.lat), lng: Number(lugar.lon), fonte: 'cidade' as const };
console.log('local de Cerquilho:', local.lat.toFixed(4), local.lng.toFixed(4));

await tenta('campanha WhatsApp (só validar)', () => G.graph(`${CONTA}/campaigns`, { metodo: 'POST', params: { ...S.specCampanha('Teste robô · WhatsApp', 'x1', 1000), ...so } }));
await tenta('campanha Página (só validar)', () => G.graph(`${CONTA}/campaigns`, { metodo: 'POST', params: { ...S.specCampanha('Teste robô · Página', 'pagina', 1000), ...so } }));
const real = await tenta('campanha Página real, PAUSADA (para testar o conjunto)', () => G.graph<{ id: string }>(`${CONTA}/campaigns`, { metodo: 'POST', params: S.specCampanha('Teste robô Lume · apagar', 'pagina', 1000) })) as { id: string } | null;
if (real) {
  await tenta('conjunto Página 15 km (só validar)', () => G.graph(`${CONTA}/adsets`, { metodo: 'POST', params: { ...S.specConjunto('Página · 15 km', 'pagina', real.id, '0', local, 15), ...so } }));
  await tenta('campanha de teste apagada', () => G.graph(real.id, { metodo: 'DELETE' }));
}
