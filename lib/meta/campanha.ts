/**
 * O robô monta as campanhas na conta de anúncios DELA a partir do que ela
 * aprovou na aba "Quero mais clientes": ofertas, criativos (as imagens salvas
 * no envio), verba semanal e raio.
 *
 * Regras que não mudam:
 *   - tudo nasce PAUSADO; só vai ao ar quando o admin ativa;
 *   - a verba sai de plan.verba_semanal (mínimo R$ 50/semana), nunca do cliente;
 *   - ativar exige conta de anúncios ativa e com forma de pagamento.
 *
 * Funis (regras.ts): até R$ 149/semana só WhatsApp (X1); a partir de R$ 150,
 * WhatsApp (60%) + página de agendamento (40%).
 */

import { graph } from './graph';
import { textoDoAnuncio, linkComOrigem, specCampanha, specConjunto, specCriativo, type Local } from './specs';
import { baixarArquivo } from '@/lib/mais-clientes/store';
import { verbaDiaria } from '@/lib/mais-clientes/regras';
import type { CampanhaMeta, CriativoSalvo, GrowthMeta, GrowthProgram } from '@/types/mais-clientes';

export interface ContextoCampanha {
  /** Nome que aparece nos nomes das campanhas (marca dela). */
  nome: string;
  endereco: string;
  cidade: string;
  uf: string;
  /** Página de agendamento dela no Lume (funil "página"). */
  linkAgendamento: string;
}

const NOMES_MOLDE: Record<string, string> = {
  'antes-depois-cidade': 'Antes e depois', 'dourado-preco': 'Selo de preço', faixa: 'Faixa', circulos: 'Dois círculos',
};

// ───────────────────────────── Localização ─────────────────────────────

/** Centro do raio: o endereço dela; sem endereço, o centro da cidade (OpenStreetMap). */
export async function localizar(endereco: string, cidade: string, uf: string): Promise<Local | null> {
  const buscar = async (q: string) => {
    const u = new URL('https://nominatim.openstreetmap.org/search');
    u.searchParams.set('format', 'jsonv2');
    u.searchParams.set('limit', '1');
    u.searchParams.set('countrycodes', 'br');
    u.searchParams.set('q', q);
    const r = await fetch(u, { headers: { 'User-Agent': 'Lume/1.0 (contato@lumepage.com.br)' }, signal: AbortSignal.timeout(10_000) });
    const j = await r.json().catch(() => []) as { lat: string; lon: string }[];
    return j[0] ? { lat: Number(j[0].lat), lng: Number(j[0].lon) } : null;
  };
  const lugar = [cidade, uf, 'Brasil'].filter(Boolean).join(', ');
  if (endereco.trim()) {
    const e = await buscar(`${endereco}, ${lugar}`);
    if (e) return { ...e, fonte: 'endereco' };
  }
  const c = cidade ? await buscar(lugar) : null;
  return c ? { ...c, fonte: 'cidade' } : null;
}

// ───────────────────────────── Execução na Meta ─────────────────────────────

async function subirImagem(contaId: string, c: CriativoSalvo): Promise<string> {
  const arquivo = await baixarArquivo(c.path);
  if (!arquivo) throw new Error('Não encontrei a imagem de um criativo. Peça para ela enviar para a equipe de novo.');
  const r = await graph<{ images: Record<string, { hash: string }> }>(`${contaId}/adimages`, {
    metodo: 'POST',
    params: { bytes: Buffer.from(arquivo.bytes).toString('base64'), name: `${c.service_id}-${c.molde}.jpg` },
  });
  const hash = Object.values(r.images ?? {})[0]?.hash;
  if (!hash) throw new Error('A Meta não devolveu a imagem enviada.');
  return hash;
}

async function criarUma(funil: CampanhaMeta['funil'], verbaCents: number, p: GrowthProgram, ctx: ContextoCampanha, local: Local, hashes: Map<string, string>, por: string): Promise<CampanhaMeta> {
  const meta = p.meta!;
  const plano = p.plan!;
  const conta = meta.ad_account_id;
  const quando = new Date().toLocaleDateString('pt-BR');
  const rotulo = funil === 'x1' ? 'WhatsApp' : 'Página';
  const campanha = await graph<{ id: string }>(`${conta}/campaigns`, {
    metodo: 'POST', params: specCampanha(`Lume · ${ctx.nome} · ${rotulo} · ${quando}`, funil, verbaCents),
  });
  try {
    const conjunto = await graph<{ id: string }>(`${conta}/adsets`, {
      metodo: 'POST', params: specConjunto(`${rotulo} · ${plano.raio_km} km`, funil, campanha.id, meta.page_id, local, plano.raio_km),
    });
    const ofertas = new Map(plano.ofertas.filter(o => o.aprovada).map(o => [o.service_id, o]));
    const link = funil === 'pagina' ? linkComOrigem(ctx.linkAgendamento, 'lume-assessoria') : '';
    const anuncios: string[] = [];
    for (const c of plano.criativos ?? []) {
      const o = ofertas.get(c.service_id);
      const hash = hashes.get(c.path);
      if (!o || !hash) continue;
      const nome = `${o.servico} · ${NOMES_MOLDE[c.molde] ?? c.molde}`;
      const criativo = await graph<{ id: string }>(`${conta}/adcreatives`, {
        metodo: 'POST',
        params: specCriativo(nome, funil, {
          pageId: meta.page_id, igId: meta.ig_id, imageHash: hash,
          mensagem: textoDoAnuncio(o, ctx.cidade, funil), titulo: o.titulo, link,
        }),
      });
      const anuncio = await graph<{ id: string }>(`${conta}/ads`, {
        metodo: 'POST', params: { name: nome, adset_id: conjunto.id, creative: { creative_id: criativo.id }, status: 'PAUSED' },
      });
      anuncios.push(anuncio.id);
    }
    if (!anuncios.length) throw new Error('Nenhum criativo casou com uma oferta aprovada.');
    return {
      funil, campaign_id: campanha.id, adset_id: conjunto.id, ad_ids: anuncios, verba_diaria_cents: verbaCents,
      status: 'pausada', criada_em: new Date().toISOString(), criada_por: por, ativada_em: null,
    };
  } catch (e) {
    // Não deixa campanha pela metade na conta dela.
    await graph(campanha.id, { metodo: 'DELETE' }).catch(() => {});
    throw e;
  }
}

