/**
 * O formato do que o robô manda para a Graph API (campanha, conjunto e
 * criativo) e os textos do anúncio. Funções puras: testadas em
 * scripts/test-meta.mts sem rede e sem banco.
 */

import type { CampanhaMeta, GrowthMeta, OfertaPlano } from '@/types/mais-clientes';

export type Local = NonNullable<GrowthMeta['local']>;

/** Texto principal do anúncio: a oferta aprovada e o que fazer. */
export function textoDoAnuncio(o: Pick<OfertaPlano, 'titulo' | 'detalhe'>, cidade: string, funil: CampanhaMeta['funil']): string {
  const fim = funil === 'x1' ? 'Toque em "Enviar mensagem" e agende pelo WhatsApp.' : 'Toque em "Reservar" e escolha o seu horário.';
  return [`${o.titulo}${cidade ? ` em ${cidade}` : ''}.`, o.detalhe, fim].filter(Boolean).join('\n');
}

export function linkComOrigem(link: string, campanha: string): string {
  const u = new URL(link);
  u.searchParams.set('utm_source', 'meta');
  u.searchParams.set('utm_medium', 'anuncio');
  u.searchParams.set('utm_campaign', campanha);
  return u.toString();
}

export function specCampanha(nome: string, funil: CampanhaMeta['funil'], verbaCents: number) {
  return {
    name: nome,
    objective: funil === 'x1' ? 'OUTCOME_ENGAGEMENT' : 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    buying_type: 'AUCTION',
    special_ad_categories: [],
    // Verba na campanha: a Meta divide entre os anúncios que trazem resultado.
    daily_budget: verbaCents,
    bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
  };
}

export function specConjunto(nome: string, funil: CampanhaMeta['funil'], campaignId: string, pageId: string, local: Local, raioKm: number) {
  return {
    name: nome,
    campaign_id: campaignId,
    status: 'PAUSED',
    billing_event: 'IMPRESSIONS',
    optimization_goal: funil === 'x1' ? 'CONVERSATIONS' : 'LINK_CLICKS',
    destination_type: funil === 'x1' ? 'WHATSAPP' : 'WEBSITE',
    ...(funil === 'x1' ? { promoted_object: { page_id: pageId } } : {}),
    targeting: {
      geo_locations: {
        custom_locations: [{ latitude: local.lat, longitude: local.lng, radius: Math.min(80, Math.max(1, Math.round(raioKm))), distance_unit: 'kilometer' }],
        location_types: ['home', 'recent'],
      },
      age_min: 18,
      targeting_automation: { advantage_audience: 1 },
    },
  };
}

export function specCriativo(nome: string, funil: CampanhaMeta['funil'], a: {
  pageId: string; igId: string | null; imageHash: string; mensagem: string; titulo: string; link: string;
}) {
  return {
    name: nome,
    object_story_spec: {
      page_id: a.pageId,
      ...(a.igId ? { instagram_user_id: a.igId } : {}),
      link_data: {
        image_hash: a.imageHash,
        message: a.mensagem,
        name: a.titulo,
        link: funil === 'x1' ? 'https://api.whatsapp.com/send' : a.link,
        call_to_action: funil === 'x1'
          ? { type: 'WHATSAPP_MESSAGE', value: { app_destination: 'WHATSAPP' } }
          : { type: 'BOOK_NOW', value: { link: a.link } },
      },
    },
  };
}
