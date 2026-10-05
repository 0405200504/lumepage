// Testes das regras puras do "Quero mais clientes" (sem banco, sem rede, sem IA).
//
// Como rodar:
//   node scripts/test-mais-clientes.mts
//
import { createJiti } from 'jiti';

const ROOT = process.cwd();
const jiti = createJiti(ROOT + '/', { alias: { '@': ROOT } });
const R = await jiti.import<typeof import('../lib/mais-clientes/regras')>('./lib/mais-clientes/regras.ts');
const X = await jiti.import<typeof import('../lib/mais-clientes/x1')>('./lib/mais-clientes/x1.ts');
const T = await jiti.import<typeof import('../lib/mais-clientes/tutoriais')>('./lib/mais-clientes/tutoriais.ts');

let ok = 0, falhas = 0;
function t(nome: string, cond: unknown, detalhe?: unknown) {
  if (cond) { ok++; console.log(`  \x1b[32m✓\x1b[0m ${nome}`); }
  else { falhas++; console.log(`  \x1b[31m✗ ${nome}\x1b[0m`, detalhe ?? ''); }
}

console.log('\nVerba e funil');
t('verba abaixo do mínimo sobe para R$ 50', R.normalizarVerba(20) === 50);
t('verba sem máximo', R.normalizarVerba(5000) === 5000);
t('verba inválida vira o mínimo', R.normalizarVerba('abc') === 50);
t('teto nunca abaixo da verba', R.normalizarTeto(80, 120) === 120);
t('R$ 100/semana roda só o X1', R.funilPara(100) === 'x1');
t('R$ 150/semana testa X1 e página', R.funilPara(150) === 'x1_e_pagina');

console.log('\nRaio');
t('interior = 15 km', R.raioPadrao('Cerquilho') === 15);
t('capital = 25 km', R.raioPadrao('São Paulo') === 25);
t('cidade grande sem acento e com caixa = 25 km', R.raioPadrao('  CAMPINAS ') === 25);
t('sem cidade = 15 km', R.raioPadrao('') === 15);

console.log('\nFotos');
t('foto pequena gera aviso', R.avaliarFoto({ width: 400, height: 500, brilho: 130 }).avisos.length === 1);
t('foto escura gera aviso', !R.avaliarFoto({ width: 1200, height: 1500, brilho: 40 }).ok);
t('foto boa passa', R.avaliarFoto({ width: 1200, height: 1500, brilho: 140 }).ok);
const asset = (slot: string, service_id: string | null = null) => ({ id: slot, slot, service_id, path: '', mime: 'image/jpeg', consentimento: true, qualidade: { ok: true, avisos: [] }, created_at: '' });
const intake = { servicos_foco: ['s1', 's2'], servico_prioritario: 's1' };
t('mínimo de fotos: falta resultado do serviço principal', !R.fotosMinimasOk([asset('ela'), asset('espaco'), asset('resultado', 's2')] as never, intake));
t('mínimo de fotos: ok com ela + espaço + depois do principal', R.fotosMinimasOk([asset('ela'), asset('espaco'), asset('depois', 's1')] as never, intake));

console.log('\nDiagnóstico');
t('tudo ok = 10/10', R.notaDosItens([{ status: 'ok' }, { status: 'ok' }]).dezDeDez);
t('ajustar vale meio ponto', R.notaDosItens([{ status: 'ok' }, { status: 'ajustar' }]).nota === 7.5);
t('item não visto fica fora da nota e não tira o 10/10', (() => { const n = R.notaDosItens([{ status: 'ok' }, { status: 'nao_visto' }]); return n.nota === 10 && n.dezDeDez && n.naoVistos === 1; })());
t('dica não tira nota', R.notaDosItens([{ status: 'ok' }, { status: 'dica' }]).dezDeDez);
t('tutorial: todo item tem passos', [...T.ITENS_INSTAGRAM, ...T.ITENS_GOOGLE].every(i => i.passos.length >= 2 && i.criterio.length > 20));
t('tutorial: ids únicos por plataforma', new Set(T.ITENS_INSTAGRAM.map(i => i.id)).size === T.ITENS_INSTAGRAM.length && new Set(T.ITENS_GOOGLE.map(i => i.id)).size === T.ITENS_GOOGLE.length);

