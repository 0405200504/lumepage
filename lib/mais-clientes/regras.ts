/**
 * ============================================================================
 * "Quero mais clientes" · regras puras
 * ============================================================================
 * Nada aqui toca banco, rede ou IA: é o que decide raio, verba, funil, nota do
 * diagnóstico e a oferta sugerida. Fica separado para ser testável
 * (scripts/test-mais-clientes.mts) e para a mesma regra valer no painel, no
 * admin e no que for ao ar.
 */

import type {
  AssetSlot, CondicaoOferta, DiagItem, EtapaId, GrowthAsset, GrowthIntake, GrowthProgram, OfertaPlano, TipoOferta,
} from '@/types/mais-clientes';

// ───────────────────────────── Verba e funil ─────────────────────────────

/** Verba mínima de mídia por semana (R$). Abaixo disso o anúncio não aprende. */
export const VERBA_MINIMA = 50;
/**
 * A partir daqui dá para testar os dois funis (X1 e página) ao mesmo tempo.
 * Abaixo, dividir a verba deixa cada um sem dado: roda só o X1.
 */
export const VERBA_FUNIL_DUPLO = 150;
/** Com os dois funis, quanto da verba vai para o WhatsApp (o resto vai para a página). */
export const PARTE_X1 = 0.6;

/** Moldes de criativo (Criativos.tsx) — o servidor só aceita estes. */
export const MOLDES_IDS = ['antes-depois-cidade', 'dourado-preco', 'faixa', 'circulos'] as const;

/**
 * Verba diária de cada campanha, em centavos, a partir da verba semanal que
 * ela escolheu. Nunca abaixo do mínimo de R$ 50 por semana.
 */
export function verbaDiaria(verbaSemanal: number, funil: 'x1' | 'x1_e_pagina'): { x1: number; pagina: number } {
  const total = Math.round((Math.max(VERBA_MINIMA, verbaSemanal) * 100) / 7);
  if (funil === 'x1') return { x1: total, pagina: 0 };
  const x1 = Math.round(total * PARTE_X1);
  return { x1, pagina: total - x1 };
}

export function funilPara(verbaSemanal: number): 'x1' | 'x1_e_pagina' {
  return verbaSemanal >= VERBA_FUNIL_DUPLO ? 'x1_e_pagina' : 'x1';
}

/** Verba válida: número inteiro de reais, mínimo R$ 50, sem máximo. */
export function normalizarVerba(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(VERBA_MINIMA, n) : VERBA_MINIMA;
}

/** Teto de aumento automático: nunca abaixo da verba escolhida. */
export function normalizarTeto(teto: unknown, verba: number): number {
  const n = Math.round(Number(teto));
  return Number.isFinite(n) ? Math.max(verba, n) : verba * 2;
}

// ───────────────────────────── Raio ─────────────────────────────

/** Cidade grande = raio de 25 km. Interior = 15 km. */
export const RAIO_INTERIOR = 15;
export const RAIO_CIDADE_GRANDE = 25;

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Capitais e municípios com mais de ~500 mil habitantes. */
const CIDADES_GRANDES = new Set([
  'sao paulo', 'rio de janeiro', 'belo horizonte', 'brasilia', 'salvador', 'fortaleza', 'curitiba', 'manaus',
  'recife', 'goiania', 'belem', 'porto alegre', 'sao luis', 'maceio', 'campo grande', 'natal', 'teresina',
  'joao pessoa', 'aracaju', 'cuiaba', 'florianopolis', 'porto velho', 'macapa', 'rio branco', 'boa vista',
  'vitoria', 'palmas',
  'guarulhos', 'campinas', 'sao goncalo', 'duque de caxias', 'nova iguacu', 'sao bernardo do campo',
  'santo andre', 'osasco', 'ribeirao preto', 'uberlandia', 'contagem', 'sorocaba', 'joinville', 'londrina',
  'juiz de fora', 'feira de santana', 'aparecida de goiania', 'ananindeua', 'serra', 'niteroi',
  'caxias do sul', 'belford roxo', 'campos dos goytacazes', 'sao jose dos campos', 'vila velha',
  'jaboatao dos guararapes', 'maua', 'diadema', 'carapicuiba', 'betim', 'santos', 'montes claros',
]);

export function raioPadrao(cidade?: string | null): number {
  if (!cidade) return RAIO_INTERIOR;
  return CIDADES_GRANDES.has(semAcento(cidade)) ? RAIO_CIDADE_GRANDE : RAIO_INTERIOR;
}

// ───────────────────────────── Fotos ─────────────────────────────

