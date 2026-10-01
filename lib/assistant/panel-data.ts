import { tool } from 'ai';
import { z } from 'zod';
import { dbService } from '@/lib/supabase/db';
import { appointmentRevenueCents, indexServices, type ServicesById } from '@/lib/finance';
import {
  byPaymentMethod, clientRecurrence, compare, DEFAULT_PAYMENT_RATES, funnel, metricsForRange, monthRange,
  projectionForMonth, receivablesAging, serviceStats, topClientsBySpend, type DateRange,
} from '@/lib/analytics';
import { formatServiceNames, resolveAppointmentServices } from '@/lib/appointments/services';
import { professionalCan } from '@/lib/subscription/guard';
import {
  CAPABILITY_LABEL, PLAN_LABEL, planEnforced, requiredPlan, resolvePlan, type Capability,
} from '@/lib/subscription/entitlements';
import type { AnamnesisResponse, Appointment, AppointmentStatus, FixedExpense, Service, WaitlistStatus } from '@/types/database';

/**
 * O que a Ana LÊ do painel: uma ferramenta por tela (Início, Contas, Vendas,
 * Agenda, Contatos, Serviços, Disponibilidade, Bloqueios, Lista de espera,
 * Tarefas e Conta), com as MESMAS regras de cálculo das telas. Se a Ana e o
 * painel dessem números diferentes, a profissional deixaria de confiar nos dois.
 *
 * Valores saem em reais (com centavos) e as listas vêm cortadas: tudo o que a
 * ferramenta devolve vai para o modelo e é cobrado — na voz, a cada resposta.
 * Telas de plano pago continuam do plano pago aqui também.
 */

type Ctx = { professionalId: string; todayISO: string };

const reais = (cents: number) => Math.round(cents) / 100;
const pct1 = (n: number) => Math.round(n * 10) / 10;
const pad = (n: number) => String(n).padStart(2, '0');
const digits = (s?: string | null) => (s || '').replace(/\D/g, '');
const fold = (s?: string | null) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const hhmm = (t?: string | null) => (t || '').slice(0, 5);
const isBillable = (a: Appointment) => a.status === 'confirmed' || a.status === 'completed';
const byDateTime = (a: Appointment, b: Appointment) => (a.date + a.start_time).localeCompare(b.date + b.start_time);

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const STATUS_PT: Record<AppointmentStatus, string> = {
  pending: 'aguardando confirmação', confirmed: 'confirmado', completed: 'concluído', cancelled: 'cancelado', no_show: 'faltou',
};
const WAITLIST_PT: Record<WaitlistStatus, string> = {
  waiting: 'aguardando', contacted: 'contatada', scheduled: 'agendada', cancelled: 'cancelada', no_response: 'sem resposta',
};
const SUBSCRIPTION_PT: Record<string, string> = {
  active: 'ativa', trialing: 'em teste grátis', past_due: 'pagamento atrasado', canceled: 'cancelada',
};