/** Cria as campanhas (pausadas) e devolve o `meta` atualizado para gravar. */
export async function criarCampanhas(p: GrowthProgram, ctx: ContextoCampanha, por: string): Promise<GrowthMeta> {
  const meta = p.meta;
  const plano = p.plan;
  if (!meta) throw new Error('Vincule a conta de anúncios e a Página dela primeiro.');
  if (!plano?.enviado_em) throw new Error('Ela ainda não mandou a estruturação para a equipe.');
  if (meta.campanhas?.length) throw new Error('Essa conta já tem campanha do robô. Pause ou apague antes de montar outra.');
  if (!plano.criativos?.length) throw new Error('Não há criativos salvos. Peça para ela enviar para a equipe de novo.');

  const local = meta.local ?? await localizar(ctx.endereco, ctx.cidade, ctx.uf);
  if (!local) throw new Error('Não achei a localização dela para o raio. Confira cidade e endereço no cadastro.');

  const hashes = new Map<string, string>();
  for (const c of plano.criativos) hashes.set(c.path, await subirImagem(meta.ad_account_id, c));

  const verbas = verbaDiaria(plano.verba_semanal, plano.funil);
  const campanhas: CampanhaMeta[] = [await criarUma('x1', verbas.x1, p, ctx, local, hashes, por)];
  if (verbas.pagina && ctx.linkAgendamento) {
    try {
      campanhas.push(await criarUma('pagina', verbas.pagina, p, ctx, local, hashes, por));
    } catch (e) {
      await graph(campanhas[0].campaign_id, { metodo: 'DELETE' }).catch(() => {});
      throw e;
    }
  }
  return { ...meta, local, campanhas };
}

/** Coloca no ar. Confere antes se a conta dela está ativa e tem como pagar. */
export async function ativarCampanhas(meta: GrowthMeta): Promise<GrowthMeta> {
  if (!meta.campanhas?.length) throw new Error('Monte a campanha primeiro.');
  const conta = await graph<{ account_status: number; funding_source?: string }>(meta.ad_account_id, { params: { fields: 'account_status,funding_source' } });
  if (conta.account_status !== 1) throw new Error('A conta de anúncios dela não está ativa na Meta.');
  if (!conta.funding_source) throw new Error('A conta de anúncios dela ainda não tem forma de pagamento (cartão ou Pix).');
  const agora = new Date().toISOString();
  for (const c of meta.campanhas) {
    for (const id of [...c.ad_ids, c.adset_id, c.campaign_id]) await graph(id, { metodo: 'POST', params: { status: 'ACTIVE' } });
  }
  return { ...meta, campanhas: meta.campanhas.map(c => ({ ...c, status: 'ativa', ativada_em: c.ativada_em ?? agora })) };
}

/** Pausa tudo (a campanha pausada segura conjunto e anúncios). */
export async function pausarCampanhas(meta: GrowthMeta): Promise<GrowthMeta> {
  for (const c of meta.campanhas ?? []) await graph(c.campaign_id, { metodo: 'POST', params: { status: 'PAUSED' } });
  return { ...meta, campanhas: (meta.campanhas ?? []).map(c => ({ ...c, status: 'pausada' })) };
}

/** Apaga as campanhas do robô na conta dela (para montar de novo). */
export async function apagarCampanhas(meta: GrowthMeta): Promise<GrowthMeta> {
  for (const c of meta.campanhas ?? []) await graph(c.campaign_id, { metodo: 'DELETE' }).catch(() => {});
  return { ...meta, campanhas: [] };
}

/** Link direto para a campanha no Gerenciador de Anúncios. */
export const linkGerenciador = (contaId: string, campaignId: string) =>
  `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${contaId.replace(/^act_/, '')}&selected_campaign_ids=${campaignId}`;