export interface SlotInfo {
  slot: AssetSlot;
  titulo: string;
  dica: string;
  /** Uma por serviço em foco (antes/depois/resultado) ou uma só. */
  porServico: boolean;
  /** Mostra cliente: exige a autorização de uso da imagem. */
  exigeAutorizacao: boolean;
}

export const SLOTS: SlotInfo[] = [
  { slot: 'ela', titulo: 'Uma foto sua', dica: 'Rosto bem iluminado, de frente, sorrindo. Pode ser selfie com luz de janela.', porServico: false, exigeAutorizacao: false },
  { slot: 'atendendo', titulo: 'Você atendendo', dica: 'Você fazendo o procedimento, de luvas, com a cliente na maca ou na cadeira.', porServico: false, exigeAutorizacao: true },
  { slot: 'espaco', titulo: 'Seu espaço', dica: 'O lugar onde você atende, arrumado e com luz natural.', porServico: false, exigeAutorizacao: false },
  { slot: 'antes', titulo: 'Antes', dica: 'Mesma cliente, mesmo ângulo e mesma luz do "depois". Sem filtro.', porServico: true, exigeAutorizacao: true },
  { slot: 'depois', titulo: 'Depois', dica: 'Mesmo ângulo e mesma luz do "antes". Sem filtro e sem retoque.', porServico: true, exigeAutorizacao: true },
  { slot: 'resultado', titulo: 'Close do resultado', dica: 'Bem de perto, foco no resultado. Sem filtro.', porServico: true, exigeAutorizacao: true },
  { slot: 'video', titulo: 'Vídeo curto (opcional)', dica: 'De 10 a 30 segundos: o processo ou o resultado. Vídeo é o formato que mais roda nos anúncios.', porServico: false, exigeAutorizacao: true },
];

export const slotInfo = (slot: AssetSlot) => SLOTS.find(s => s.slot === slot)!;

/** Menor lado mínimo para uma foto servir de anúncio (px). */
export const LADO_MINIMO = 600;

/**
 * Checagem de qualidade. Recebe medidas que o navegador calcula ao reduzir a
 * foto (largura, altura e brilho médio de 0 a 255) e devolve os avisos em
 * linguagem dela. Não bloqueia: avisa e deixa ela decidir.
 */
export function avaliarFoto(m: { width: number; height: number; brilho: number }): { ok: boolean; avisos: string[] } {
  const avisos: string[] = [];
  if (Math.min(m.width, m.height) < LADO_MINIMO) avisos.push('A foto está pequena: fica borrada no anúncio. Se tiver uma maior, prefira.');
  if (m.brilho < 70) avisos.push('A foto está escura. Tente com luz de janela ou ring light.');
  if (m.brilho > 225) avisos.push('A foto está estourada de luz: os detalhes somem.');
  return { ok: avisos.length === 0, avisos };
}

// ───────────────────────────── Etapas ─────────────────────────────

export const ETAPAS: { id: EtapaId; titulo: string; resumo: string }[] = [
  { id: 'negocio', titulo: 'Seu negócio', resumo: 'O que você faz, para quem e o que aceita oferecer' },
  { id: 'fotos', titulo: 'Fotos e vídeos', resumo: 'O material real que vira anúncio' },
  { id: 'diagnostico', titulo: 'Instagram e Google', resumo: 'Diagnóstico com o passo a passo para ajustar' },
  { id: 'estrutura', titulo: 'Seu canal de clientes', resumo: 'Ofertas, criativos, WhatsApp e verba' },
];

/** Fotos mínimas para seguir: uma sua, uma do trabalho e uma de resultado. */
export function fotosMinimasOk(assets: GrowthAsset[], intake: Partial<GrowthIntake>): boolean {
  const tem = (slot: AssetSlot) => assets.some(a => a.slot === slot);
  const prioritario = intake.servico_prioritario || intake.servicos_foco?.[0] || null;
  const resultadoDoFoco = assets.some(a =>
    (a.slot === 'resultado' || a.slot === 'depois') && (!prioritario || a.service_id === prioritario));
  return tem('ela') && (tem('atendendo') || tem('espaco')) && resultadoDoFoco;
}

export function etapasConcluidas(p: Pick<GrowthProgram, 'intake' | 'assets' | 'diagnosis' | 'plan'>): Record<EtapaId, boolean> {
  const diagOk = (x?: { perfil_valido: boolean }) => !!x && x.perfil_valido;
  return {
    negocio: !!p.intake?.concluido_em,
    fotos: fotosMinimasOk(p.assets || [], p.intake || {}),
    diagnostico: diagOk(p.diagnosis?.instagram) && diagOk(p.diagnosis?.google),
    estrutura: !!p.plan?.enviado_em,
  };
}

