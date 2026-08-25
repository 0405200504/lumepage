/**
 * Simula um evento da Hubla contra o webhook local (ou de produção).
 *
 * Serve pra conferir o caminho inteiro — token, de-para do plano, vínculo com a
 * conta e liberação — sem depender de uma venda real.
 *
 *   npx tsx scripts/test-hubla.mts <email-da-conta> [plano] [mensal|anual]
 *
 * Variáveis:
 *   HUBLA_WEBHOOK_TOKEN  o mesmo do .env (obrigatório)
 *   WEBHOOK_URL          padrão http://localhost:3000/api/webhooks/hubla
 *   EVENT                padrão invoice.payment_succeeded
 *                        (tente também subscription.deactivated, invoice.refunded)
 *   SCK                  id da profissional, pra testar o carimbo do checkout
 *   SUB_ID               fixa o id da assinatura (pra encadear ativação → cancelamento)
 *   IDEMPOTENCY          fixa o x-hubla-idempotency (pra testar a deduplicação)
 */

import { randomUUID } from 'crypto';
import { CHECKOUT, type PlanoId } from '../lib/lp/site';

const [, , email, planoArg = 'pro', cicloArg = 'anual'] = process.argv;

if (!email) {
  console.error('Uso: npx tsx scripts/test-hubla.mts <email-da-conta> [start|pro|premium] [mensal|anual]');
  process.exit(1);
}

const token = process.env.HUBLA_WEBHOOK_TOKEN;
if (!token) {
  console.error('Defina HUBLA_WEBHOOK_TOKEN (o mesmo valor do .env do app).');
  process.exit(1);
}

const url = process.env.WEBHOOK_URL || 'http://localhost:3000/api/webhooks/hubla';
const type = process.env.EVENT || 'invoice.payment_succeeded';
const plano = planoArg as PlanoId;
const anual = cicloArg === 'anual';
const checkout = CHECKOUT[plano]?.[anual ? 'anual' : 'mensal'];

if (!checkout) {
  console.error(`Plano inválido: ${planoArg}. Use start, pro ou premium.`);
  process.exit(1);
}

const offerId = checkout.split('/').pop()!;
const subscriptionId = process.env.SUB_ID || randomUUID();
const invoiceId = randomUUID();

const payload = {
  type,
  version: '2.0.0',
  event: {
    product: { id: offerId, name: `Lume ${plano}` },
    products: [
      { id: offerId, name: `Lume ${plano}`, offers: [{ id: offerId, name: 'Principal' }] },
    ],
    invoice: {
      id: invoiceId,
      subscriptionId,
      status: type === 'invoice.refunded' ? 'refunded' : 'paid',
      paymentMethod: 'credit_card',
      currency: 'BRL',
      amount: { subtotalCents: 9900, discountCents: 0, totalCents: 9900 },
      paymentSession: {
        url: `${checkout}${process.env.SCK ? `?sck=${process.env.SCK}` : ''}`,
        params: process.env.SCK ? { sck: process.env.SCK } : {},
      },
      saleDate: new Date().toISOString(),
    },
    subscription: {
      id: subscriptionId,
      status: 'active',
      type: 'recurring',
      billingCycleMonths: anual ? 12 : 1,
      autoRenew: true,
      activatedAt: new Date().toISOString(),
    },
    user: {
      id: randomUUID(),
      firstName: 'Teste',
      lastName: 'Lume',
      email,
      phone: '+5515997507988',
    },
  },
};

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-hubla-token': token,
    'x-hubla-idempotency': process.env.IDEMPOTENCY || randomUUID(),
    'x-hubla-sandbox': 'false',
  },
  body: JSON.stringify(payload),
});

console.log(`${res.status} ${res.statusText}`);
console.log(await res.text());
