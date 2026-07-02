/**
 * Fonte única da verdade sobre o que cada plano entrega.
 * "nada mais, nada menos": um recurso só é liberado se o plano da profissional
 * alcança o plano mínimo exigido por ele. Recursos não listados aqui são base
 * (liberados em todos os planos, inclusive Start).
 *
 * Puro (sem dependências de servidor) — pode ser usado no client e no server.
 */

export type PlanType = 'start' | 'pro' | 'premium';

export type Capability =
  | 'waitlist'
  | 'blocks'
  | 'sales'
  | 'conversations'
  | 'whatsappBot'
  | 'advancedReports'
  | 'commissions';

const RANK: Record<PlanType, number> = { start: 0, pro: 1, premium: 2 };

/** Plano mínimo exigido por cada recurso. */
const CAPABILITY_MIN_PLAN: Record<Capability, PlanType> = {
  waitlist: 'pro',
  blocks: 'pro',
  sales: 'pro',
  conversations: 'pro',
  whatsappBot: 'premium',
  advancedReports: 'premium',
  commissions: 'premium',
};

/** Rota → recurso exigido (gating de navegação e de rota). */
export const ROUTE_CAPABILITY: Record<string, Capability> = {
  '/dashboard/waitlist': 'waitlist',
  '/dashboard/blocks': 'blocks',
  '/dashboard/sales': 'sales',
  '/dashboard/pending': 'conversations',
  '/dashboard/whatsapp': 'whatsappBot',
};

export const PLAN_LABEL: Record<PlanType, string> = {
  start: 'Start',
  pro: 'Pro',
  premium: 'Premium',
};

export const CAPABILITY_LABEL: Record<Capability, string> = {
  waitlist: 'Lista de espera',
  blocks: 'Bloqueios de horário',
  sales: 'Módulo de Vendas',
  conversations: 'Central de Conversas',
  whatsappBot: 'Bot de WhatsApp com IA',
  advancedReports: 'Relatórios avançados',
  commissions: 'Comissões automáticas',
};

/** Checkout anual da Hubla por plano (usado no CTA de upgrade). */
export const UPGRADE_CHECKOUT: Record<PlanType, string | null> = {
  start: null,
  pro: 'https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok',
  premium: 'https://pay.hub.la/rqw8NXaLwSvl111uEMRH',
};

/** Plano nulo/desconhecido é tratado como Start (o mais restritivo). */
export function resolvePlan(plan?: string | null): PlanType {
  return plan === 'pro' || plan === 'premium' ? plan : 'start';
}

/** A profissional (com este plano) tem direito ao recurso? */
export function can(plan: string | null | undefined, capability: Capability): boolean {
  return RANK[resolvePlan(plan)] >= RANK[CAPABILITY_MIN_PLAN[capability]];
}

/** Plano mínimo que desbloqueia o recurso. */
export function requiredPlan(capability: Capability): PlanType {
  return CAPABILITY_MIN_PLAN[capability];
}

/** Teto de profissionais na agenda por plano. */
export function maxProfessionals(plan?: string | null): number {
  const p = resolvePlan(plan);
  return p === 'premium' ? Infinity : p === 'pro' ? 3 : 1;
}
