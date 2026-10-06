// Testes das peças puras do robô da Meta (sem rede): verba diária, textos,
// UTM e o formato do que vai para a Graph API.
//
// Como rodar:
//   node scripts/test-meta.mts
//
import { createJiti } from 'jiti';

const ROOT = process.cwd();
const jiti = createJiti(ROOT + '/', { alias: { '@': ROOT } });
const R = await jiti.import<typeof import('../lib/mais-clientes/regras')>('./lib/mais-clientes/regras.ts');
const C = await jiti.import<typeof import('../lib/meta/specs')>('./lib/meta/specs.ts');
const K = await jiti.import<typeof import('../lib/meta/casar')>('./lib/meta/casar.ts');

let ok = 0, falhas = 0;
function t(nome: string, cond: unknown, detalhe?: unknown) {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m`, detalhe ?? ''); }
}

console.log('\nVerba diária');
t('R$ 70/semana = R$ 10/dia, tudo no WhatsApp', JSON.stringify(R.verbaDiaria(70, 'x1')) === JSON.stringify({ x1: 1000, pagina: 0 }));
t('abaixo do mínimo usa R$ 50/semana', R.verbaDiaria(10, 'x1').x1 === Math.round(5000 / 7));
const dupla = R.verbaDiaria(210, 'x1_e_pagina');
t('R$ 210/semana: 60% WhatsApp, 40% página', dupla.x1 === 1800 && dupla.pagina === 1200, dupla);
t('a soma das duas fecha com o total do dia', dupla.x1 + dupla.pagina === Math.round(21000 / 7));

console.log('\nTexto e link');
const oferta = { titulo: 'Lash Lifting + Henna', detalhe: 'De R$ 230 por R$ 199 na primeira visita.' };
const txt = C.textoDoAnuncio(oferta, 'Cerquilho', 'x1');
t('texto traz oferta, cidade e o que fazer no WhatsApp', txt.includes('Lash Lifting + Henna em Cerquilho') && txt.includes('Enviar mensagem'), txt);
t('texto da página chama para reservar', C.textoDoAnuncio(oferta, '', 'pagina').includes('Reservar'));
const link = C.linkComOrigem('https://www.lumepage.com.br/julia?x=1', 'lume-assessoria');
t('link da página leva a origem (UTM) e mantém o que já tinha', link.includes('utm_source=meta') && link.includes('utm_campaign=lume-assessoria') && link.includes('x=1'), link);

console.log('\nFormato para a Meta');
const camp = C.specCampanha('Lume · Júlia · WhatsApp', 'x1', 1000);
t('campanha nasce PAUSADA', camp.status === 'PAUSED');
t('WhatsApp = objetivo de engajamento; página = tráfego', camp.objective === 'OUTCOME_ENGAGEMENT' && C.specCampanha('x', 'pagina', 1).objective === 'OUTCOME_TRAFFIC');
t('verba na campanha (a Meta divide entre os anúncios)', camp.daily_budget === 1000);
const local = { lat: -23.16, lng: -47.74, fonte: 'cidade' as const };
const conj = C.specConjunto('WhatsApp · 15 km', 'x1', '123', 'pag1', local, 15);
const geo = conj.targeting.geo_locations.custom_locations[0];
t('conjunto do WhatsApp otimiza conversas e aponta para a Página', conj.optimization_goal === 'CONVERSATIONS' && conj.destination_type === 'WHATSAPP' && conj.promoted_object?.page_id === 'pag1');
t('raio em km a partir do ponto dela', geo.radius === 15 && geo.distance_unit === 'kilometer' && geo.latitude === -23.16);
t('raio fica entre 1 e 80 km', C.specConjunto('x', 'x1', '1', 'p', local, 500).targeting.geo_locations.custom_locations[0].radius === 80);
t('conjunto da página não usa promoted_object', !('promoted_object' in C.specConjunto('x', 'pagina', '1', 'p', local, 15)));
t('conjunto nasce PAUSADO', conj.status === 'PAUSED');
const cri = C.specCriativo('Lash · Faixa', 'x1', { pageId: 'pag1', igId: 'ig1', imageHash: 'h1', mensagem: 'm', titulo: 'T', link: '' });
t('criativo do WhatsApp usa o botão "Enviar mensagem"', cri.object_story_spec.link_data.call_to_action.type === 'WHATSAPP_MESSAGE');
t('criativo leva o Instagram dela quando existe', cri.object_story_spec.instagram_user_id === 'ig1');
const criP = C.specCriativo('x', 'pagina', { pageId: 'p', igId: null, imageHash: 'h', mensagem: 'm', titulo: 'T', link: 'https://a.b/c' });
t('criativo da página usa "Reservar" com o link dela', criP.object_story_spec.link_data.call_to_action.type === 'BOOK_NOW' && criP.object_story_spec.link_data.link === 'https://a.b/c');
t('sem Instagram, não manda instagram_user_id', !('instagram_user_id' in criP.object_story_spec));

console.log('\nRobô acha a conta e a Página dela');
const conta = (id: string, nome: string, empresa_id: string | null, dono: 'lume' | 'profissional' = 'profissional') =>
  ({ id, nome, ativa: true, status: 'ativa', moeda: 'BRL', gasto_cents: 0, pagamento: 'cartão', dono, empresa: nome, empresa_id });
const pag = (id: string, nome: string, ig: string | null, empresa_id: string | null) =>
  ({ id, nome, instagram: ig ? { id: 'ig' + id, username: ig } : null, dono: 'profissional' as const, empresa_id });
const contas = [conta('act_1', 'Julia Roberta Beauty', 'b1'), conta('act_2', 'Studio Ana', 'b2'), conta('act_9', 'Lume', 'lume', 'lume')];
const paginas = [pag('p1', 'Julia Roberta', 'juliarobertabeauty', 'b1'), pag('p2', 'Studio Ana Cílios', 'studioana', 'b2')];
const j = K.casarAtivos({ instagram: '@JuliaRobertaBeauty', nomes: ['Júlia Roberta'] }, contas, paginas, new Set());
t('pelo @ do Instagram (sem diferença de maiúscula/@)', j.pagina?.id === 'p1' && j.conta?.id === 'act_1' && !j.ambiguo, j);
const semIg = K.casarAtivos({ instagram: '', nomes: ['Studio Ana'] }, contas, paginas, new Set());
t('sem @, pelo nome — e a conta da mesma empresa dona da Página', semIg.pagina?.id === 'p2' && semIg.conta?.id === 'act_2', semIg);
const ocup = K.casarAtivos({ instagram: '@juliarobertabeauty', nomes: [] }, contas, paginas, new Set(['p1']));
t('não pega Página que já é de outra conta', !ocup.pagina, ocup);
const nada = K.casarAtivos({ instagram: '@outra', nomes: ['Fulana'] }, contas, paginas, new Set());
t('não chuta quando nada bate', !nada.pagina && !nada.conta && !nada.ambiguo, nada);
const duas = K.casarAtivos({ instagram: '', nomes: ['Studio'] }, contas, [...paginas, pag('p3', 'Studio Bia', null, 'b3')], new Set());
t('nome que bate em duas Páginas vira escolha manual', !duas.pagina && duas.ambiguo, duas);
const contaLume = K.casarAtivos({ instagram: '@juliarobertabeauty', nomes: [] }, [conta('act_9', 'Julia', 'b1', 'lume')], paginas, new Set());
t('nunca usa a conta da própria Lume como se fosse dela', !contaLume.conta, contaLume);

console.log(`\n${ok} ok, ${falhas} falha(s)\n`);
process.exit(falhas ? 1 : 0);
