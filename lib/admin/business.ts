import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { FALLBACK_PLANS, PlanRow } from '@/lib/admin/plans';
import { toISODate } from '@/lib/query-params';

/**
 * NEGÓCIO: RECEITA DA LUME × MOVIMENTO DA REDE
 * --------------------------------------------
 * O conserto conceitual do painel. O "Faturamento total" que o admin mostrava é o
 * GMV das profissionais — dinheiro que passa pela plataforma, não dinheiro da Lume.
 * A receita da Lume é a soma das assinaturas. São duas coisas diferentes e agora
 * cada uma tem seu bloco, com rótulo explícito.
 */

const db = () => getSupabaseAdmin() || supabase;
const REVENUE_STATUSES = ['completed', 'confirmed'];

export interface SaasRevenue {
  mrrCents: number;
  arrCents: number;
  arpaCents: number;
  ltvCents: number;
  activeSubscriptions: number;
  trialing: number;
  pastDue: number;
  canceled: number;
  legacy: number;
  byPlan: { key: string; name: string; priceCents: number; count: number; mrrCents: number }[];
  /** MRR mês a mês, reconstruído a partir de quando cada conta virou assinante. */
  mrrSeries: { label: string; mrrCents: number; newCents: number; churnedCents: number }[];
  /** Contas que somem no mês seguinte / total no início do mês. */
  churnRatePct: number;
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const monthlyPrice = (plan: PlanRow | undefined): number =>
  !plan ? 0 : plan.billing_cycle === 'yearly' ? Math.round(plan.price_cents / 12) : plan.price_cents;

export async function getSaasRevenue(plans: PlanRow[] = FALLBACK_PLANS): Promise<SaasRevenue> {
  const empty: SaasRevenue = {
    mrrCents: 0, arrCents: 0, arpaCents: 0, ltvCents: 0, activeSubscriptions: 0,
    trialing: 0, pastDue: 0, canceled: 0, legacy: 0, byPlan: [], mrrSeries: [], churnRatePct: 0,
  };
  if (!isSupabaseConfigured) return empty;

  const { data } = await db().from('professionals')
    .select('id, subscription_plan, subscription_status, subscription_ends_at, created_at, status')
    .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID);

  type Row = { id: string; subscription_plan: string | null; subscription_status: string | null; subscription_ends_at: string | null; created_at: string; status: string };
  const rows = (data || []) as Row[];
  const planByKey = new Map(plans.map(p => [p.key, p]));

  let mrrCents = 0;
  let trialing = 0, pastDue = 0, canceled = 0, legacy = 0, activeSubscriptions = 0;
  const byPlanMap = new Map<string, { key: string; name: string; priceCents: number; count: number; mrrCents: number }>();
  for (const p of plans) byPlanMap.set(p.key, { key: p.key, name: p.name, priceCents: p.price_cents, count: 0, mrrCents: 0 });

  for (const r of rows) {
    if (!r.subscription_plan) { legacy++; continue; }
    const price = monthlyPrice(planByKey.get(r.subscription_plan));
    const entry = byPlanMap.get(r.subscription_plan)
      ?? { key: r.subscription_plan, name: r.subscription_plan, priceCents: price, count: 0, mrrCents: 0 };
    entry.count++;

    switch (r.subscription_status) {
      case 'active':
        activeSubscriptions++;
        mrrCents += price;
        entry.mrrCents += price;
        break;
      case 'past_due': pastDue++; break;
      case 'canceled': canceled++; break;
      default: trialing++;
    }
    byPlanMap.set(entry.key, entry);
  }

  // Série de MRR: aproximação honesta — considera a conta assinante a partir do mês em
  // que foi criada, com o preço do plano atual. Não temos histórico de preço por mês
  // (o subscription_events começa a partir da v33 e ainda é raso).
  const now = new Date();
  const series: { label: string; mrrCents: number; newCents: number; churnedCents: number }[] = [];
  let previous = 0;
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    let monthMrr = 0;
    for (const r of rows) {
      if (!r.subscription_plan || r.subscription_status !== 'active') continue;
      if (new Date(r.created_at) > monthEnd) continue;
      if (r.subscription_ends_at && new Date(r.subscription_ends_at) < monthStart) continue;
      monthMrr += monthlyPrice(planByKey.get(r.subscription_plan));
    }
    const delta = monthMrr - previous;
    series.push({
      label: MONTHS[monthStart.getMonth()],
      mrrCents: monthMrr,
      newCents: Math.max(0, delta),
      churnedCents: Math.max(0, -delta),
    });
    previous = monthMrr;
  }

  const paying = activeSubscriptions || 1;
  const churnRatePct = rows.length ? (canceled / rows.length) * 100 : 0;
  const arpaCents = Math.round(mrrCents / paying);

  return {
    mrrCents,
    arrCents: mrrCents * 12,
    arpaCents,
    // LTV = ARPA / churn mensal. Sem churn observado, mostramos 24 meses como teto.
    ltvCents: churnRatePct > 0 ? Math.round(arpaCents / (churnRatePct / 100)) : arpaCents * 24,
    activeSubscriptions,
    trialing, pastDue, canceled, legacy,
    byPlan: [...byPlanMap.values()].sort((a, b) => b.mrrCents - a.mrrCents),
    mrrSeries: series,
    churnRatePct,
  };
}

