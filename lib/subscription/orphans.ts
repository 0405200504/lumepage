/**
 * COMPRAS ÓRFÃS DA HUBLA
 * ----------------------
 * Órfã = pagou na Hubla e não havia conta com aquele e-mail. O webhook guarda
 * os avisos em `hubla_webhook_events` com result = 'unmatched' (v37); aqui é
 * tudo o que acontece com eles depois:
 *
 *   - agrupar: uma venda chega em até três avisos — o admin vê UMA compra;
 *   - avisar: e-mail "falta criar sua conta", com link pro cadastro já com o
 *     e-mail preenchido, um por compradora (dedup na v42);
 *   - vincular: quando ela se cadastra com aquele e-mail, o plano ativa na hora.
 *
 * Os avisos nunca são apagados. Resolver uma órfã só troca o `result` e grava a
 * conta em `professional_id`, então o histórico da venda continua inteiro.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { sendMail } from '@/lib/mail';
import { appUrl, orphanWelcomeEmail } from '@/lib/mail-templates';
import { resolvePlan } from '@/lib/subscription/entitlements';
import { parseHublaEvent, intentOf, matchPlan, type HublaEvent } from './hubla';
import { applyActivation, PROFESSIONAL_SUBSCRIPTION_COLS, type ActivationTarget } from './activation';

/** Linha de `hubla_webhook_events` (só o que este módulo lê). */
export interface HublaLogRow {
  idempotency_key: string;
  event_type: string | null;
  email: string | null;
  subscription_id: string | null;
  professional_id: string | null;
  result: string | null;
  payload: unknown;
  received_at: string;
}

/**
 * pending = pagou e o pagamento vale (dá pra vincular e ativar)
 * revoked = pagou e depois foi reembolsada/cancelada — não há o que ativar
 * failed  = só chegaram cobranças recusadas
 */
export type OrphanStatus = 'pending' | 'revoked' | 'failed';

export interface OrphanPurchase {
  /** e-mail minúsculo; sem e-mail, `sub:<assinatura>` ou `evt:<aviso>` */
  key: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  /** plano pelo de-para dos checkouts; null = oferta fora de lib/lp/site.ts */
  plan: string | null;
  months: number | null;
  offerName: string | null;
  amountCents: number | null;
  subscriptionId: string | null;
  status: OrphanStatus;
  firstAt: string;
  lastAt: string;
  events: { key: string; type: string; at: string; result: string | null }[];
  /** o último aviso de liberação — é ele que se aplica na conta */
  activation: HublaEvent | null;
  /** conta à qual a compra foi ligada (só nas resolvidas) */
  professionalId: string | null;
  /** como foi resolvida (só nas resolvidas) */
  resolution: string | null;
}

const RESOLVED_RESULTS = [
  'claimed_signup', 'claimed_google', 'claimed_admin',
  'linked_signup', 'linked_google', 'linked_admin',
  'activated_manual', 'linked_manual', 'dismissed',
];

export type ClaimVia = 'signup' | 'google' | 'admin';

const db = () => getSupabaseAdmin();

const missingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table/i.test(e.message || ''));

// ═══════════════════════════════ AGRUPAR ═══════════════════════════════

export function orphanKeyOf(row: Pick<HublaLogRow, 'email' | 'subscription_id' | 'idempotency_key'>): string {
  const email = row.email?.trim().toLowerCase();
  if (email) return email;
  if (row.subscription_id) return `sub:${row.subscription_id}`;
  return `evt:${row.idempotency_key}`;
}

/**
 * Junta os avisos por compradora. A situação sai do ÚLTIMO aviso que importa:
 * pagou → pagou e foi reembolsada → pagou de novo termina em `pending`.
 */
