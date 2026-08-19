/** Catálogo de planos — tipos e fallback. Fora do arquivo 'use server', que só pode
 *  exportar funções assíncronas. */

export interface PlanRow {
  key: string;
  name: string;
  price_cents: number;
  billing_cycle: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
}

/** Usado enquanto a migration v33 (tabela `plans`) não roda. */
export const FALLBACK_PLANS: PlanRow[] = [
  { key: 'start', name: 'Start', price_cents: 4900, billing_cycle: 'monthly', description: 'Agenda, serviços e link público.', is_active: true, sort_order: 1 },
  { key: 'pro', name: 'Pro', price_cents: 9900, billing_cycle: 'monthly', description: 'Tudo do Start + financeiro, CRM e vendas.', is_active: true, sort_order: 2 },
  { key: 'premium', name: 'Premium', price_cents: 14900, billing_cycle: 'monthly', description: 'Tudo do Pro + bot de WhatsApp e Minha Página.', is_active: true, sort_order: 3 },
];