/** Soma dias a uma data YYYY-MM-DD (meio-dia UTC: sem tropeço de fuso). */
export function addDaysISO(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const lastDayOf = (y: number, m1: number) => new Date(Date.UTC(y, m1, 0)).getUTCDate();
/** O mesmo dia em outro mês, sem estourar (31/03 → 28/02). */
const sameDayIn = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(Math.min(d, lastDayOf(y, m1)))}`;
/** Data de São Paulo de um timestamp. */
const spDate = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date(ts));
/** As funções do painel leem a data com getFullYear/getDate: meio-dia local. */
const asLocalDate = (iso: string) => new Date(`${iso}T12:00:00`);
const monthIdx = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');

/** Tira campos vazios: menos tokens, mesma informação. */
function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(o).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)),
  ) as Partial<T>;
}

/** Recurso de plano pago: devolve o aviso para a Ana explicar, ou null se liberado. */
async function blockedBy(professionalId: string, capability: Capability) {
  if (await professionalCan(professionalId, capability)) return null;
  return {
    disponivel: false,
    motivo: `O recurso "${CAPABILITY_LABEL[capability]}" faz parte do plano ${PLAN_LABEL[requiredPlan(capability)]}.`,
  };
}

async function loadCore(professionalId: string) {
  const [appointments, services] = await Promise.all([
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
  ]);
  return { appointments, services, byId: indexServices(services) };
}

function apptRow(a: Appointment, services: Service[], byId: ServicesById) {
  return compact({
    id: a.id,
    data: a.date,
    dia_semana: WEEKDAYS[weekdayOf(a.date)],
    horario: `${hhmm(a.start_time)}–${hhmm(a.end_time)}`,
    cliente: a.client_name,
    servicos: formatServiceNames(resolveAppointmentServices(a, services)) || a.service?.name || '',
    valor: reais(appointmentRevenueCents(a, byId)),
    situacao: STATUS_PT[a.status] ?? a.status,
    pagamento: a.payment_method || '',
    obs: (a.notes || '').slice(0, 120),
    motivo_cancelamento: a.status === 'cancelled' ? (a.cancellation_reason || '').slice(0, 120) : '',
  });
}

/** Contas fixas de um período: cada mês cobra as ativas criadas até ele, no dia 1º
 *  (igual à tela Contas) — um período que não passa por um dia 1º não tem conta fixa. */
function fixedTotalCents(fixed: FixedExpense[], range: DateRange) {
  let total = 0;
  const firstIdx = monthIdx(range.start) + (range.start.endsWith('-01') ? 0 : 1);
  for (let idx = firstIdx; idx <= monthIdx(range.end); idx++) {
    for (const f of fixed) if (f.active && monthIdx(spDate(f.created_at)) <= idx) total += f.amount_cents;
  }
  return total;
}

interface ClientStats {
  visitas: number; concluidos: number; faltas: number; cancelados: number; gastoCents: number;
  primeira: string | null; ultima: string | null; proximo: Appointment | null; appts: Appointment[];
}

/** Números por cliente, pelo WhatsApp (como a tela Contatos): "visitas" são os
 *  agendamentos não cancelados; gasto e última visita contam só até hoje. */
function statsByPhone(appointments: Appointment[], byId: ServicesById, todayISO: string) {
  const map = new Map<string, ClientStats>();
  for (const a of appointments) {
    const key = digits(a.client_whatsapp);
    if (!key) continue;
    let s = map.get(key);
    if (!s) {
      s = { visitas: 0, concluidos: 0, faltas: 0, cancelados: 0, gastoCents: 0, primeira: null, ultima: null, proximo: null, appts: [] };
      map.set(key, s);
    }
    s.appts.push(a);
    if (a.status === 'cancelled') { s.cancelados++; continue; }
    s.visitas++;
    if (a.status === 'completed') s.concluidos++;
    if (a.status === 'no_show') s.faltas++;
    if (isBillable(a) && a.date <= todayISO) {
      s.gastoCents += appointmentRevenueCents(a, byId);
      if (!s.ultima || a.date > s.ultima) s.ultima = a.date;
      if (!s.primeira || a.date < s.primeira) s.primeira = a.date;
    }
    if ((a.status === 'pending' || a.status === 'confirmed') && a.date >= todayISO && (!s.proximo || byDateTime(a, s.proximo) < 0)) {
      s.proximo = a;
    }
  }
  return map;
}

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);

export function buildPanelTools({ professionalId, todayISO }: Ctx) {
  return {
    // ===== INÍCIO: faturamento, só dos períodos perguntados =====
    getRevenue: tool({
      description:
        'FATURAMENTO (tela Início): quanto ela faturou. Peça SÓ os períodos da pergunta: hoje, ontem, ultimos_7_dias, ' +
        'semana_atual (desde domingo), mes (até hoje, com o confirmado até o fim do mês), ano (até hoje), total (desde o começo) ' +
        'e ultimos_12_meses (mês a mês, para "melhor mês" ou evolução). Para outro intervalo, passe from/to. ' +
        'Cada período vem comparado ao anterior.',
      parameters: z.object({
        periods: z.array(z.enum(['hoje', 'ontem', 'ultimos_7_dias', 'semana_atual', 'mes', 'ano', 'total', 'ultimos_12_meses']))
          .optional().describe('Só os períodos que ela perguntou'),
        from: z.string().optional().describe('Início de outro intervalo, YYYY-MM-DD'),
        to: z.string().optional().describe('Fim de outro intervalo, YYYY-MM-DD'),
      }),
      execute: async ({ periods, from, to }) => {
        const { appointments, byId } = await loadCore(professionalId);
        const t = todayISO;
        const [y, m, d] = t.split('-').map(Number);
        const billable = appointments.filter(isBillable);
        const cents = (a: Appointment) => appointmentRevenueCents(a, byId);
        const sum = (start: string, end: string) => {
          let total = 0, n = 0;
          for (const a of billable) if (a.date >= start && a.date <= end) { total += cents(a); n++; }
          return { total, n };
        };
        const periodo = (start: string, end: string, prevStart?: string, prevEnd?: string) => {
          const cur = sum(start, end);
          const out: Record<string, unknown> = {
            de: start, ate: end, faturado: reais(cur.total), atendimentos: cur.n,
            ticket_medio: reais(cur.n ? cur.total / cur.n : 0),
          };
          if (prevStart && prevEnd) {
            const prev = sum(prevStart, prevEnd);
            out.anterior = { de: prevStart, ate: prevEnd, faturado: reais(prev.total) };
            out.variacao_pct = prev.total ? pct1(compare(cur.total, prev.total).deltaPct) : null;
          }
          return out;
        };

        const ontem = addDaysISO(t, -1);
        const domingo = addDaysISO(t, -weekdayOf(t));
        const mesIni = `${y}-${pad(m)}-01`;
        const prev = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
        const pedidos = new Set(periods?.length ? periods : (from && to ? [] : ['mes']));

        const out: Record<string, unknown> = {
          regra: 'Faturamento = atendimentos confirmados + concluídos, pela data do atendimento (igual à tela Início).',
        };
        if (from && to) out.periodo_pedido = periodo(from, to);
        if (pedidos.has('hoje')) out.hoje = periodo(t, t, ontem, ontem);
        if (pedidos.has('ontem')) out.ontem = periodo(ontem, ontem, addDaysISO(t, -2), addDaysISO(t, -2));
        if (pedidos.has('ultimos_7_dias')) out.ultimos_7_dias = periodo(addDaysISO(t, -6), t, addDaysISO(t, -13), addDaysISO(t, -7));
        if (pedidos.has('semana_atual')) out.semana_atual = periodo(domingo, t, addDaysISO(domingo, -7), addDaysISO(t, -7));
        if (pedidos.has('mes')) {
          const mesFim = `${y}-${pad(m)}-${pad(lastDayOf(y, m))}`;
          const confirmado = billable
            .filter(a => a.status === 'confirmed' && a.date > t && a.date <= mesFim)
            .reduce((s, a) => s + cents(a), 0);
          out.mes_ate_hoje = {
            ...periodo(mesIni, t, `${prev.y}-${pad(prev.m)}-01`, sameDayIn(prev.y, prev.m, d)),
            confirmado_daqui_ate_o_fim_do_mes: reais(confirmado),
            total_esperado_no_mes: reais(sum(mesIni, t).total + confirmado),
          };
        }
        if (pedidos.has('ano')) out.ano_ate_hoje = periodo(`${y}-01-01`, t, `${y - 1}-01-01`, sameDayIn(y - 1, m, d));
        if (pedidos.has('total')) {
          const primeira = billable.reduce<string | null>((min, a) => (a.date <= t && (!min || a.date < min) ? a.date : min), null);
          out.total_desde_o_comeco = primeira ? periodo(primeira, t) : { faturado: 0, atendimentos: 0 };
        }
        if (pedidos.has('ultimos_12_meses')) {
          out.ultimos_12_meses = Array.from({ length: 12 }, (_, i) => {
            const idx = y * 12 + (m - 1) - (11 - i);
            const yy = Math.floor(idx / 12), mm = (idx % 12) + 1;
            const r = sum(`${yy}-${pad(mm)}-01`, i === 11 ? t : `${yy}-${pad(mm)}-${pad(lastDayOf(yy, mm))}`);
            return { mes: `${yy}-${pad(mm)}`, faturado: reais(r.total), atendimentos: r.n };
          });
        }
        return out;
      },
    }),

    // ===== CONTAS: financeiro do mês ou período + situação de agora =====
    getFinanceReport: tool({
      description:
        'Financeiro (tela Contas) de um mês ou período: entradas (atendimentos + lançamentos), saídas (insumos, contas fixas e despesas lançadas), ' +
        'lucro líquido, margem, ticket médio, situação dos atendimentos, perdas com cancelamentos e faltas, formas de pagamento e despesas por categoria, ' +
        'comparado ao mês anterior. Sem parâmetros: mês atual. Saldo acumulado, contas a receber (vencidos e a vencer) e projeção do mês ' +
        'só vêm com include_current_status (use só se ela perguntar disso).',
      parameters: z.object({
        month: z.string().optional().describe('Mês no formato YYYY-MM'),
        from: z.string().optional().describe('Início de um período personalizado, YYYY-MM-DD'),
        to: z.string().optional().describe('Fim do período personalizado, YYYY-MM-DD'),
        include_current_status: z.boolean().optional()
          .describe('true só se ela perguntar de saldo, contas a receber/vencidos ou projeção do mês'),
      }),
      execute: async ({ month, from, to, include_current_status }) => {
        const [appointments, services, transactions, fixed] = await Promise.all([
          dbService.getAppointmentsByProfessional(professionalId),
          dbService.getServicesByProfessional(professionalId),
          dbService.getTransactionsByProfessional(professionalId),
          dbService.getFixedExpensesByProfessional(professionalId),
        ]);
        const byId = indexServices(services);

        let range: DateRange;
        let prevRange: DateRange | null = null;
        if (from && to) {
          range = { start: from, end: to };
        } else {
          const ym = month && /^\d{4}-\d{2}$/.test(month) ? month : todayISO.slice(0, 7);
          const [y, m] = ym.split('-').map(Number);
          range = monthRange(y, m - 1);
          prevRange = m === 1 ? monthRange(y - 1, 11) : monthRange(y, m - 2);
        }

        const numbers = (r: DateRange) => {
          // Sem contas fixas aqui: elas entram mês a mês logo abaixo, como na tela.
          const mt = metricsForRange(appointments, transactions, [], byId, r);
          const fixas = fixedTotalCents(fixed, r);
          const entradas = mt.grossRevenue + mt.manualIncome;
          const saidas = mt.variableCosts + mt.fixedCosts + fixas;
          return { mt, fixas, entradas, saidas, lucro: entradas - saidas };
        };
        const cur = numbers(range);

        const despesas = new Map<string, number>();
        for (const tx of transactions) {
          if (tx.type !== 'expense' || tx.date < range.start || tx.date > range.end) continue;
          despesas.set(tx.category || 'Sem categoria', (despesas.get(tx.category || 'Sem categoria') ?? 0) + tx.amount_cents);
        }
        if (cur.fixas) despesas.set('Contas fixas', (despesas.get('Contas fixas') ?? 0) + cur.fixas);

        // Situação de agora (independe do período pedido) — só se ela perguntou.
        const situacao = () => {
          const today = asLocalDate(todayISO);
          const nowIdx = monthIdx(todayISO);
          const upToNow = (iso: string) => monthIdx(iso) <= nowIdx;
          const saldo =
            appointments.filter(a => isBillable(a) && upToNow(a.date)).reduce((s, a) => s + appointmentRevenueCents(a, byId), 0)
            + transactions.filter(tx => tx.type === 'income' && upToNow(tx.date)).reduce((s, tx) => s + tx.amount_cents, 0)
            - transactions.filter(tx => tx.type === 'expense' && upToNow(tx.date)).reduce((s, tx) => s + tx.amount_cents, 0)
            - fixed.filter(f => f.active).reduce((s, f) => {
              const start = monthIdx(spDate(f.created_at));
              return start > nowIdx ? s : s + f.amount_cents * (nowIdx - start + 1);
            }, 0);
          const aging = receivablesAging(appointments, byId, today);
          const proj = projectionForMonth(appointments, byId, today);
          return {
            saldo_acumulado: reais(saldo),
            a_receber: {
              explicacao: 'Atendimentos confirmados ou aguardando que ainda não foram concluídos.',
              vencidos: {
                total: reais(aging.overdue.total), quantidade: aging.overdue.items.length,
                mais_antigos: aging.overdue.items.slice(0, 5).map(r => ({
                  cliente: r.appointment.client_name, data: r.appointment.date, valor: reais(r.amount), dias: r.daysOverdue,
                })),
              },
              a_vencer: { total: reais(aging.dueSoon.total), quantidade: aging.dueSoon.items.length },
            },
            projecao_do_mes: {
              ja_concluido: reais(proj.realized),
              confirmado_daqui_pra_frente: reais(proj.confirmedAhead),
              estimativa_pelo_historico: reais(proj.historicalRunRate),
              projetado: reais(proj.projected),
            },
          };
        };

        return {
          periodo: { de: range.start, ate: range.end },
          entradas: { atendimentos: reais(cur.mt.grossRevenue), lancamentos: reais(cur.mt.manualIncome), total: reais(cur.entradas) },
          saidas: {
            insumos_dos_atendimentos: reais(cur.mt.variableCosts),
            contas_fixas: reais(cur.fixas),
            despesas_lancadas: reais(cur.mt.fixedCosts),
            total: reais(cur.saidas),
          },
          lucro_liquido: reais(cur.lucro),
          margem_pct: cur.entradas > 0 ? pct1((cur.lucro / cur.entradas) * 100) : 0,
          ticket_medio: reais(cur.mt.ticket),
          ja_realizado_concluidos: reais(cur.mt.realized),
          a_realizar_confirmados: reais(cur.mt.predicted),
          atendimentos: {
            faturados: cur.mt.count, concluidos: cur.mt.completed, confirmados: cur.mt.confirmed,
            aguardando_confirmacao: cur.mt.pending, cancelados: cur.mt.cancelled, faltas: cur.mt.noShow,
          },
          perdido_com_cancelamentos_e_faltas: reais(cur.mt.lostRevenue),
          formas_de_pagamento: byPaymentMethod(appointments, byId, DEFAULT_PAYMENT_RATES, range)
            .map(p => ({ forma: p.label, valor: reais(p.gross), atendimentos: p.count })),
          despesas_por_categoria: [...despesas.entries()].sort((a, b) => b[1] - a[1])
            .map(([categoria, v]) => ({ categoria, valor: reais(v) })),
          ...(prevRange ? (() => {
            const p = numbers(prevRange);
            return { mes_anterior: { entradas: reais(p.entradas), saidas: reais(p.saidas), lucro_liquido: reais(p.lucro) } };
          })() : {}),
          ...(include_current_status ? { situacao_de_agora: situacao() } : {}),
        };
      },
    }),

    listFinanceEntries: tool({
      description: 'Lançamentos manuais do financeiro (entradas e saídas) num período, e as contas fixas cadastradas. Sem período: mês atual.',
      parameters: z.object({
        from: z.string().optional().describe('Data inicial, YYYY-MM-DD'),
        to: z.string().optional().describe('Data final, YYYY-MM-DD'),
        type: z.enum(['income', 'expense']).optional().describe('income = só entradas, expense = só saídas'),
      }),
      execute: async ({ from, to, type }) => {
        const [transactions, fixed] = await Promise.all([
          dbService.getTransactionsByProfessional(professionalId),
          dbService.getFixedExpensesByProfessional(professionalId),
        ]);
        const [y, m] = todayISO.split('-').map(Number);
        const def = monthRange(y, m - 1);
        const start = from || def.start;
        const end = to || def.end;
        const rows = transactions
          .filter(tx => tx.date >= start && tx.date <= end && (!type || tx.type === type))
          .sort((a, b) => b.date.localeCompare(a.date));
        const total = (k: 'income' | 'expense') => reais(rows.filter(tx => tx.type === k).reduce((s, tx) => s + tx.amount_cents, 0));
        return {
          de: start, ate: end,
          total_entradas: total('income'), total_saidas: total('expense'),
          quantidade: rows.length, lista_cortada: rows.length > 60,
          lancamentos: rows.slice(0, 60).map(tx => compact({
            id: tx.id, data: tx.date, tipo: tx.type === 'income' ? 'entrada' : 'saída',
            valor: reais(tx.amount_cents), categoria: tx.category, descricao: tx.description || '',
          })),
          contas_fixas: fixed.map(f => ({ nome: f.name, valor_mensal: reais(f.amount_cents), ativa: f.active })),
        };
      },
    }),

    // ===== VENDAS (plano Pro) =====
    getSalesReport: tool({
      description:
        'Relatório de Vendas: faturamento, quantidade e ticket médio, serviços (do que mais faturou ao que menos, com quantas vezes cada), clientes que mais gastaram no período, ' +
        'recorrência (novas x que voltaram, taxa de retorno, intervalo médio entre visitas, gasto médio por cliente) e funil. ' +
        'period: mes (padrão), ano ou tudo; ou um período com from/to.',
      parameters: z.object({
        period: z.enum(['mes', 'ano', 'tudo']).optional(),
        from: z.string().optional().describe('Data inicial, YYYY-MM-DD'),
        to: z.string().optional().describe('Data final, YYYY-MM-DD'),
      }),
      execute: async ({ period, from, to }) => {
        const blocked = await blockedBy(professionalId, 'sales');
        if (blocked) return blocked;
        const { appointments, services, byId } = await loadCore(professionalId);
        const [y, m] = todayISO.split('-').map(Number);
        let range: DateRange;
        let prevRange: DateRange | null = null;
        if (from && to) range = { start: from, end: to };
        else if (period === 'ano') { range = { start: `${y}-01-01`, end: `${y}-12-31` }; prevRange = { start: `${y - 1}-01-01`, end: `${y - 1}-12-31` }; }
        else if (period === 'tudo') range = { start: '0000-01-01', end: '9999-12-31' };
        else { range = monthRange(y, m - 1); prevRange = m === 1 ? monthRange(y - 1, 11) : monthRange(y, m - 2); }

        const sales = appointments.filter(isBillable);
        const total = (r: DateRange) => {
          const list = sales.filter(a => a.date >= r.start && a.date <= r.end);
          return { cents: list.reduce((s, a) => s + appointmentRevenueCents(a, byId), 0), n: list.length };
        };
        const cur = total(range);
        const rec = clientRecurrence(appointments, byId, range);
        const fun = funnel(appointments, range);
        return {
          periodo: period === 'tudo' && !from ? 'desde o começo' : { de: range.start, ate: range.end },
          faturado: reais(cur.cents),
          vendas: cur.n,
          ticket_medio: reais(cur.n ? cur.cents / cur.n : 0),
          ...(prevRange ? (() => {
            const p = total(prevRange);
            return { periodo_anterior: { faturado: reais(p.cents), vendas: p.n, variacao_pct: p.cents ? pct1(compare(cur.cents, p.cents).deltaPct) : null } };
          })() : {}),
          servicos_do_que_mais_faturou: serviceStats(appointments, services, byId, range).slice(0, 10)
            .map(r => ({ servico: r.name, vezes: r.count, faturado: reais(r.revenue), participacao_pct: pct1(r.share) })),
          clientes_que_mais_gastaram: topClientsBySpend(appointments, byId, range, 10)
            .map(r => ({ cliente: r.name, visitas: r.visits, gasto: reais(r.spent) })),
          recorrencia: {
            clientes_atendidas: rec.newClients + rec.returning,
            novas: rec.newClients,
            que_ja_vinham: rec.returning,
            taxa_de_retorno_geral_pct: pct1(rec.returnRate),
            intervalo_medio_entre_visitas_dias: rec.avgDaysBetween,
            gasto_medio_por_cliente_geral: reais(rec.ltv),
          },
          funil: { agendados: fun[0].value, confirmados: fun[1].value, concluidos: fun[2].value, faltas_ou_cancelados: fun[3].value },
        };
      },
    }),

    // ===== AGENDA / AGENDAMENTOS =====
    getAppointments: tool({
      description:
        'Agendamentos num período, com serviço, valor e situação; filtra por cliente e por situação. Serve também para histórico. ' +
        'Sem período: dos últimos 30 dias aos próximos 60. Para "hoje", "amanhã", "semana que vem", "março" etc., passe from/to.',
      parameters: z.object({
        from: z.string().optional().describe('Data inicial, YYYY-MM-DD'),
        to: z.string().optional().describe('Data final, YYYY-MM-DD'),
        client: z.string().optional().describe('Nome ou WhatsApp da cliente (um pedaço basta)'),
        status: z.enum(['pending', 'confirmed', 'completed', 'cancelled', 'no_show']).optional()
          .describe('pending = aguardando confirmação, confirmed = confirmado, completed = concluído, cancelled = cancelado, no_show = faltou'),
      }),
      execute: async ({ from, to, client, status }) => {
        const { appointments, services, byId } = await loadCore(professionalId);
        const start = from || addDaysISO(todayISO, -30);
        const end = to || addDaysISO(todayISO, 60);
        const q = fold(client);
        const qDigits = digits(client);
        const rows = appointments
          .filter(a => a.date >= start && a.date <= end)
          .filter(a => !status || a.status === status)
          .filter(a => !q || fold(a.client_name).includes(q) || (qDigits.length >= 4 && digits(a.client_whatsapp).includes(qDigits)))
          .sort(byDateTime);
        const porSituacao: Record<string, number> = {};
        for (const a of rows) porSituacao[STATUS_PT[a.status] ?? a.status] = (porSituacao[STATUS_PT[a.status] ?? a.status] ?? 0) + 1;
        // A agenda inteira chegava a 800+ itens: lento e caro, sobretudo por voz.
        const LIMIT = 60;
        return {
          de: start,
          ate: end,
          total: rows.length,
          por_situacao: porSituacao,
          valor_confirmados_e_concluidos: reais(rows.filter(isBillable).reduce((s, a) => s + appointmentRevenueCents(a, byId), 0)),
          lista_cortada: rows.length > LIMIT,
          agendamentos: rows.slice(0, LIMIT).map(a => apptRow(a, services, byId)),
        };
      },
    }),

    // ===== CONTATOS =====
    listClients: tool({
      description:
        'Contatos (clientes) com visitas, gasto, última visita e próximo horário. Busca por nome/WhatsApp e filtros: ' +
        'aniversariantes do mês ou da semana, sumidas (sem vir há 45+ dias e sem horário marcado), mais frequentes, que mais gastaram (desde sempre), novas no mês. ' +
        'Para quem mais gastou num período (mês, ano), use getSalesReport.',
      parameters: z.object({
        search: z.string().optional().describe('Nome ou WhatsApp (um pedaço basta)'),
        filter: z.enum(['todas', 'aniversariantes_do_mes', 'aniversariantes_da_semana', 'sumidas', 'mais_frequentes', 'que_mais_gastaram', 'novas_no_mes']).optional(),
        days_away: z.number().int().min(1).max(730).optional().describe('Para "sumidas": dias sem vir (padrão 45)'),
        limit: z.number().int().min(1).max(50).optional().describe('Quantas devolver (padrão 20)'),
      }),
      execute: async ({ search, filter, days_away, limit }) => {
        const [{ appointments, byId }, clients] = await Promise.all([
          loadCore(professionalId),
          dbService.getClientsByProfessional(professionalId),
        ]);
        const stats = statsByPhone(appointments, byId, todayISO);
        const q = fold(search);
        const qDigits = digits(search);
        const mesAtual = todayISO.slice(5, 7);
        const semana = new Set(Array.from({ length: 7 }, (_, i) => addDaysISO(todayISO, i).slice(5)));
        const away = days_away ?? 45;

        let rows = clients.map(c => {
          const s = stats.get(digits(c.whatsapp));
          return { c, s, diasSemVir: s?.ultima ? daysBetween(s.ultima, todayISO) : null };
        });
        if (q) rows = rows.filter(r => fold(r.c.name).includes(q) || (qDigits.length >= 4 && digits(r.c.whatsapp).includes(qDigits)));
        switch (filter) {
          case 'aniversariantes_do_mes':
            rows = rows.filter(r => r.c.birthday?.slice(5, 7) === mesAtual)
              .sort((a, b) => (a.c.birthday || '').slice(8).localeCompare((b.c.birthday || '').slice(8)));
            break;
          case 'aniversariantes_da_semana':
            rows = rows.filter(r => r.c.birthday && semana.has(r.c.birthday.slice(5, 10)));
            break;
          case 'sumidas':
            rows = rows.filter(r => r.diasSemVir !== null && r.diasSemVir >= away && !r.s?.proximo)
              .sort((a, b) => (b.diasSemVir ?? 0) - (a.diasSemVir ?? 0));
            break;
          case 'mais_frequentes':
            rows = rows.filter(r => (r.s?.visitas ?? 0) > 0).sort((a, b) => (b.s?.visitas ?? 0) - (a.s?.visitas ?? 0));
            break;
          case 'que_mais_gastaram':
            rows = rows.filter(r => (r.s?.gastoCents ?? 0) > 0).sort((a, b) => (b.s?.gastoCents ?? 0) - (a.s?.gastoCents ?? 0));
            break;
          case 'novas_no_mes':
            rows = rows.filter(r => r.c.created_at && spDate(r.c.created_at).slice(0, 7) === todayISO.slice(0, 7));
            break;
          default:
            rows.sort((a, b) => a.c.name.localeCompare(b.c.name, 'pt-BR'));
        }
        const max = limit ?? 20;
        return {
          total_cadastradas: clients.length,
          encontradas: rows.length,
          lista_cortada: rows.length > max,
          clientes: rows.slice(0, max).map(({ c, s, diasSemVir }) => compact({
            id: c.id,
            nome: c.name,
            whatsapp: c.whatsapp,
            aniversario: c.birthday || '',
            visitas: s?.visitas ?? c.total_appointments ?? 0,
            gasto_total: reais(s?.gastoCents ?? 0),
            ultima_visita: s?.ultima || c.last_appointment_at?.slice(0, 10) || '',
            dias_sem_vir: diasSemVir,
            proximo_horario: s?.proximo ? `${s.proximo.date} ${hhmm(s.proximo.start_time)}` : '',
          })),
        };
      },
    }),

    getClientDetails: tool({
      description:
        'Tudo sobre UMA cliente: contato, aniversário, observações, visitas, faltas, cancelamentos, gasto total, ticket médio, ' +
        'primeira e última visita, próximo horário, serviços favoritos, histórico e fichas de anamnese. ' +
        'Se houver mais de uma com o mesmo nome, devolve as opções para você perguntar qual.',
      parameters: z.object({
        client: z.string().describe('Nome, WhatsApp ou ID da cliente'),
        include_answers: z.boolean().optional()
          .describe('true só quando ela perguntar o que a cliente respondeu na ficha (alergias, saúde etc.)'),
      }),
      execute: async ({ client, include_answers }) => {
        const [{ appointments, services, byId }, clients] = await Promise.all([
          loadCore(professionalId),
          dbService.getClientsByProfessional(professionalId),
        ]);
        const q = fold(client);
        const qDigits = digits(client);
        let matches = clients.filter(c => c.id === client.trim());
        if (!matches.length && qDigits.length >= 4) matches = clients.filter(c => digits(c.whatsapp).includes(qDigits));
        if (!matches.length && q) {
          const exact = clients.filter(c => fold(c.name) === q);
          matches = exact.length ? exact : clients.filter(c => fold(c.name).includes(q));
        }
        if (!matches.length) return { encontrada: false, aviso: `Não achei nenhuma cliente com "${client}" nos contatos.` };
        if (matches.length > 1) {
          return {
            encontrada: false,
            varias: matches.slice(0, 8).map(c => ({ id: c.id, nome: c.name, whatsapp: c.whatsapp })),
            aviso: 'Há mais de uma cliente com esse nome. Pergunte qual delas.',
          };
        }

        const c = matches[0];
        const phone = digits(c.whatsapp);
        const s = statsByPhone(appointments.filter(a => digits(a.client_whatsapp) === phone), byId, todayISO).get(phone);
        const history = (s?.appts ?? []).slice().sort((a, b) => byDateTime(b, a));
        const fav = new Map<string, number>();
        for (const a of history) {
          if (a.status === 'cancelled') continue;
          for (const svc of resolveAppointmentServices(a, services)) fav.set(svc.name, (fav.get(svc.name) ?? 0) + 1);
        }
        const billablePast = history.filter(a => isBillable(a) && a.date <= todayISO);

        const responses = (await dbService.getAnamnesisResponses(professionalId).catch((): AnamnesisResponse[] => []))
          .filter(r => r.client_id === c.id || digits(r.client_whatsapp) === phone)
          .slice(0, 3);

        return compact({
          encontrada: true,
          id: c.id,
          nome: c.name,
          whatsapp: c.whatsapp,
          email: c.email || '',
          aniversario: c.birthday || '',
          observacoes: (c.notes || '').slice(0, 600),
          cadastrada_em: c.created_at ? spDate(c.created_at) : '',
          resumo: compact({
            visitas: s?.visitas ?? 0,
            concluidos: s?.concluidos ?? 0,
            faltas: s?.faltas ?? 0,
            cancelamentos: s?.cancelados ?? 0,
            gasto_total: reais(s?.gastoCents ?? 0),
            ticket_medio: reais(billablePast.length ? (s?.gastoCents ?? 0) / billablePast.length : 0),
            primeira_visita: s?.primeira || '',
            ultima_visita: s?.ultima || '',
            dias_sem_vir: s?.ultima ? daysBetween(s.ultima, todayISO) : null,
            proximo_horario: s?.proximo ? apptRow(s.proximo, services, byId) : null,
          }),
          servicos_favoritos: [...fav.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([servico, vezes]) => ({ servico, vezes })),
          historico: history.slice(0, 15).map(a => apptRow(a, services, byId)),
          historico_cortado: history.length > 15,
          fichas_de_anamnese: responses.map(r => compact({
            ficha: r.form_title,
            situacao: r.status === 'completed' ? 'preenchida' : 'enviada, ainda não preenchida',
            preenchida_em: r.completed_at ? spDate(r.completed_at) : '',
            respostas: include_answers && r.status === 'completed'
              ? (r.answers || [])
                .map(ans => {
                  const label = r.questions_snapshot?.find(qq => qq.id === ans.questionId)?.label || 'Pergunta';
                  const value = Array.isArray(ans.answer) ? ans.answer.join(', ') : ans.answer;
                  return value ? `${label}: ${value}` : '';
                })
                .filter(Boolean).join(' | ').slice(0, 1500)
              : '',
          })),
        });
      },
    }),

    // ===== SERVIÇOS, DISPONIBILIDADE E BLOQUEIOS =====
    listServices: tool({
      description: 'Serviços cadastrados: preço, duração, custo de insumos, se está ativo e se aparece para as clientes.',
      parameters: z.object({}),
      execute: async () => {
        const svcs = await dbService.getServicesByProfessional(professionalId);
        return svcs.map(s => compact({
          id: s.id,
          nome: s.name,
          duracao_min: s.duration_minutes,
          preco: reais(s.price_cents),
          custo_insumos: s.cost_cents ? reais(s.cost_cents) : null,
          ativo: s.is_active,
          aparece_para_clientes: s.client_visible,
          descricao: (s.description || '').slice(0, 160),
        }));
      },
    }),

    getAvailability: tool({
      description:
        'Dias e horários de atendimento (tela Disponibilidade), com pausa, intervalo entre horários e folga entre atendimentos, ' +
        'mais as regras de agendamento: antecedência mínima, até quantos dias a agenda fica aberta, confirmação, sinal e link de agendamento. ' +
        'Para horários LIVRES num dia, use checkAvailability.',
      parameters: z.object({}),
      execute: async () => {
        const [rules, settings, prof] = await Promise.all([
          dbService.getAvailabilityRulesByProfessional(professionalId),
          dbService.getSettingsByProfessional(professionalId).catch(() => null),
          dbService.getProfessionalById(professionalId),
        ]);
        const dias = [1, 2, 3, 4, 5, 6, 0].map(wd => {
          const r = rules.find(x => x.weekday === wd);
          if (!r || !r.is_active) return { dia: WEEKDAYS[wd], atende: false };
          return compact({
            dia: WEEKDAYS[wd],
            atende: true,
            das: hhmm(r.start_time),
            ate: hhmm(r.end_time),
            pausa: r.break_start && r.break_end ? `${hhmm(r.break_start)}–${hhmm(r.break_end)}` : '',
            horarios_a_cada_min: r.slot_interval_minutes,
            folga_entre_atendimentos_min: r.buffer_minutes,
          });
        });
        return compact({
          dias,
          regras_de_agendamento: settings ? compact({
            confirmacao: settings.confirmation_mode === 'automatic' ? 'automática' : 'manual (ela confirma cada pedido)',
            antecedencia_minima_horas: settings.min_notice_hours,
            agenda_aberta_ate_dias: settings.max_days_ahead,
            exige_sinal: settings.requires_deposit ?? false,
            mostra_preco_na_pagina: settings.show_price_public,
          }) : null,
          link_de_agendamento: prof?.slug ? `${appUrl()}/agendar/${prof.slug}` : '',
        });
      },
    }),

    listTimeBlocks: tool({
      description: 'Bloqueios de horário (folgas, feriados, compromissos) num período. Sem período: de hoje até 90 dias.',
      parameters: z.object({
        from: z.string().optional().describe('Data inicial, YYYY-MM-DD'),
        to: z.string().optional().describe('Data final, YYYY-MM-DD'),
      }),
      execute: async ({ from, to }) => {
        const blocked = await blockedBy(professionalId, 'blocks');
        if (blocked) return blocked;
        const start = from || todayISO;
        const end = to || addDaysISO(todayISO, 90);
        const rows = (await dbService.getTimeBlocksByProfessional(professionalId))
          .filter(b => b.date >= start && b.date <= end)
          .sort((a, b) => (a.date + (a.start_time || '')).localeCompare(b.date + (b.start_time || '')));
        return {
          de: start, ate: end, total: rows.length, lista_cortada: rows.length > 60,
          bloqueios: rows.slice(0, 60).map(b => compact({
            data: b.date,
            dia_semana: WEEKDAYS[weekdayOf(b.date)],
            dia_inteiro: b.block_type === 'full_day' || !b.start_time,
            das: b.block_type === 'full_day' ? '' : hhmm(b.start_time),
            ate: b.block_type === 'full_day' ? '' : hhmm(b.end_time),
            motivo: b.reason || '',
          })),
        };
      },
    }),

    // ===== LISTA DE ESPERA, TAREFAS E CONTA =====
    listWaitlist: tool({
      description: 'Lista de espera: quem aguarda horário, serviço desejado, data/período preferido e situação. Por padrão só as ativas.',
      parameters: z.object({
        all: z.boolean().optional().describe('true = inclui as já agendadas e canceladas'),
      }),
      execute: async ({ all }) => {
        const blocked = await blockedBy(professionalId, 'waitlist');
        if (blocked) return blocked;
        const rows = (await dbService.getWaitlistByProfessional(professionalId))
          .filter(e => all || e.status === 'waiting' || e.status === 'contacted' || e.status === 'no_response');
        return {
          total: rows.length,
          lista_cortada: rows.length > 40,
          entradas: rows.slice(0, 40).map(e => compact({
            id: e.id,
            cliente: e.client_name,
            whatsapp: e.client_whatsapp,
            servico: e.service_name || '',
            data_desejada: e.desired_date || '',
            periodo: e.desired_period || '',
            preferencia: e.time_preference || '',
            situacao: WAITLIST_PT[e.status] ?? e.status,
            obs: (e.notes || '').slice(0, 120),
            desde: e.created_at ? spDate(e.created_at) : '',
          })),
        };
      },
    }),

    listTasks: tool({
      description: 'Tarefas e notas da profissional, com data, hora e se estão atrasadas.',
      parameters: z.object({
        status: z.enum(['todas', 'pendentes', 'feitas']).optional().describe('Padrão: todas'),
      }),
      execute: async ({ status }) => {
        const tasks = await dbService.getTasksByProfessional(professionalId);
        // Data já mastigada (dia da semana, "atrasada"): com a data crua, o modelo
        // chegou a "corrigir" tarefas atrasadas para os dias seguintes.
        return tasks
          .filter(t => !status || status === 'todas' || (status === 'feitas' ? t.done : !t.done))
          .map(t => compact({
            id: t.id,
            tarefa: t.content,
            feita: t.done,
            data: t.due_date || '',
            dia_semana: t.due_date ? WEEKDAYS[weekdayOf(t.due_date)] : '',
            hora: hhmm(t.due_time),
            atrasada: !t.done && !!t.due_date && t.due_date < todayISO ? `sim, desde ${t.due_date}` : '',
          }));
      },
    }),

    getAccountInfo: tool({
      description:
        'Dados da conta: nome, marca, plano e assinatura, link de agendamento, Minha Página (publicada ou não), ' +
        'WhatsApp (robô e mensagens automáticas ligadas) e contatos do perfil.',
      parameters: z.object({}),
      execute: async () => {
        const [prof, site, wa] = await Promise.all([
          dbService.getProfessionalById(professionalId),
          dbService.getPublishedSiteByProfessional(professionalId).catch(() => null),
          dbService.getWhatsAppSettings(professionalId).catch(() => null),
        ]);
        if (!prof) return { erro: 'Conta não encontrada.' };
        // Conta antiga ou em teste tem tudo liberado: dizer "Start" ali seria mentir.
        const enforced = planEnforced({ createdAt: prof.created_at, status: prof.subscription_status });
        const plano = enforced
          ? PLAN_LABEL[resolvePlan(prof.subscription_plan)]
          : prof.subscription_status === 'trialing'
            ? 'teste grátis, com todos os recursos liberados'
            : 'conta antiga, com todos os recursos liberados';
        const automacoes = wa ? [
          wa.automation_booking_enabled && 'confirmação logo depois do agendamento',
          wa.automation_5days_enabled && `lembrete 5 dias antes (${hhmm(wa.automation_5days_time)})`,
          wa.automation_day_before_enabled && `lembrete na véspera (${hhmm(wa.automation_day_before_time)})`,
          wa.automation_day_of_enabled && `lembrete no dia (${hhmm(wa.automation_day_of_time)})`,
          wa.automation_followup_enabled && `mensagem para quem sumiu há ${wa.automation_followup_days} dias`,
        ].filter((x): x is string => typeof x === 'string') : [];
        return compact({
          nome: prof.name,
          marca: prof.brand_name,
          plano,
          assinatura: SUBSCRIPTION_PT[prof.subscription_status || ''] ?? prof.subscription_status ?? '',
          teste_gratis_ate: prof.trial_ends_at ? spDate(prof.trial_ends_at) : '',
          assinatura_vale_ate: prof.subscription_ends_at ? spDate(prof.subscription_ends_at) : '',
          link_de_agendamento: prof.slug ? `${appUrl()}/agendar/${prof.slug}` : '',
          minha_pagina: site && prof.slug ? { publicada: true, link: `${appUrl()}/${prof.slug}` } : { publicada: false },
          whatsapp: compact({
            conectado: !!(wa?.uazapi_url && wa?.uazapi_token),
            robo_respondendo_clientes: wa?.bot_enabled ?? false,
            mensagens_automaticas_ligadas: automacoes,
          }),
          contato: compact({
            whatsapp: prof.whatsapp, email: prof.email, instagram: prof.instagram || '',
            endereco: [prof.address, prof.city, prof.state].filter(Boolean).join(', '),
          }),
        });
      },
    }),
  };
}
