/**
 * Fonte única da verdade sobre o que cada plano entrega.
 * "nada mais, nada menos": um recurso só é liberado se o plano da profissional
 * alcança o plano mínimo exigido por ele. Recursos não listados aqui são base
 * (liberados em todos os planos, inclusive Start).
 *
 * Puro (sem dependências de servidor) — pode ser usado no client e no server.
 */

import { CHECKOUT } from '@/lib/lp/site';

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
  whatsappBot: 'WhatsApp com mensagens automáticas',
  advancedReports: 'Relatórios avançados',
  commissions: 'Comissões automáticas',
};

/**
 * Checkout anual da Hubla por plano (usado no CTA de upgrade).
 *
 * Derivado de `CHECKOUT` de propósito: o webhook reconhece a compra pelo id do
 * link (lib/subscription/hubla.ts). Link solto aqui viraria uma venda que o
 * webhook não sabe mapear.
 */
export const UPGRADE_CHECKOUT: Record<PlanType, string | null> = {
  start: null,
  pro: CHECKOUT.pro.anual,
  premium: CHECKOUT.premium.anual,
};

/**
 * Marco de virada: contas criadas ANTES desta data são LEGADAS e mantêm acesso
 * cheio — as regras de plano NÃO se aplicam a elas. Só contas novas (criadas a
 * partir daqui) são limitadas pelo plano. Ajuste esta data para o momento do
 * lançamento das regras de plano.
 */
export const ENTITLEMENTS_CUTOFF = new Date('2026-07-03T00:00:00-03:00');

/** Conta legada (criada antes do marco) → nunca é limitada por plano. */
export function isLegacyAccount(createdAt?: string | Date | null): boolean {
  if (!createdAt) return false; // sem data → trata como nova
  return new Date(createdAt) < ENTITLEMENTS_CUTOFF;
}

/**
 * As regras de plano só valem para conta NOVA com assinatura ATIVA.
 * Legadas e contas em teste (trial) têm acesso cheio.
 */
export function planEnforced(opts: { createdAt?: string | Date | null; status?: string | null }): boolean {
  if (isLegacyAccount(opts.createdAt)) return false;
  return opts.status === 'active';
}

/** Checagem final de acesso a um recurso, considerando legado/trial/plano. */
export function canAccess(
  prof: { created_at?: string | null; subscription_status?: string | null; subscription_plan?: string | null },
  capability: Capability,
): boolean {
  if (!planEnforced({ createdAt: prof.created_at, status: prof.subscription_status })) return true;
  return can(prof.subscription_plan, capability);
}

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
