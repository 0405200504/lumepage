/**
 * Contrato do webhook da Hubla (payload versão 2.0.0) — parte pura.
 *
 * Aqui mora só a leitura/interpretação do payload e o de-para checkout → plano.
 * Sem Supabase, sem `next/server`: dá pra testar num script Node solto.
 *
 * Referência: https://hubla.gitbook.io/docs/webhooks
 *
 * Formato real que chega (resumido):
 *   {
 *     "type": "invoice.payment_succeeded",
 *     "version": "2.0.0",
 *     "event": {
 *       "product":  { "id": "<id da oferta principal>", "name": "..." },
 *       "products": [{ "id": "...", "offers": [{ "id": "<oferta comprada>" }] }],
 *       "invoice":  { "id", "subscriptionId", "status", "amount", ... },
 *       "subscription": { "id", "status", "billingCycleMonths", "autoRenew", ... },
 *       "user":     { "email", "firstName", "lastName", "phone" }
 *     }
 *   }
 *
 * O que o webhook antigo lia (`payload.email`, `payload.data.customer.email`)
 * não existe em nenhum evento — por isso nada era liberado.
 */

import { CHECKOUT, type PlanoId } from '@/lib/lp/site';

/** O que o evento manda o app fazer com a assinatura. */
export type HublaIntent = 'activate' | 'revoke' | 'past_due' | 'ignore';

export type HublaPlanMatch = { plan: PlanoId; months: number; checkoutId: string };

export type HublaEvent = {
  type: string;
  /** e-mail de quem comprou (fonte principal do vínculo com a conta do Lume) */
  email: string | null;
  name: string | null;
  /** telefone com DDI, ex: +5515997507988 */
  phone: string | null;
  /** ids de produto/oferta encontrados no payload, do mais específico ao menos */
  offerIds: string[];
  subscriptionId: string | null;
  invoiceId: string | null;
  /** fatura-mãe numa venda com order bump (modo de compatibilidade) */
  parentInvoiceId: string | null;
  invoiceStatus: string | null;
  subscriptionStatus: string | null;
  billingCycleMonths: number | null;
  /** `?sck=` do link de checkout — usamos pra carimbar o id da profissional */
  sck: string | null;
};

/**
 * Índice `id do checkout → plano + ciclo`, derivado dos MESMOS links que a
 * página de vendas e o paywall usam (lib/lp/site.ts). Fonte única de propósito:
 * trocar um link lá reconfigura o webhook aqui sem ninguém lembrar de mexer.
 *
 * O slug de `pay.hub.la/<slug>` é o id da oferta, e é ele que a Hubla manda em
 * `event.product.id` / `event.products[].offers[].id`.
 */
export const CHECKOUT_INDEX: Record<string, { plan: PlanoId; months: number }> = (() => {
  const index: Record<string, { plan: PlanoId; months: number }> = {};
  for (const [plan, links] of Object.entries(CHECKOUT) as [PlanoId, { mensal: string; anual: string }][]) {
    index[checkoutId(links.mensal)] = { plan, months: 1 };
    index[checkoutId(links.anual)] = { plan, months: 12 };
  }
  return index;
})();

/** Último segmento de `https://pay.hub.la/XXXX` → `XXXX`. */
export function checkoutId(url: string): string {
  return url.split('?')[0].replace(/\/+$/, '').split('/').pop() || url;
}

/** Eventos que liberam acesso. */
const ACTIVATE = new Set([
  'invoice.payment_succeeded',
  'subscription.activated',
  'customer.member_added',
]);

/** Eventos que cortam acesso. */
const REVOKE = new Set([
  'subscription.deactivated',
  'invoice.refunded',
  'customer.member_removed',
]);

/** Eventos que marcam inadimplência (sem cortar o acesso na hora). */
const PAST_DUE = new Set(['invoice.payment_failed']);

export function intentOf(type: string): HublaIntent {
  if (ACTIVATE.has(type)) return 'activate';
  if (REVOKE.has(type)) return 'revoke';
  if (PAST_DUE.has(type)) return 'past_due';
  return 'ignore';
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/** Navegação segura no payload: campo ausente vira objeto/array vazio. */
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function arr(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

/**
 * Lê o payload da Hubla de forma defensiva: cada campo é opcional em algum
 * evento, e o modo "integração recomendada" muda o conteúdo de `products[].id`.
 * Por isso coletamos TODOS os ids possíveis e deixamos o de-para decidir.
 */
export function parseHublaEvent(payload: unknown): HublaEvent {
  const root = obj(payload);
  const ev = obj(root.event);
  const subscription = obj(ev.subscription);
  const invoice = ev.invoice ? obj(ev.invoice) : obj(subscription.lastInvoice);
  const user = ev.user ? obj(ev.user) : invoice.payer ? obj(invoice.payer) : obj(ev.lead);

  // Do mais específico (a oferta realmente comprada) ao mais genérico.
  const offerIds: string[] = [];
  const products = arr(ev.products).map(obj);
  for (const p of products) {
    for (const o of arr(p.offers).map(obj)) {
      const id = str(o.id);
      if (id) offerIds.push(id);
    }
  }
  for (const p of products) {
    const id = str(p.id);
    if (id) offerIds.push(id);
  }
  const singular = str(obj(ev.product).id);
  if (singular) offerIds.push(singular);

  const fullName =
    str(user.fullName) ||
    [str(user.firstName), str(user.lastName)].filter(Boolean).join(' ').trim() ||
    null;

  const session = obj(
    invoice.paymentSession ??
      invoice.firstPaymentSession ??
      subscription.firstPaymentSession ??
      obj(ev.lead).session,
  );
  const cycle = subscription.billingCycleMonths;

  return {
    type: str(root.type) || str(root.event) || '',
    email: str(user.email)?.toLowerCase() ?? null,
    name: fullName || null,
    phone: str(user.phone),
    offerIds: [...new Set(offerIds)],
    subscriptionId: str(subscription.id) || str(invoice.subscriptionId),
    invoiceId: str(invoice.id),
    parentInvoiceId: str(invoice.parentInvoiceId),
    invoiceStatus: str(invoice.status),
    subscriptionStatus: str(subscription.status),
    billingCycleMonths: typeof cycle === 'number' ? cycle : null,
    sck: str(obj(session.params).sck) || sckFromUrl(str(session.url)),
  };
}

/** `?sck=` de dentro da url da sessão, quando a Hubla não manda `params`. */
function sckFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get('sck');
  } catch {
    return null;
  }
}

/** Primeiro id do payload que bate com um dos nossos seis checkouts. */
export function matchPlan(offerIds: string[]): HublaPlanMatch | null {
  for (const id of offerIds) {
    const hit = CHECKOUT_INDEX[id];
    if (hit) return { ...hit, checkoutId: id };
  }
  return null;
}

/**
 * Até quando o acesso vale.
 *
 * Ciclo + 3 dias de folga: entre a cobrança da renovação e a chegada do webhook
 * existe uma janela de horas. Sem folga, a profissional bate no paywall no dia
 * da renovação — o pior momento possível pra ela ver essa tela.
 */
export const GRACE_DAYS = 3;

export function accessEndsAt(months: number, from: Date = new Date()): string {
  const end = new Date(from);
  end.setMonth(end.getMonth() + months);
  end.setDate(end.getDate() + GRACE_DAYS);
  return end.toISOString();
}

/** Só dígitos — pra comparar telefone da Hubla (+55…) com o whatsapp salvo. */
export function digits(v: string | null | undefined): string {
  return (v || '').replace(/\D/g, '');
}