/** Primeira etapa não concluída (ou a última, se tudo pronto). */
export function etapaAtual(p: Pick<GrowthProgram, 'intake' | 'assets' | 'diagnosis' | 'plan'>): EtapaId {
  const feitas = etapasConcluidas(p);
  return ETAPAS.find(e => !feitas[e.id])?.id ?? 'estrutura';
}

// ───────────────────────────── Diagnóstico ─────────────────────────────

/**
 * Nota de 0 a 10 a partir dos itens. "ok" e "dica" valem 1 (dica é melhoria
 * opcional, não defeito), "ajustar" vale meio, "falta" vale zero. Item que não
 * apareceu no print fica fora da conta: o perfil não perde ponto pelo que a
 * gente não viu. 10/10 = tudo que apareceu está certo.
 */
export function notaDosItens(itens: Pick<DiagItem, 'status'>[]): { nota: number; dezDeDez: boolean; naoVistos: number } {
  const vistos = itens.filter(i => i.status !== 'nao_visto');
  const naoVistos = itens.length - vistos.length;
  if (!vistos.length) return { nota: 0, dezDeDez: false, naoVistos };
  const pontos = vistos.reduce((s, i) => s + (i.status === 'ok' || i.status === 'dica' ? 1 : i.status === 'ajustar' ? 0.5 : 0), 0);
  const nota = Math.round((pontos / vistos.length) * 100) / 10;
  return { nota, dezDeDez: nota === 10, naoVistos };
}

// ───────────────────────────── Ofertas ─────────────────────────────

/**
 * Mediana dos preços que aparecem nos anúncios ativos do nicho (coleta da
 * Biblioteca de Anúncios, out/2026, ~3.300 anúncios). Serve de régua: mostra
 * se o preço dela está acima ou abaixo do que o mercado anuncia.
 *
 * Só entram serviços com amostra boa (9+ anúncios com preço) e preço
 * comparável. Ficaram de fora micropigmentação (mistura retoque, promoção e
 * procedimento completo), criolipólise e maquiagem social (poucos anúncios) e
 * brow lamination (sem dado): sem régua confiável, a tela diz que não há
 * referência em vez de assustar com uma comparação torta.
 */
export const MEDIANAS: { padrao: RegExp; servico: string; mediana: number }[] = [
  { padrao: /lash lifting|lifting de c[íi]lios/i, servico: 'Lash lifting', mediana: 130 },
  { padrao: /henna|tintura/i, servico: 'Design + henna', mediana: 50 },
  { padrao: /design de sobrancelha|sobrancelha/i, servico: 'Design de sobrancelha', mediana: 70 },
  { padrao: /extens[ãa]o de c[íi]lios|volume|c[íi]lios/i, servico: 'Extensão de cílios', mediana: 110 },
  { padrao: /p[ée] e m[ãa]o|manicure.*pedicure/i, servico: 'Manicure + pedicure', mediana: 80 },
  { padrao: /alongamento|fibra|acr[íi]lico|unha de gel|unhas de gel/i, servico: 'Alongamento de unhas', mediana: 135 },
  { padrao: /esmalta[çc][ãa]o/i, servico: 'Esmaltação em gel', mediana: 80 },
  { padrao: /progressiva|alisamento/i, servico: 'Progressiva', mediana: 150 },
  { padrao: /mechas|loiro|luzes|morena iluminada|balayage/i, servico: 'Mechas / loiro', mediana: 389 },
  { padrao: /corte/i, servico: 'Corte feminino', mediana: 100 },
  { padrao: /noiva/i, servico: 'Maquiagem de noiva', mediana: 699 },
  { padrao: /limpeza de pele/i, servico: 'Limpeza de pele', mediana: 100 },
  { padrao: /botox|toxina/i, servico: 'Botox', mediana: 550 },
  { padrao: /drenagem/i, servico: 'Drenagem linfática', mediana: 100 },
  { padrao: /laser|depila/i, servico: 'Depilação a laser', mediana: 60 },
];

export function medianaPara(nomeServico: string): { servico: string; mediana: number } | null {
  const m = MEDIANAS.find(x => x.padrao.test(nomeServico));
  return m ? { servico: m.servico, mediana: m.mediana } : null;
}

export interface ServicoBase {
  id: string;
  name: string;
  price_cents: number;
}