console.log('\nOfertas');
const lash = { id: 'll', name: 'Lash Lifting', price_cents: 16000 };
const design = { id: 'dh', name: 'Design com Henna', price_cents: 7000 };
const nano = { id: 'nf', name: 'Nanofios', price_cents: 50000 };
const catalogo = [lash, design, nano];
const combo = R.sugerirOfertas([lash], catalogo, ['combo'])[0];
t('combo usa serviço complementar mais barato', combo.tipo === 'combo' && combo.titulo.includes('Design com Henna'), combo);
t('combo: desconto nunca passa de 15%', combo.preco_oferta_cents! >= Math.round((16000 + 7000) * 0.85) - 100, combo);
t('nunca aprovada por padrão', !combo.aprovada);
const brinde = R.sugerirOfertas([lash], catalogo, ['brinde'], 'SPA dos lábios')[0];
t('brinde mantém o preço cheio', brinde.tipo === 'brinde' && brinde.preco_oferta_cents === null);
const parc = R.sugerirOfertas([nano], catalogo, ['parcelamento'])[0];
t('parcelamento só em ticket alto', parc.tipo === 'parcelamento');
t('parcelamento não vale para serviço barato', R.sugerirOfertas([design], catalogo, ['parcelamento'])[0].tipo === 'preco_atual');
const desc = R.sugerirOfertas([lash], catalogo, ['desconto_primeira'])[0];
t('desconto de 1ª visita = 10%', desc.preco_oferta_cents === 14400, desc);
t('sem condições: preço atual', R.sugerirOfertas([lash], catalogo, [])[0].tipo === 'preco_atual');
const comboNano = R.sugerirOfertas([nano], catalogo, ['combo'])[0];
t('combo de ticket alto usa o complemento mais barato, não outro serviço caro', comboNano.titulo.includes('Design com Henna'), comboNano.titulo);
t('justificativa compara com a mediana do mercado', /mediana|média do que o mercado/.test(combo.justificativa), combo.justificativa);
t('mediana encontrada para lash lifting', R.medianaPara('Lash Lifting')?.mediana === 130);
t('sem régua para nanofios (dado do mercado não é comparável)', R.medianaPara('Nanofios') === null);
t('sem régua inventada para brow lamination', R.medianaPara('Brow Lamination') === null);

console.log('\nX1 e bot');
const ofertas = [{ servico: 'Lash Lifting', titulo: 'Combo primeira visita', detalhe: 'De R$ 230 por R$ 195', aprovada: true }, { servico: 'Nanofios', titulo: 'Nanofios em 3x', detalhe: 'x', aprovada: false }];
const rot = X.montarRoteiroX1({ nome: 'Júlia Roberta', linkAgendamento: 'https://lume.app/julia', ofertas });
t('roteiro só usa ofertas aprovadas', rot.mensagens.length === 1 && !rot.bloco.includes('Nanofios em 3x'));
t('bloco entre marcadores', rot.bloco.startsWith(X.INICIO_BLOCO) && rot.bloco.endsWith(X.FIM_BLOCO));
t('persona vazia ganha a abertura padrão do bot', X.aplicarNaPersona(null, rot.bloco, 'Júlia').startsWith('Você é a atendente da Júlia'));
const persona = 'Você é a Bia, atendente simpática da Júlia.';
const uma = X.aplicarNaPersona(persona, rot.bloco, 'Júlia');
const duas = X.aplicarNaPersona(uma, rot.bloco, 'Júlia');
t('persona existente é preservada', uma.startsWith(persona));
t('reaplicar não duplica o bloco', duas.split(X.INICIO_BLOCO).length === 2 && duas === uma, duas);
t('remover o bloco devolve a persona original', X.removerBloco(uma).trim() === persona);

console.log(`\n${ok} ok, ${falhas} falha(s)\n`);
process.exit(falhas ? 1 : 0);