export function groupOrphans(rows: HublaLogRow[]): OrphanPurchase[] {
  const groups = new Map<string, HublaLogRow[]>();
  for (const row of rows) {
    const key = orphanKeyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const out: OrphanPurchase[] = [];
  for (const [key, list] of groups) {
    const sorted = [...list].sort((a, b) => a.received_at.localeCompare(b.received_at));
    const parsed = sorted.map(r => ({ row: r, ev: parseHublaEvent(r.payload) }));

    let status: OrphanStatus = 'failed';
    let activation: HublaEvent | null = null;
    for (const { row, ev } of parsed) {
      const intent = intentOf(row.event_type || ev.type);
      if (intent === 'activate') { status = 'pending'; activation = ev; }
      else if (intent === 'revoke' && activation) status = 'revoked';
    }

    // Dados da compradora: o aviso mais recente que trouxe cada campo.
    const pick = <T,>(f: (ev: HublaEvent) => T | null): T | null => {
      for (let i = parsed.length - 1; i >= 0; i--) {
        const v = f(parsed[i].ev);
        if (v !== null && v !== undefined && v !== '') return v;
      }
      return null;
    };
    const base = activation ?? parsed[parsed.length - 1].ev;
    const match = matchPlan(base.offerIds);
    const last = sorted[sorted.length - 1];

    out.push({
      key,
      email: pick(ev => ev.email) ?? last.email,
      name: pick(ev => ev.name),
      phone: pick(ev => ev.phone),
      plan: match?.plan ?? null,
      months: base.billingCycleMonths || match?.months || null,
      offerName: base.offerName,
      amountCents: base.amountCents,
      subscriptionId: pick(ev => ev.subscriptionId) ?? last.subscription_id,
      status,
      firstAt: sorted[0].received_at,
      lastAt: last.received_at,
      events: sorted.map(r => ({ key: r.idempotency_key, type: r.event_type ?? '—', at: r.received_at, result: r.result })),
      activation,
      professionalId: sorted.find(r => r.professional_id)?.professional_id ?? null,
      resolution: last.result === 'unmatched' ? null : last.result,
    });
  }
  return out.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

// ═══════════════════════════════ LINK ASSINADO ═══════════════════════════════

/**
 * Assinatura do link de cadastro. Prova que o link saiu do nosso e-mail — só
 * assim a tela de cadastro pode dizer "seu plano já está pago" sem virar um
 * jeito de descobrir quem comprou digitando e-mails na URL.
 */
export function orphanSignupToken(email: string): string | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return createHmac('sha256', secret)
    .update(`orphan-signup:${email.trim().toLowerCase()}`)
    .digest('base64url')
    .slice(0, 32);
}

export function verifyOrphanSignupToken(email: string, token: string | null | undefined): boolean {
  if (!email || !token) return false;
  const expected = orphanSignupToken(email);
  if (!expected || expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

/** Cadastro com o e-mail da compra preenchido (e o plano, para o texto da tela). */
export function orphanSignupUrl(email: string, plan: string | null): string {
  const q = new URLSearchParams({ email: email.trim().toLowerCase() });
  if (plan) q.set('plano', plan);
  const token = orphanSignupToken(email);
  if (token) q.set('c', token);
  return `${appUrl()}/register?${q.toString()}`;
}

// ═══════════════════════════════ LEITURA ═══════════════════════════════

export interface OrphanNotice { email: string; first_sent_at: string; last_sent_at: string; sent_count: number; sent_by: string | null }

/** Fila do admin: pendentes + resolvidas nos últimos `resolvedDays` dias. */
export async function listOrphanPurchases({ resolvedDays = 30 } = {}): Promise<{
  pending: OrphanPurchase[];
  resolved: OrphanPurchase[];
  notices: Map<string, OrphanNotice>;
  available: boolean;
  noticesAvailable: boolean;
}> {
  const client = db();
  if (!client) return { pending: [], resolved: [], notices: new Map(), available: false, noticesAvailable: false };

  const since = new Date(Date.now() - resolvedDays * 86_400_000).toISOString();
  const COLS = 'idempotency_key, event_type, email, subscription_id, professional_id, result, payload, received_at';
  const [openRes, doneRes, noticeRes] = await Promise.all([
    client.from('hubla_webhook_events').select(COLS).eq('result', 'unmatched').order('received_at', { ascending: false }).limit(500),
    client.from('hubla_webhook_events').select(COLS).in('result', RESOLVED_RESULTS).gte('processed_at', since).order('received_at', { ascending: false }).limit(300),
    client.from('hubla_orphan_notices').select('*').limit(1000),
  ]);

  if (openRes.error) return { pending: [], resolved: [], notices: new Map(), available: !missingTable(openRes.error), noticesAvailable: false };

  const notices = new Map(((noticeRes.data || []) as OrphanNotice[]).map(n => [n.email, n]));
  return {
    pending: groupOrphans((openRes.data || []) as HublaLogRow[]),
    resolved: groupOrphans((doneRes.data || []) as HublaLogRow[]),
    notices,
    available: true,
    noticesAvailable: !noticeRes.error,
  };
}

/** Avisos ainda órfãos de uma compradora (pela chave da fila). */
async function openEventsOf(client: SupabaseClient, key: string): Promise<HublaLogRow[]> {
  let q = client.from('hubla_webhook_events')
    .select('idempotency_key, event_type, email, subscription_id, professional_id, result, payload, received_at')
    .eq('result', 'unmatched');
  if (key.startsWith('sub:')) q = q.eq('subscription_id', key.slice(4));
  else if (key.startsWith('evt:')) q = q.eq('idempotency_key', key.slice(4));
  // O webhook grava o e-mail já minúsculo (parseHublaEvent). eq e não ilike:
  // no ilike o "_" de um e-mail vira curinga.
  else q = q.eq('email', key);
  const { data } = await q.order('received_at', { ascending: true }).limit(50);
  return (data || []) as HublaLogRow[];
}

export async function getOrphanPurchase(key: string): Promise<OrphanPurchase | null> {
  const client = db();
  if (!client) return null;
  return groupOrphans(await openEventsOf(client, key))[0] ?? null;
}

/**
 * Para a tela de cadastro, que só chama isto com e-mail de link ASSINADO.
 * `claimed` = a compra já foi ligada a uma conta (ela deve entrar, não cadastrar).
 */
export async function orphanStateForSignup(email: string): Promise<{ state: 'pending' | 'claimed' | 'none'; plan: string | null }> {
  const client = db();
  if (!client) return { state: 'none', plan: null };
  const { data, error } = await client.from('hubla_webhook_events')
    .select('idempotency_key, event_type, email, subscription_id, professional_id, result, payload, received_at')
    .eq('email', email.trim().toLowerCase())
    .order('received_at', { ascending: true })
    .limit(50);
  if (error || !data?.length) return { state: 'none', plan: null };

  const rows = data as HublaLogRow[];
  const open = groupOrphans(rows.filter(r => r.result === 'unmatched'))[0];
  if (open?.status === 'pending') return { state: 'pending', plan: open.plan };
  if (rows.some(r => r.professional_id)) return { state: 'claimed', plan: null };
  return { state: 'none', plan: null };
}

// ═══════════════════════════════ VINCULAR ═══════════════════════════════

/**
 * Liga as compras órfãs de `key` a uma conta e, se o pagamento vale, ativa o
 * plano. É o que roda quando ela se cadastra (via = signup/google) e quando o
 * admin vincula na mão (`linkedBy` = e-mail do admin).
 *
 * Devolve o plano aplicado, ou null se não havia nada a ativar.
 */
export async function claimOrphanPurchase({ key, professionalId, via, linkedBy }: {
  key: string;
  professionalId: string;
  via: ClaimVia | 'manual';
  linkedBy?: string;
}): Promise<{ plan: string; months: number; endsAt: string } | null> {
  const client = db();
  if (!client || !key) return null;

  const rows = await openEventsOf(client, key);
  if (!rows.length) return null;
  const [purchase] = groupOrphans(rows);

  const { data: profData } = await client.from('professionals')
    .select(PROFESSIONAL_SUBSCRIPTION_COLS).eq('id', professionalId).maybeSingle();
  if (!profData) return null;

  const label: Record<ClaimVia | 'manual', string> = {
    signup: 'vínculo automático no cadastro',
    google: 'vínculo automático no cadastro com Google',
    admin: 'vínculo automático na conta criada pelo admin',
    manual: `conciliado manualmente por ${linkedBy ?? 'admin'}`,
  };

  let applied: { plan: string; months: number; endsAt: string } | null = null;
  if (purchase.status === 'pending' && purchase.activation) {
    const r = await applyActivation(client, profData as ActivationTarget, purchase.activation, {
      via: label[via],
      changedBy: via === 'manual' ? (linkedBy ?? 'admin') : `cadastro-${via}`,
    });
    applied = { plan: r.plan, months: r.months, endsAt: r.endsAt };
  }

  const result = via === 'manual'
    ? (applied ? 'activated_manual' : 'linked_manual')
    : `${applied ? 'claimed' : 'linked'}_${via}`;

  // `.eq('result', 'unmatched')` de novo: se o admin e o cadastro vincularem ao
  // mesmo tempo, quem chegar depois não sobrescreve o resultado do primeiro.
  await client.from('hubla_webhook_events')
    .update({ professional_id: professionalId, result, processed_at: new Date().toISOString() })
    .in('idempotency_key', purchase.events.map(e => e.key))
    .eq('result', 'unmatched');

  if (applied) console.log(`[hubla] Compra órfã de ${key} vinculada (${result}) → ${applied.plan}.`);
  return applied;
}

/** Atalho do cadastro: tenta vincular pelo e-mail da conta nova. Nunca lança. */
export async function claimOrphanOnSignup(email: string, professionalId: string, via: ClaimVia) {
  try {
    return await claimOrphanPurchase({ key: email.trim().toLowerCase(), professionalId, via });
  } catch (e) {
    // O cadastro já deu certo; uma falha aqui fica para a conciliação no admin.
    console.warn('[hubla] Falha ao vincular compra órfã no cadastro:', e instanceof Error ? e.message : e);
    return null;
  }
}

/** Descarta (teste, duplicada, estorno resolvido por fora). Continua no histórico. */
export async function dismissOrphanPurchase(key: string): Promise<number> {
  const client = db();
  if (!client) return 0;
  const rows = await openEventsOf(client, key);
  if (!rows.length) return 0;
  await client.from('hubla_webhook_events')
    .update({ result: 'dismissed', processed_at: new Date().toISOString() })
    .in('idempotency_key', rows.map(r => r.idempotency_key))
    .eq('result', 'unmatched');
  return rows.length;
}

// ═══════════════════════════════ AVISAR ═══════════════════════════════

function welcomeFor(p: { email: string; name: string | null; plan: string | null; months: number | null }) {
  return orphanWelcomeEmail({
    name: p.name,
    email: p.email,
    plan: p.plan ? resolvePlan(p.plan) : null,
    months: p.months,
    signupUrl: orphanSignupUrl(p.email, p.plan),
  });
}

/**
 * E-mail "pagamento aprovado, falta criar a conta" — chamado pelo webhook a
 * cada aviso de liberação sem dona. Só o primeiro aviso da compradora manda:
 * a v42 tem o e-mail como chave, e os outros batem no 23505.
 *
 * Sem a v42 não dá pra deduplicar entre funções paralelas; aí só o
 * `invoice.payment_succeeded` manda (um por cobrança).
 */
export async function welcomeOrphanBuyer(client: SupabaseClient, event: HublaEvent): Promise<'sent' | 'already' | 'skipped' | 'failed'> {
  if (!event.email) return 'skipped';
  const email = event.email.trim().toLowerCase();

  const { error } = await client.from('hubla_orphan_notices').insert({ email, sent_by: 'webhook' });
  if (error?.code === '23505') return 'already';
  const reserved = !error;
  if (!reserved && event.type !== 'invoice.payment_succeeded') return 'skipped';
  if (error && !missingTable(error)) console.warn('[hubla] Aviso de órfã sem dedup:', error.message);

  const match = matchPlan(event.offerIds);
  const r = await sendMail({
    to: email,
    ...welcomeFor({ email, name: event.name, plan: match?.plan ?? null, months: event.billingCycleMonths || match?.months || null }),
  });

  if (r.sent) {
    console.log(`[hubla] Boas-vindas de compra órfã enviadas para ${email}.`);
    return 'sent';
  }
  // Não saiu (sem RESEND_API_KEY ou recusado): libera a vaga, pro admin ver
  // "não enviado" e poder reenviar.
  if (reserved) await client.from('hubla_orphan_notices').delete().eq('email', email);
  if (!r.skipped) console.warn(`[hubla] Boas-vindas de compra órfã não enviadas para ${email}: ${r.error}`);
  return r.skipped ? 'skipped' : 'failed';
}

/** Reenvio pelo admin. Devolve o erro legível, ou null se saiu. */
export async function resendOrphanWelcome(key: string, adminEmail: string): Promise<string | null> {
  const client = db();
  if (!client) return 'Banco indisponível.';
  const purchase = await getOrphanPurchase(key);
  if (!purchase) return 'Essa compra não está mais pendente.';
  if (!purchase.email) return 'A Hubla não mandou e-mail nessa compra.';
  if (purchase.status !== 'pending') return 'O pagamento dessa compra não vale mais (reembolso ou recusa).';

  const r = await sendMail({ to: purchase.email, ...welcomeFor({ ...purchase, email: purchase.email }) });
  if (r.skipped) return 'Envio de e-mail desligado: configure RESEND_API_KEY e MAIL_FROM.';
  if (!r.sent) return `O provedor recusou o envio (${r.error ?? 'erro desconhecido'}).`;

  const now = new Date().toISOString();
  const { data: prev } = await client.from('hubla_orphan_notices').select('sent_count').eq('email', purchase.email).maybeSingle();
  await client.from('hubla_orphan_notices').upsert({
    email: purchase.email,
    last_sent_at: now,
    sent_count: ((prev as { sent_count?: number } | null)?.sent_count ?? 0) + 1,
    sent_by: adminEmail,
    ...(prev ? {} : { first_sent_at: now }),
  }, { onConflict: 'email' });
  return null;
}