const reais = (cents: number) => Math.round(cents / 100);
export const brl = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Desconto de primeira visita na oferta avulsa (o alvo; o preço final termina em 9). */
const DESCONTO_PRIMEIRA = 0.15;
/** Combo: o serviço adicional sai pela metade, e o desconto total nunca passa de 20%. */
const DESCONTO_COMBO_MAX = 0.2;

/**
 * Preço de anúncio: desce para o "9" mais próximo (R$ 195 → R$ 189,
 * R$ 136 → R$ 129) desde que o desconto total não passe do teto. Se passar,
 * fica no real inteiro.
 */
export function precoCharmoso(cents: number, cheioCents: number, tetoDesconto: number): number {
  const inteiro = Math.floor(cents / 100);
  const charme = (Math.floor((inteiro + 1) / 10) * 10 - 1) * 100;
  return charme > 0 && charme >= cheioCents * (1 - tetoDesconto) ? charme : inteiro * 100;
}

function comparacaoMercado(s: ServicoBase): string {
  const m = medianaPara(s.name);
  if (!m) return 'Sem referência de preço desse serviço nos anúncios coletados.';
  const p = reais(s.price_cents);
  const dif = Math.round(((p - m.mediana) / m.mediana) * 100);
  if (Math.abs(dif) <= 10) return `Seu preço (R$ ${p}) está na média do que o mercado anuncia (R$ ${m.mediana}).`;
  return dif > 0
    ? `Seu preço (R$ ${p}) está ${dif}% acima da mediana dos anúncios (R$ ${m.mediana}): a oferta precisa mostrar por que vale mais.`
    : `Seu preço (R$ ${p}) está ${Math.abs(dif)}% abaixo da mediana dos anúncios (R$ ${m.mediana}): dá para anunciar sem desconto.`;
}

/**
 * As ofertas das primeiras semanas de teste, só com as condições que ELA
 * marcou como aceitáveis (nada vai ao ar sem ela aprovar):
 *
 *   - UM combo bem atrativo, no serviço que ela mais quer encher (se ela
 *     aceita combo e há um serviço complementar barato);
 *   - os outros serviços com oferta AVULSA, de tipos diferentes entre si
 *     sempre que dá — cada uma testa um ângulo (preço, brinde, avaliação...).
 *
 * Depois das primeiras semanas, a equipe troca o que não trouxe conversa.
 */
