import { Appointment, Transaction, FixedExpense, Service } from '@/types/database';
import { appointmentRevenueCents, appointmentCostCents, indexServices, ServicesById } from '@/lib/finance';

/* =========================================================================
   Camada de agregação — funções PURAS reutilizadas por Financeiro e Vendas.
   Tudo em centavos; datas no formato "YYYY-MM-DD" (comparáveis como string).
   ========================================================================= */

const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const inRange = (iso: string, start: string, end: string) => iso >= start && iso <= end;

export interface DateRange { start: string; end: string }

/** Intervalo [start,end] de um mês (mês 0-based). */
export function monthRange(year: number, month0: number): DateRange {
  return { start: `${year}-${pad(month0 + 1)}-01`, end: toISO(new Date(year, month0 + 1, 0)) };
}

const APPROVED = (a: Appointment) => a.status === 'completed' || a.status === 'confirmed';

/* ---------- Métricas de um intervalo (alimenta KPIs e DRE) ---------- */

export interface RangeMetrics {
  grossRevenue: number;      // receita bruta (confirmados + concluídos)
  realized: number;          // só concluídos
  predicted: number;         // confirmados (ainda não concluídos)
  lostRevenue: number;       // descontos/cancelamentos: valor de cancelados + faltas
  variableCosts: number;     // insumos dos atendimentos faturados
  fixedCosts: number;        // contas fixas + despesas manuais do período
  manualIncome: number;      // entradas manuais (transações income)
  netProfit: number;         // lucro líquido
  margin: number;            // margem % (0..100)
  ticket: number;            // ticket médio (sobre faturados)
  count: number;             // atendimentos faturados
  completed: number; confirmed: number; cancelled: number; noShow: number; pending: number;
}

export function metricsForRange(
  appointments: Appointment[],
  transactions: Transaction[],
  fixed: FixedExpense[],
  byId: ServicesById,
  range: DateRange,
  opts?: { monthsInRange?: number },
): RangeMetrics {
  const within = (iso: string) => inRange(iso, range.start, range.end);
  const appts = appointments.filter(a => within(a.date));

  const billed = appts.filter(APPROVED);
  const completed = appts.filter(a => a.status === 'completed');
  const confirmed = appts.filter(a => a.status === 'confirmed');
  const cancelled = appts.filter(a => a.status === 'cancelled');
  const noShow = appts.filter(a => a.status === 'no_show');
  const pending = appts.filter(a => a.status === 'pending');

  const grossRevenue = billed.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const realized = completed.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const predicted = confirmed.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const lostRevenue = [...cancelled, ...noShow].reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const variableCosts = billed.reduce((s, a) => s + appointmentCostCents(a, byId), 0);

  const tx = transactions.filter(t => within(t.date));
  const manualIncome = tx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_cents, 0);
  const manualExpense = tx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0);

  // Contas fixas: aplicam por mês ativo dentro do intervalo.
  const months = opts?.monthsInRange ?? 1;
  const fixedMonthly = fixed.filter(f => f.active).reduce((s, f) => s + f.amount_cents, 0);
  const fixedCosts = fixedMonthly * months + manualExpense;

  const totalIncome = grossRevenue + manualIncome;
  const netProfit = totalIncome - variableCosts - fixedCosts;
  const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;
  const ticket = billed.length ? Math.round(grossRevenue / billed.length) : 0;

  return {
    grossRevenue, realized, predicted, lostRevenue, variableCosts, fixedCosts, manualIncome,
    netProfit, margin, ticket, count: billed.length,
    completed: completed.length, confirmed: confirmed.length, cancelled: cancelled.length,
    noShow: noShow.length, pending: pending.length,
  };
}

/* ---------- Comparativo / tendência ---------- */

export type TrendDir = 'up' | 'down' | 'flat';
export interface Comparison { deltaPct: number; direction: TrendDir; abs: number }

export function compare(curr: number, prev: number): Comparison {
  const abs = curr - prev;
  if (prev === 0) {
    if (curr === 0) return { deltaPct: 0, direction: 'flat', abs: 0 };
    return { deltaPct: 100, direction: 'up', abs };
  }
  const deltaPct = (abs / Math.abs(prev)) * 100;
  const direction: TrendDir = Math.abs(deltaPct) < 0.05 ? 'flat' : deltaPct > 0 ? 'up' : 'down';
  return { deltaPct, direction, abs };
}