export interface NetworkVolume {
  gmvCents: number;
  gmvPreviousCents: number;
  appointments: number;
  appointmentsPrevious: number;
  ticketCents: number;
  byProfessional: { id: string; name: string; gmvCents: number; appointments: number; sharePct: number }[];
  manualIncomeCents: number;
  manualExpenseCents: number;
  /** Fatia da maior conta — o dado de risco que a tela antiga não sinalizava. */
  concentrationPct: number;
}

/** Movimento da rede (GMV) no período, com comparação com o período anterior. */
export async function getNetworkVolume(
  from: string | null, to: string | null, profNames: Map<string, string>,
): Promise<NetworkVolume> {
  const empty: NetworkVolume = {
    gmvCents: 0, gmvPreviousCents: 0, appointments: 0, appointmentsPrevious: 0, ticketCents: 0,
    byProfessional: [], manualIncomeCents: 0, manualExpenseCents: 0, concentrationPct: 0,
  };
  if (!isSupabaseConfigured) return empty;

  // Período anterior de mesma duração — é o que dá sentido ao "vs período anterior".
  let prevFrom: string | null = null, prevTo: string | null = null;
  if (from && to) {
    const start = new Date(from), end = new Date(to);
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
    const pEnd = new Date(start); pEnd.setDate(pEnd.getDate() - 1);
    const pStart = new Date(pEnd); pStart.setDate(pStart.getDate() - days + 1);
    prevFrom = toISODate(pStart); prevTo = toISODate(pEnd);
  }

  const query = (f: string | null, t: string | null) => {
    let q = db().from('appointments')
      .select('professional_id, status, service:services(price_cents)')
      .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000);
    if (f) q = q.gte('date', f);
    if (t) q = q.lte('date', t);
    return q;
  };

  const txQuery = () => {
    let q = db().from('transactions').select('type, amount_cents, professional_id').limit(20000);
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    return q;
  };

  const [cur, prev, tx] = await Promise.all([
    query(from, to),
    prevFrom ? query(prevFrom, prevTo) : Promise.resolve({ data: [] as unknown[] }),
    txQuery().then((r: { data: unknown[] | null }) => r, () => ({ data: [] as unknown[] })),
  ]);

  type A = { professional_id: string; status: string; service: { price_cents?: number } | null };
  const sum = (rows: A[]) => rows.filter(a => REVENUE_STATUSES.includes(a.status))
    .reduce((s, a) => s + (a.service?.price_cents || 0), 0);

  const curRows = (cur.data || []) as unknown as A[];
  const prevRows = (prev.data || []) as unknown as A[];

  const byProf = new Map<string, { gmvCents: number; appointments: number }>();
  for (const a of curRows) {
    if (a.status === 'cancelled') continue;
    const e = byProf.get(a.professional_id) || { gmvCents: 0, appointments: 0 };
    e.appointments++;
    if (REVENUE_STATUSES.includes(a.status)) e.gmvCents += a.service?.price_cents || 0;
    byProf.set(a.professional_id, e);
  }

  const gmvCents = sum(curRows);
  const paidCount = curRows.filter(a => REVENUE_STATUSES.includes(a.status)).length;

  const ranked = [...byProf.entries()]
    .map(([id, v]) => ({ id, name: profNames.get(id) || '—', ...v, sharePct: gmvCents ? (v.gmvCents / gmvCents) * 100 : 0 }))
    .sort((a, b) => b.gmvCents - a.gmvCents);

  let manualIncomeCents = 0, manualExpenseCents = 0;
  for (const t of ((tx as { data?: unknown[] }).data || []) as { type: string; amount_cents: number }[]) {
    if (t.type === 'income') manualIncomeCents += t.amount_cents;
    else manualExpenseCents += t.amount_cents;
  }

  return {
    gmvCents,
    gmvPreviousCents: sum(prevRows),
    appointments: curRows.filter(a => a.status !== 'cancelled').length,
    appointmentsPrevious: prevRows.filter(a => a.status !== 'cancelled').length,
    ticketCents: paidCount ? Math.round(gmvCents / paidCount) : 0,
    byProfessional: ranked,
    manualIncomeCents,
    manualExpenseCents,
    concentrationPct: ranked[0]?.sharePct ?? 0,
  };
}