export function sugerirOfertas(
  foco: ServicoBase[],
  catalogo: ServicoBase[],
  condicoes: CondicaoOferta[] = [],
  brinde = '',
  prioritario: string | null = null,
): OfertaPlano[] {
  const aceita = (c: CondicaoOferta) => condicoes.includes(c);
  const base = (s: ServicoBase) => ({ service_id: s.id, servico: s.name, preco_atual_cents: s.price_cents, aprovada: false });

  // 1. O combo: no prioritário; se ele não tiver complemento, no próximo que tiver.
  const ordem = [...foco].sort((a, b) => Number(b.id === prioritario) - Number(a.id === prioritario));
  const complementoDe = (s: ServicoBase) => catalogo
    .filter(c => c.id !== s.id && c.price_cents > 0 && c.price_cents <= s.price_cents * 0.6)
    .sort((a, b) => a.price_cents - b.price_cents)[0];
  const doCombo = aceita('combo') ? ordem.find(s => complementoDe(s)) ?? null : null;

  // 2. As avulsas: cada serviço tenta primeiro um tipo que outra avulsa ainda não usou.
  const usados = new Set<TipoOferta>();
  const ofertas = new Map<string, OfertaPlano>();
  for (const s of ordem) {
    if (s.id === doCombo?.id) {
      ofertas.set(s.id, combo(s, complementoDe(s)!));
      continue;
    }
    // Variar o tipo só entre ofertas de verdade: repetir um desconto é melhor que cair no preço cheio.
    const possiveis = avulsasPossiveis(s, aceita, brinde);
    const reais = possiveis.filter(o => o.tipo !== 'preco_atual');
    const escolhida = reais.find(o => !usados.has(o.tipo)) ?? reais[0] ?? possiveis[0];
    usados.add(escolhida.tipo);
    ofertas.set(s.id, escolhida);
  }
  return foco.map(s => ofertas.get(s.id)!);

  function combo(s: ServicoBase, complemento: ServicoBase): OfertaPlano {
    const cheio = s.price_cents + complemento.price_cents;
    const desconto = Math.min(Math.round(complemento.price_cents * 0.5), Math.round(cheio * DESCONTO_COMBO_MAX));
    const preco = precoCharmoso(cheio - desconto, cheio, DESCONTO_COMBO_MAX);
    return {
      ...base(s), tipo: 'combo',
      titulo: `Combo primeira visita: ${s.name} + ${complemento.name}`,
      detalhe: `De ${brl(cheio)} por ${brl(preco)}`,
      preco_oferta_cents: preco,
      justificativa: `A oferta carro-chefe: combo com um serviço seu que custa menos, então a cliente sente vantagem e você ganha um atendimento mais longo. ${comparacaoMercado(s)}`,
    };
  }

  /** Avulsas que ela aceita para esse serviço, da que mais converte em anúncio para a que menos. */
  function avulsasPossiveis(s: ServicoBase, ok: (c: CondicaoOferta) => boolean, mimo: string): OfertaPlano[] {
    const p = s.price_cents;
    const mercado = comparacaoMercado(s);
    const caro = p >= 30000;
    const lista: OfertaPlano[] = [];
    const desconto = (): OfertaPlano => {
      const preco = precoCharmoso(Math.round(p * (1 - DESCONTO_PRIMEIRA)), p, 0.2);
      return {
        ...base(s), tipo: 'desconto_primeira',
        titulo: `${s.name} por ${brl(preco)} na primeira visita`,
        detalhe: `De ${brl(p)} por ${brl(preco)} na primeira visita`,
        preco_oferta_cents: preco,
        justificativa: `Preço de primeira visita é o que mais faz a cliente nova mandar mensagem, e quem já é sua cliente continua no preço normal. ${mercado}`,
      };
    };
    const comBrinde = (): OfertaPlano => ({
      ...base(s), tipo: 'brinde',
      titulo: `${s.name} + ${mimo.trim()} de brinde`,
      detalhe: `${brl(p)}, com ${mimo.trim()} de presente na primeira visita`,
      preco_oferta_cents: null,
      justificativa: `Brinde de custo baixo mantém o preço cheio e ainda dá motivo para agendar agora. ${mercado}`,
    });
    const avaliacao = (): OfertaPlano => ({
      ...base(s), tipo: 'avaliacao_gratis',
      titulo: `Avaliação gratuita de ${s.name}`,
      detalhe: `Avaliação sem custo; o procedimento sai por ${brl(p)}`,
      preco_oferta_cents: null,
      justificativa: `Avaliação gratuita tira o medo de comprar sem conhecer: é a porta de entrada que mais aparece nos anúncios de procedimento. ${mercado}`,
    });
    const parcelas = (): OfertaPlano => {
      const parcela = Math.ceil(p / 3 / 100) * 100;
      return {
        ...base(s), tipo: 'parcelamento',
        titulo: `${s.name} em até 3x de ${brl(parcela)}`,
        detalhe: `${brl(p)} ou 3x de ${brl(parcela)} no cartão`,
        preco_oferta_cents: null,
        justificativa: `Em serviço de ticket alto, mostrar a parcela no anúncio derruba a objeção de preço. ${mercado}`,
      };
    };
    // Ticket alto: avaliação e parcela primeiro (o desconto pesa mais). Ticket baixo: preço primeiro.
    const ordemTipos: CondicaoOferta[] = caro
      ? ['avaliacao_gratis', 'parcelamento', 'desconto_primeira', 'brinde']
      : ['desconto_primeira', 'brinde', 'avaliacao_gratis'];
    for (const tipo of ordemTipos) {
      if (!ok(tipo)) continue;
      if (tipo === 'desconto_primeira') lista.push(desconto());
      if (tipo === 'brinde' && mimo.trim()) lista.push(comBrinde());
      if (tipo === 'avaliacao_gratis') lista.push(avaliacao());
      if (tipo === 'parcelamento' && caro) lista.push(parcelas());
    }
    lista.push({
      ...base(s), tipo: 'preco_atual',
      titulo: `${s.name} por ${brl(p)}`,
      detalhe: 'Sem desconto: o anúncio destaca o resultado e o que já está incluso',
      preco_oferta_cents: null,
      justificativa: `Você não marcou uma condição que sirva para este serviço. Se aceitar desconto na primeira visita ou um brinde, a oferta fica mais forte. ${mercado}`,
    });
    return lista;
  }
}

/** Serviço com o texto de preço que vai no criativo. */
export function precoDoAnuncio(o: Pick<OfertaPlano, 'preco_oferta_cents' | 'preco_atual_cents'>): string {
  return brl(o.preco_oferta_cents ?? o.preco_atual_cents);
}