/* ---------- Projeção de receita do mês ---------- */

export interface Projection {
  realized: number;        // já concluído no mês
  confirmedAhead: number;  // confirmados futuros do mês
  historicalRunRate: number; // estimativa pelos dias restantes via média histórica
  projected: number;       // soma final
}

/** Projeta a receita do mês corrente: realizado + confirmados futuros +
 *  estimativa dos dias restantes pela média diária dos últimos `lookbackDays`. */
export function projectionForMonth(
  appointments: Appointment[],
  byId: ServicesById,
  today: Date = new Date(),
  lookbackDays = 90,
): Projection {
  const y = today.getFullYear(), m = today.getMonth();
  const { start, end } = monthRange(y, m);
  const todayIso = toISO(today);

  const billed = appointments.filter(APPROVED);
  const realized = billed
    .filter(a => a.status === 'completed' && inRange(a.date, start, end))
    .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const confirmedAhead = billed
    .filter(a => a.status === 'confirmed' && a.date > todayIso && a.date <= end)
    .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);

  // Média diária histórica (concluídos nos últimos lookbackDays, exclui o mês atual em curso)
  const lbStart = toISO(new Date(today.getTime() - lookbackDays * 86400000));
  const histTotal = billed
    .filter(a => a.status === 'completed' && a.date >= lbStart && a.date < start)
    .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  const dailyAvg = histTotal / lookbackDays;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const daysLeft = Math.max(0, daysInMonth - today.getDate());
  const historicalRunRate = Math.round(dailyAvg * daysLeft);

  return {
    realized, confirmedAhead, historicalRunRate,
    projected: realized + confirmedAhead + historicalRunRate,
  };
}

/* ---------- Contas a receber / inadimplência (aging) ---------- */

export interface Receivable { appointment: Appointment; amount: number; daysOverdue: number }
export interface ReceivablesAging {
  overdue: { items: Receivable[]; total: number };   // venceu (data passada, ainda pendente/confirmado)
  dueSoon: { items: Receivable[]; total: number };   // a vencer (hoje/futuro)
  total: number;
}

/** Heurística (sem coluna "pago"): atendimentos pendentes/confirmados representam
 *  valores previstos ainda não realizados. Data < hoje ⇒ vencido; senão ⇒ a vencer. */
export function receivablesAging(
  appointments: Appointment[],
  byId: ServicesById,
  today: Date = new Date(),
): ReceivablesAging {
  const todayIso = toISO(today);
  const overdue: Receivable[] = [];
  const dueSoon: Receivable[] = [];
  for (const a of appointments) {
    if (a.status !== 'pending' && a.status !== 'confirmed') continue;
    const amount = appointmentRevenueCents(a, byId);
    if (amount <= 0) continue;
    if (a.date < todayIso) {
      const daysOverdue = Math.round((Date.parse(`${todayIso}T00:00:00`) - Date.parse(`${a.date}T00:00:00`)) / 86400000);
      overdue.push({ appointment: a, amount, daysOverdue });
    } else {
      dueSoon.push({ appointment: a, amount, daysOverdue: 0 });
    }
  }
  overdue.sort((x, y) => y.daysOverdue - x.daysOverdue);
  dueSoon.sort((x, y) => x.appointment.date.localeCompare(y.appointment.date));
  const sum = (arr: Receivable[]) => arr.reduce((s, r) => s + r.amount, 0);
  const overdueTotal = sum(overdue), dueSoonTotal = sum(dueSoon);
  return {
    overdue: { items: overdue, total: overdueTotal },
    dueSoon: { items: dueSoon, total: dueSoonTotal },
    total: overdueTotal + dueSoonTotal,
  };
}

/* ---------- Por forma de pagamento ---------- */

export interface PaymentRates { [method: string]: number } // taxa em % (ex.: { credito: 4 })
export interface PaymentBreakdownRow { method: string; label: string; gross: number; fee: number; net: number; count: number }

