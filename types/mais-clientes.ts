/**
 * "Quero mais clientes" — a assessoria de aquisição dentro do painel.
 * Uma linha por profissional (tabela growth_programs, migração v48).
 */

export type GrowthStatus = 'bloqueado' | 'liberado';

/** As quatro etapas da jornada, na ordem em que ela percorre. */
export type EtapaId = 'negocio' | 'fotos' | 'diagnostico' | 'estrutura';

/** Condições que ela aceita oferecer para atrair cliente nova. */
export type CondicaoOferta = 'desconto_primeira' | 'combo' | 'brinde' | 'parcelamento' | 'avaliacao_gratis';

/** O que o Lume ainda não sabia e a profissional respondeu. */
export interface GrowthIntake {
  /** Ids dos serviços em que a assessoria vai trabalhar (até 3). */
  servicos_foco: string[];
  /** O serviço que ela mais quer encher. */
  servico_prioritario: string | null;
  instagram: string;
  google_link: string;
  whatsapp: string;
  cidade: string;
  uf: string;
  /** Raio escolhido por ela; vazio = automático pela cidade. */
  raio_km: number | null;
  domicilio: boolean;
  diferenciais: string;
  cliente_ideal: string;
  condicoes: CondicaoOferta[];
  /** Quando aceita brinde: qual (ex.: "hidratação labial"). */
  brinde: string;
  observacoes: string;
  concluido_em: string | null;
}

/** Tipos de foto pedidos na lista guiada. */
export type AssetSlot = 'ela' | 'atendendo' | 'espaco' | 'antes' | 'depois' | 'resultado' | 'video';

export interface GrowthAsset {
  id: string;
  slot: AssetSlot;
  /** Serviço a que a foto se refere (antes/depois/resultado). */
  service_id: string | null;
  /** Caminho no bucket privado. */
  path: string;
  /** URL assinada, preenchida só na leitura (nunca gravada). */
  url?: string;
  mime: string;
  width?: number;
  height?: number;
  /** As clientes que aparecem autorizaram o uso da imagem. */
  consentimento: boolean;
  qualidade: { ok: boolean; avisos: string[] };
  created_at: string;
}

/** dica = está bom, com uma melhoria opcional (não tira nota). */
export type ItemStatus = 'ok' | 'dica' | 'ajustar' | 'falta' | 'nao_visto';

export interface DiagItem {
  id: string;
  titulo: string;
  status: ItemStatus;
  /** O que a análise enxergou no print. */
  o_que_vimos: string;
  /** Trecho do print que embasa a avaliação (texto como aparece). */
  evidencia?: string;
  /** O que colocar no lugar (texto pronto quando faz sentido, ex.: a bio). */
  sugestao: string;
  /** Ela marcou como feito. */
  feito: boolean;
}

export interface DiagPlataforma {
  /** 0 a 10, calculada a partir dos itens (não vem pronta da IA). */
  nota: number;
  resumo: string;
  itens: DiagItem[];
  gerado_em: string;
  /** O print enviado era mesmo do perfil? */
  perfil_valido: boolean;
}

export interface GrowthDiagnosis {
  instagram?: DiagPlataforma;
  google?: DiagPlataforma;
  /**
   * Caminho de hoje para dar acesso, até a conexão automática ser aprovada.
   * conta_anuncios: a conta de anúncios é DELA (cartão ou Pix dela, pago direto
   * à Meta); a Lume entra como parceira e cobra só a assessoria.
   */
  conexoes: { meta_parceira: boolean; google_gerente: boolean; conta_anuncios?: boolean };
}

export type TipoConexao = keyof GrowthDiagnosis['conexoes'];

export type TipoOferta = CondicaoOferta | 'preco_atual';

export interface OfertaPlano {
  service_id: string;
  servico: string;
  preco_atual_cents: number;
  tipo: TipoOferta;
  titulo: string;
  detalhe: string;
  /** Preço que vai no anúncio (null = o preço de sempre). */
  preco_oferta_cents: number | null;
  /** Por que essa oferta (mediana do mercado, combo possível etc.). */
  justificativa: string;
  aprovada: boolean;
}

export interface GrowthPlan {
  ofertas: OfertaPlano[];
  /** Verba de mídia por semana, em reais. Mínimo R$ 50. */
  verba_semanal: number;
  /** Até onde a verba pode subir sozinha conforme os agendamentos saem (R$/semana). */
  teto_automatico: number;
  raio_km: number;
  funil: 'x1' | 'x1_e_pagina';
  x1_aplicado_em: string | null;
  /** Quando ela mandou tudo para a equipe colocar no ar. */
  enviado_em: string | null;
  /** Criativos renderizados e salvos no envio (o robô sobe estes para a Meta). */
  criativos?: CriativoSalvo[];
}

/** Um criativo montado na tela, salvo como JPEG no bucket privado. */
export interface CriativoSalvo {
  service_id: string;
  /** id do molde (antes-depois-cidade, dourado-preco, faixa, circulos). */
  molde: string;
  w: number;
  h: number;
  path: string;
  criado_em: string;
}

/** Uma campanha que o robô criou na conta de anúncios dela. */
export interface CampanhaMeta {
  /** x1 = conversa no WhatsApp; pagina = página de agendamento. */
  funil: 'x1' | 'pagina';
  campaign_id: string;
  adset_id: string;
  ad_ids: string[];
  /** Verba diária da campanha, em centavos. */
  verba_diaria_cents: number;
  status: 'pausada' | 'ativa';
  criada_em: string;
  criada_por: string;
  ativada_em: string | null;
}

/** Ativos da Meta da profissional que o robô da Lume opera (o admin vincula). */
export interface GrowthMeta {
  /** act_123… */
  ad_account_id: string;
  ad_account_nome: string;
  page_id: string;
  page_nome: string;
  ig_id: string | null;
  ig_username: string | null;
  vinculado_em: string;
  vinculado_por: string;
  /** Centro do raio dos anúncios (endereço dela, ou o centro da cidade). */
  local?: { lat: number; lng: number; fonte: 'endereco' | 'cidade' } | null;
  campanhas?: CampanhaMeta[];
}

/** Onde o robô está com essa conta (mostrado no admin e, traduzido, para ela). */
export type EtapaRobo =
  | 'aguardando_envio'      // ela ainda não enviou a estruturação
  | 'aguardando_acesso'     // a conta/Página dela ainda não apareceu para a Lume
  | 'vinculo_manual'        // apareceu mais de uma opção: o admin escolhe
  | 'aguardando_pagamento'  // campanha montada; falta cartão ou Pix na conta dela
  | 'no_ar'
  | 'erro';

export interface EstadoRobo {
  etapa: EtapaRobo;
  /** Para o admin: o que aconteceu, em uma frase. */
  mensagem: string;
  atualizado_em: string;
  /** O admin pausou, trocou ou desvinculou: o robô não mexe mais sozinho. */
  pausado?: boolean;
  /** Avisos já mandados para ela (não repetir). */
  avisos?: string[];
}

export interface GrowthProgram {
  professional_id: string;
  status: GrowthStatus;
  unlocked_at: string | null;
  unlocked_by: string | null;
  intake: Partial<GrowthIntake>;
  assets: GrowthAsset[];
  diagnosis: GrowthDiagnosis | null;
  plan: GrowthPlan | null;
  meta: GrowthMeta | null;
  robo: EstadoRobo | null;
  created_at: string;
  updated_at: string;
}