const PAYMENT_LABELS: Record<string, string> = {
  pix: 'Pix', dinheiro: 'Dinheiro', debito: 'Cartão de débito',
  credito: 'Cartão de crédito', cartao: 'Cartão', outro: 'Outro', '': 'Não informado',
};
export const DEFAULT_PAYMENT_RATES: PaymentRates = { pix: 0, dinheiro: 0, debito: 2, credito: 4, cartao: 3, outro: 0 };

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] ?? (method ? method : 'Não informado');
}

export function byPaymentMethod(
  appointments: Appointment[],
  byId: ServicesById,
  rates: PaymentRates,
  range?: DateRange,
): PaymentBreakdownRow[] {
  const map: Record<string, { gross: number; count: number }> = {};
  for (const a of appointments) {
    if (a.status !== 'completed' && a.status !== 'confirmed') continue;
    if (range && !inRange(a.date, range.start, range.end)) continue;
    const key = (a.payment_method || '').toLowerCase();
    if (!map[key]) map[key] = { gross: 0, count: 0 };
    map[key].gross += appointmentRevenueCents(a, byId);
    map[key].count++;
  }
  return Object.entries(map)
    .map(([method, v]) => {
      const rate = rates[method] ?? 0;
      const fee = Math.round(v.gross * (rate / 100));
      return { method, label: paymentLabel(method), gross: v.gross, fee, net: v.gross - fee, count: v.count };
    })
    .sort((a, b) => b.gross - a.gross);
}

/* ---------- Recorrência de clientes / LTV ---------- */

export interface RecurrenceStats {
  totalClients: number;
  newClients: number;      // primeira visita dentro do range
  returning: number;       // já tinham visita anterior ao range
  returnRate: number;      // % de clientes com 2+ visitas (geral)
  avgDaysBetween: number;  // frequência média entre visitas
  ltv: number;             // valor médio gasto por cliente (geral)
}

const clientKey = (a: Appointment) => (a.client_id || a.client_whatsapp || a.client_name || '').toString();

export function clientRecurrence(
  appointments: Appointment[],
  byId: ServicesById,
  range: DateRange,
): RecurrenceStats {
  const billed = appointments.filter(APPROVED).slice().sort((a, b) => a.date.localeCompare(b.date));
  const byClient = new Map<string, Appointment[]>();
  for (const a of billed) {
    const k = clientKey(a); if (!k) continue;
    (byClient.get(k) ?? byClient.set(k, []).get(k)!).push(a);
  }

  let newClients = 0, returning = 0, repeatClients = 0;
  let gapDaysTotal = 0, gapCount = 0, spendTotal = 0;
  const inR = (iso: string) => inRange(iso, range.start, range.end);

  for (const visits of byClient.values()) {
    const firstIso = visits[0].date;
    const hasInRange = visits.some(v => inR(v.date));
    if (hasInRange) {
      if (firstIso >= range.start) newClients++; else returning++;
    }
    if (visits.length >= 2) {
      repeatClients++;
      for (let i = 1; i < visits.length; i++) {
        const gap = (Date.parse(`${visits[i].date}T00:00:00`) - Date.parse(`${visits[i - 1].date}T00:00:00`)) / 86400000;
        gapDaysTotal += gap; gapCount++;
      }
    }
    spendTotal += visits.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0);
  }

  const totalClients = byClient.size;
  return {
    totalClients,
    newClients, returning,
    returnRate: totalClients ? (repeatClients / totalClients) * 100 : 0,
    avgDaysBetween: gapCount ? Math.round(gapDaysTotal / gapCount) : 0,
    ltv: totalClients ? Math.round(spendTotal / totalClients) : 0,
  };
}

/** Ranking de clientes por valor gasto no intervalo. */
export interface ClientRankRow { key: string; name: string; spent: number; visits: number }
export function topClientsBySpend(appointments: Appointment[], byId: ServicesById, range: DateRange, limit = 10): ClientRankRow[] {
  const map = new Map<string, ClientRankRow>();
  for (const a of appointments) {
    if (!APPROVED(a) || !inRange(a.date, range.start, range.end)) continue;
    const k = clientKey(a); if (!k) continue;
    const row = map.get(k) ?? { key: k, name: a.client_name, spent: 0, visits: 0 };
    row.spent += appointmentRevenueCents(a, byId); row.visits++;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent).slice(0, limit);
}

/* ---------- Funil de conversão ---------- */

export interface FunnelStage { label: string; value: number; pct: number }
export function funnel(appointments: Appointment[], range: DateRange): FunnelStage[] {
  const appts = appointments.filter(a => inRange(a.date, range.start, range.end));
  const scheduled = appts.length;
  const confirmed = appts.filter(a => a.status === 'confirmed' || a.status === 'completed').length;
  const completed = appts.filter(a => a.status === 'completed').length;
  const lost = appts.filter(a => a.status === 'cancelled' || a.status === 'no_show').length;
  const pct = (v: number) => (scheduled ? (v / scheduled) * 100 : 0);
  return [
    { label: 'Agendados', value: scheduled, pct: 100 },
    { label: 'Confirmados', value: confirmed, pct: pct(confirmed) },
    { label: 'Concluídos', value: completed, pct: pct(completed) },
    { label: 'Faltas/Cancelados', value: lost, pct: pct(lost) },
  ];
}

/* ---------- Análise por serviço ---------- */

export interface ServiceStatsRow {
  id: string; name: string; count: number; revenue: number; ticket: number; share: number; spark: number[];
}
export function serviceStats(
  appointments: Appointment[],
  services: Service[],
  byId: ServicesById,
  range: DateRange,
  sparkMonths = 6,
): ServiceStatsRow[] {
  const map = new Map<string, { id: string; name: string; count: number; revenue: number }>();
  let totalRev = 0;
  const billed = appointments.filter(APPROVED);
  for (const a of billed) {
    if (!inRange(a.date, range.start, range.end)) continue;
    const ids = a.service_ids && a.service_ids.length ? a.service_ids : [a.service_id];
    for (const id of ids) {
      const svc = byId[id] || services.find(s => s.id === id);
      const price = svc?.price_cents ?? 0;
      const row = map.get(id) ?? { id, name: svc?.name ?? 'Serviço excluído', count: 0, revenue: 0 };
      row.count++; row.revenue += price; totalRev += price;
      map.set(id, row);
    }
  }
  // sparkline: receita por mês (últimos sparkMonths) por serviço
  const sparkFor = (id: string): number[] => {
    const now = new Date();
    const out: number[] = [];
    for (let i = sparkMonths - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const r = monthRange(d.getFullYear(), d.getMonth());
      let v = 0;
      for (const a of billed) {
        if (!inRange(a.date, r.start, r.end)) continue;
        const ids = a.service_ids && a.service_ids.length ? a.service_ids : [a.service_id];
        if (ids.includes(id)) v += byId[id]?.price_cents ?? 0;
      }
      out.push(v);
    }
    return out;
  };
  return [...map.values()]
    .map(r => ({ ...r, ticket: r.count ? Math.round(r.revenue / r.count) : 0, share: totalRev ? (r.revenue / totalRev) * 100 : 0, spark: sparkFor(r.id) }))
    .sort((a, b) => b.revenue - a.revenue);
}

/* ---------- Série mensal (faturamento x lucro líquido) ---------- */

export interface MonthlyPoint { label: string; ym: string; gross: number; net: number }
const MONTHS_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export function monthlySeries(
  appointments: Appointment[],
  transactions: Transaction[],
  fixed: FixedExpense[],
  services: Service[],
  nMonths = 12,
  today: Date = new Date(),
): MonthlyPoint[] {
  const byId = indexServices(services);
  const out: MonthlyPoint[] = [];
  for (let i = nMonths - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const range = monthRange(y, m);
    // contas fixas só contam a partir do mês de criação
    const activeFixed = fixed.filter(f => f.active && new Date(f.created_at) <= new Date(y, m + 1, 0));
    const mt = metricsForRange(appointments, transactions, activeFixed, byId, range, { monthsInRange: 1 });
    out.push({ label: `${MONTHS_ABBR[m]}/${String(y).slice(2)}`, ym: `${y}-${pad(m + 1)}`, gross: mt.grossRevenue + mt.manualIncome, net: mt.netProfit });
  }
  return out;
}
