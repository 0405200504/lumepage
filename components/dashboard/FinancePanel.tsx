'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction, Appointment, TransactionType, FixedExpense, Service } from '@/types/database';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank,
  Plus, Trash2, X, ArrowDownCircle, ArrowUpCircle, Repeat, DollarSign,
  BarChart4, ReceiptText, PieChart, LineChart as LineIcon, ScrollText, Clock4,
  CreditCard, Sliders, Calculator,
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import {
  createTransactionAction, deleteTransactionAction,
  createFixedExpenseAction, deleteFixedExpenseAction,
} from '@/app/actions/crm';
import { formatDateBR } from '@/lib/whatsapp';
import { brl } from '@/lib/format';
import { indexServices, appointmentRevenueCents } from '@/lib/finance';
import {
  monthRange, metricsForRange, compare, projectionForMonth, receivablesAging,
  byPaymentMethod, monthlySeries, DEFAULT_PAYMENT_RATES, PaymentRates, paymentLabel,
} from '@/lib/analytics';
import { KpiCard } from '../ui/KpiCard';
import { SectionHeader } from '../ui/SectionHeader';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { QuickAddFab } from '../ui/QuickAddFab';
import { DrillDownModal, DrillDownRow } from '../ui/DrillDownModal';
import { LineChart } from '../ui/charts/LineChart';
import { DonutChart, DonutSlice } from '../ui/charts/DonutChart';
import { toCSV, downloadCSV, centsToPlain } from '@/lib/export';

interface FinancePanelProps {
  professionalId: string;
  transactions: Transaction[];
  appointments: Appointment[];
  fixedExpenses: FixedExpense[];
  services: Service[];
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const EXPENSE_CATS = ['Produtos e materiais', 'Aluguel', 'Energia/Água/Internet', 'Marketing', 'Salários/Comissões', 'Impostos', 'Equipamentos', 'Outros'];
const INCOME_CATS = ['Serviço avulso', 'Venda de produto', 'Pacote/Plano', 'Outros'];
// Paleta reduzida: tons de bordô + neutros (sem arco-íris).
const DONUT_COLORS = ['#6b1525', '#8c2438', '#bc5d70', '#db97a6', '#ecc3cc', '#9a9aa3', '#c7c7cc', '#6b6b73'];
const RATES_KEY = 'lume-payment-rates';

const pad = (n: number) => n.toString().padStart(2, '0');
const idxOf = (y: number, m: number) => y * 12 + m;
const parseCents = (v: string) => {
  const clean = v.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
};

interface LedgerItem {
  id: string; kind: TransactionType; amount_cents: number;
  category: string; description: string | null; date: string; auto?: boolean;
}

type TabType = 'overview' | 'ledger' | 'cashflow' | 'categories' | 'fixed';
type DrillType = null | 'income' | 'expense' | 'profit' | 'receivable';

export const FinancePanel: React.FC<FinancePanelProps> = ({ professionalId, transactions, appointments, fixedExpenses, services }) => {
  const router = useRouter();
  const { success, error } = useToast();
  const now = new Date();
  const byId = useMemo(() => indexServices(services), [services]);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [drill, setDrill] = useState<DrillType>(null);

  // Taxas por forma de pagamento (editáveis, persistidas localmente)
  const [rates, setRates] = useState<PaymentRates>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAYMENT_RATES;
    try { const s = localStorage.getItem(RATES_KEY); if (s) return { ...DEFAULT_PAYMENT_RATES, ...JSON.parse(s) }; } catch { /* */ }
    return DEFAULT_PAYMENT_RATES;
  });
  const [showRates, setShowRates] = useState(false);
  const updateRate = (method: string, value: number) => {
    setRates(prev => { const next = { ...prev, [method]: value }; try { localStorage.setItem(RATES_KEY, JSON.stringify(next)); } catch { /* */ } return next; });
  };

  // Modal de lançamento
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form contas fixas
  const [fxName, setFxName] = useState('');
  const [fxAmount, setFxAmount] = useState('');
  const [fxSaving, setFxSaving] = useState(false);

  const inMonth = (iso: string, y: number, m: number) => {
    const [yy, mm] = iso.split('-').map(Number);
    return yy === y && mm === m + 1;
  };
  const monthFirst = `${cursor.y}-${pad(cursor.m + 1)}-01`;

  // Contas fixas que valem para um mês (a partir do mês de cadastro)
  const fixedForMonth = useCallback((y: number, m: number) =>
    fixedExpenses.filter(f => f.active).filter(f => {
      const c = new Date(f.created_at);
      return idxOf(y, m) >= idxOf(c.getFullYear(), c.getMonth());
    }), [fixedExpenses]);

  // --- Itens do mês selecionado (extrato + categorias + drill-down) ---
  const monthAuto: LedgerItem[] = useMemo(() =>
    appointments
      .filter(a => (a.status === 'completed' || a.status === 'confirmed') && inMonth(a.date, cursor.y, cursor.m))
      .map(a => ({
        id: `appt-${a.id}`, kind: 'income' as TransactionType, amount_cents: appointmentRevenueCents(a, byId),
        category: a.status === 'completed' ? 'Atendimento concluído' : 'Atendimento confirmado',
        description: `${a.service?.name ?? 'Serviço'} · ${a.client_name}`, date: a.date, auto: true,
      })).filter(i => i.amount_cents > 0),
  [appointments, cursor, byId]);

  const monthManual: LedgerItem[] = useMemo(() =>
    transactions.filter(t => inMonth(t.date, cursor.y, cursor.m))
      .map(t => ({ id: t.id, kind: t.type, amount_cents: t.amount_cents, category: t.category, description: t.description, date: t.date })),
  [transactions, cursor]);

  const monthFixed: LedgerItem[] = useMemo(() =>
    fixedForMonth(cursor.y, cursor.m).map(f => ({
      id: `fixed-${f.id}`, kind: 'expense' as TransactionType, amount_cents: f.amount_cents,
      category: 'Conta fixa', description: f.name, date: monthFirst, auto: true,
    })),
  [fixedForMonth, cursor, monthFirst]);

  const monthItems = useMemo(
    () => [...monthAuto, ...monthManual, ...monthFixed].sort((a, b) => b.date.localeCompare(a.date)),
    [monthAuto, monthManual, monthFixed]
  );

  // --- Métricas do mês (atual / anterior / mesmo mês ano passado) ---
  const range = useMemo(() => monthRange(cursor.y, cursor.m), [cursor]);
  const metrics = useMemo(
    () => metricsForRange(appointments, transactions, fixedForMonth(cursor.y, cursor.m), byId, range),
    [appointments, transactions, fixedForMonth, byId, range, cursor]
  );
  const prevC = useMemo(() => { const d = new Date(cursor.y, cursor.m - 1, 1); return { y: d.getFullYear(), m: d.getMonth() }; }, [cursor]);
  const prevMetrics = useMemo(
    () => metricsForRange(appointments, transactions, fixedForMonth(prevC.y, prevC.m), byId, monthRange(prevC.y, prevC.m)),
    [appointments, transactions, fixedForMonth, byId, prevC]
  );
  const lyMetrics = useMemo(
    () => metricsForRange(appointments, transactions, fixedForMonth(cursor.y - 1, cursor.m), byId, monthRange(cursor.y - 1, cursor.m)),
    [appointments, transactions, fixedForMonth, byId, cursor]
  );

  const income = metrics.grossRevenue + metrics.manualIncome;
  const prevIncome = prevMetrics.grossRevenue + prevMetrics.manualIncome;
  const expense = metrics.variableCosts + metrics.fixedCosts;
  const prevExpense = prevMetrics.variableCosts + prevMetrics.fixedCosts;

  const cmpIncome = compare(income, prevIncome);
  const cmpExpense = compare(expense, prevExpense);
  const cmpProfit = compare(metrics.netProfit, prevMetrics.netProfit);

  // Saldo acumulado (até o mês real atual)
  const totalBalance = useMemo(() => {
    const today = new Date();
    const realIdx = idxOf(today.getFullYear(), today.getMonth());
    const incomeAll = appointments
      .filter(a => (a.status === 'completed' || a.status === 'confirmed'))
      .filter(a => { const [y, m] = a.date.split('-').map(Number); return idxOf(y, m - 1) <= realIdx; })
      .reduce((s, a) => s + appointmentRevenueCents(a, byId), 0)
      + transactions.filter(t => t.type === 'income').filter(t => { const [y, m] = t.date.split('-').map(Number); return idxOf(y, m - 1) <= realIdx; }).reduce((s, t) => s + t.amount_cents, 0);
    const manualExpenseAll = transactions.filter(t => t.type === 'expense').filter(t => { const [y, m] = t.date.split('-').map(Number); return idxOf(y, m - 1) <= realIdx; }).reduce((s, t) => s + t.amount_cents, 0);
    const fixedAll = fixedExpenses.filter(f => f.active).reduce((s, f) => {
      const c = new Date(f.created_at);
      const startIdx = idxOf(c.getFullYear(), c.getMonth());
      if (startIdx > realIdx) return s;
      return s + f.amount_cents * (realIdx - startIdx + 1);
    }, 0);
    return incomeAll - manualExpenseAll - fixedAll;
  }, [appointments, transactions, fixedExpenses, byId]);

  // Projeção, a receber, formas de pagamento, evolução do lucro
  const projection = useMemo(() => projectionForMonth(appointments, byId), [appointments, byId]);
  const receivables = useMemo(() => receivablesAging(appointments, byId), [appointments, byId]);
  const payments = useMemo(() => byPaymentMethod(appointments, byId, rates, range), [appointments, byId, rates, range]);
  const netSeries = useMemo(() => monthlySeries(appointments, transactions, fixedExpenses, services, 12), [appointments, transactions, fixedExpenses, services]);

  // Categorias (mês)
  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.filter(i => i.kind === 'expense').forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount_cents; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);
  const incomeByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.filter(i => i.kind === 'income').forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount_cents; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);

  const fixedMonthlyTotal = fixedExpenses.filter(f => f.active).reduce((s, f) => s + f.amount_cents, 0);

  const step = (dir: 1 | -1) => {
    let m = cursor.m + dir, y = cursor.y;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCursor({ y, m });
  };

  // ---- Ações ----
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(amount);
    if (!cents || cents <= 0) { error('Valor inválido', 'Informe um valor maior que zero.'); return; }
    setSaving(true);
    try {
      const res = await createTransactionAction(professionalId, {
        type: formType, amountCents: cents, category: category || (formType === 'expense' ? 'Outros' : 'Serviço avulso'),
        description, date,
      });
      if (res.success) { success('Lançamento salvo!', 'Controle financeiro atualizado.'); setShowForm(false); setAmount(''); setCategory(''); setDescription(''); router.refresh(); }
      else error('Falha', res.error || 'Não foi possível salvar.');
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await deleteTransactionAction(professionalId, id);
      if (res.success) { success('Removido', 'Lançamento excluído.'); router.refresh(); }
      else error('Falha', res.error || 'Não foi possível excluir.');
    } finally { setDeletingId(null); }
  };

  const addFixed = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = parseCents(fxAmount);
    if (!fxName.trim()) { error('Nome obrigatório', 'Dê um nome para a conta fixa.'); return; }
    if (!cents || cents <= 0) { error('Valor inválido', 'Informe um valor maior que zero.'); return; }
    setFxSaving(true);
    try {
      const res = await createFixedExpenseAction(professionalId, fxName, cents);
      if (res.success) { success('Conta fixa adicionada!', 'Ela entra automaticamente em todo mês.'); setFxName(''); setFxAmount(''); router.refresh(); }
      else error('Falha', res.error || 'Não foi possível salvar.');
    } finally { setFxSaving(false); }
  };

  const removeFixed = async (id: string) => {
    const res = await deleteFixedExpenseAction(professionalId, id);
    if (res.success) { success('Removida', 'Conta fixa excluída.'); router.refresh(); }
    else error('Falha', res.error || 'Erro.');
  };

  // ---- Drill-down ----
  const drillData = useMemo((): { title: string; rows: DrillDownRow[] } => {
    if (drill === 'income') return {
      title: 'Entradas do mês',
      rows: monthItems.filter(i => i.kind === 'income').map(i => ({ id: i.id, title: i.category, subtitle: `${i.description ?? ''} · ${formatDateBR(i.date)}`, amountCents: i.amount_cents, tone: 'in' as const })),
    };
    if (drill === 'expense') return {
      title: 'Saídas do mês',
      rows: monthItems.filter(i => i.kind === 'expense').map(i => ({ id: i.id, title: i.category, subtitle: `${i.description ?? ''} · ${formatDateBR(i.date)}`, amountCents: i.amount_cents, tone: 'out' as const })),
    };
    if (drill === 'profit') return {
      title: 'Composição do lucro do mês',
      rows: monthItems.map(i => ({ id: i.id, title: i.category, subtitle: `${i.description ?? ''} · ${formatDateBR(i.date)}`, amountCents: i.amount_cents, tone: i.kind === 'income' ? 'in' as const : 'out' as const })),
    };
    if (drill === 'receivable') return {
      title: 'Contas a receber',
      rows: [...receivables.overdue.items, ...receivables.dueSoon.items].map(r => ({
        id: r.appointment.id, title: r.appointment.client_name,
        subtitle: `${r.appointment.service?.name ?? 'Serviço'} · ${formatDateBR(r.appointment.date)}${r.daysOverdue > 0 ? ` · ${r.daysOverdue}d vencido` : ''}`,
        amountCents: r.amount, tone: 'neutral' as const,
      })),
    };
    return { title: '', rows: [] };
  }, [drill, monthItems, receivables]);

  const exportLedgerCSV = () => {
    const csv = toCSV(monthItems, [
      { header: 'Data', value: i => formatDateBR(i.date) },
      { header: 'Tipo', value: i => i.kind === 'income' ? 'Entrada' : 'Saída' },
      { header: 'Categoria', value: i => i.category },
      { header: 'Descrição', value: i => i.description ?? '' },
      { header: 'Valor', value: i => `${i.kind === 'expense' ? '-' : ''}${centsToPlain(i.amount_cents)}` },
    ]);
    downloadCSV(`extrato-${cursor.y}-${pad(cursor.m + 1)}`, csv);
  };

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral', icon: <BarChart4 className="h-4 w-4" /> },
    { key: 'ledger' as const, label: 'Extrato', icon: <ReceiptText className="h-4 w-4" /> },
    { key: 'cashflow' as const, label: 'Fluxo & lucro', icon: <LineIcon className="h-4 w-4" /> },
    { key: 'categories' as const, label: 'Categorias', icon: <PieChart className="h-4 w-4" /> },
    { key: 'fixed' as const, label: 'Contas fixas', icon: <Repeat className="h-4 w-4" /> },
  ];

  // DRE
  const dreLines = [
    { label: 'Receita bruta', value: income, tone: 'pos' as const, strong: true },
    { label: '(−) Custos variáveis (insumos)', value: -metrics.variableCosts, tone: 'neg' as const },
    { label: '(−) Custos fixos', value: -metrics.fixedCosts, tone: 'neg' as const },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-surface border border-line rounded-xl p-1 shadow-soft">
            <button onClick={() => step(-1)} aria-label="Mês anterior" className="p-2 rounded-lg hover:bg-surface-2 text-gray-450 hover:text-forest"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => step(1)} aria-label="Próximo mês" className="p-2 rounded-lg hover:bg-surface-2 text-gray-450 hover:text-forest"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <h3 className="text-lg font-bold text-heading tracking-tight capitalize">{MONTHS[cursor.m]} {cursor.y}</h3>
        </div>
        <div className="flex gap-2">
          <ExportMenu onCSV={exportLedgerCSV} />
          <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-soft transition-colors">
            <Plus className="h-4 w-4" /> Lançamento
          </button>
        </div>
      </div>

      <QuickAddFab actions={[{ label: 'Novo lançamento', icon: Plus, onClick: () => setShowForm(true) }]} />

      <Segmented items={tabs} value={activeTab} onChange={setActiveTab} className="no-print" />

      <div className="min-h-[400px]">
        {/* ===================== VISÃO GERAL ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            {/* KPIs com comparativo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Entradas do mês" value={brl(income)} icon={<DollarSign className="h-5 w-5" />} comparison={cmpIncome} hint="Serviços + avulsos" onClick={() => setDrill('income')} accent />
              <KpiCard label="Saídas do mês" value={brl(expense)} icon={<ArrowDownCircle className="h-5 w-5" />} comparison={cmpExpense} higherIsBetter={false} hint="Insumos + fixas + lançamentos" onClick={() => setDrill('expense')} />
              <KpiCard label="Lucro do mês" value={brl(metrics.netProfit)} icon={metrics.netProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />} comparison={cmpProfit} hint={`Margem ${metrics.margin.toFixed(0)}%`} onClick={() => setDrill('profit')} />
              <KpiCard label="Saldo acumulado" value={brl(totalBalance)} icon={<PiggyBank className="h-5 w-5" />} hint="Sobrou até hoje" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* DRE */}
              <div className="card p-5 sm:p-6">
                <SectionHeader title="DRE simplificado" subtitle={`${MONTHS[cursor.m]} ${cursor.y}`} icon={<Calculator className="h-4 w-4" />} />
                <div className="mt-4 divide-y divide-line">
                  {dreLines.map((l) => (
                    <div key={l.label} className="flex items-center justify-between py-2.5">
                      <span className={`text-sm ${l.strong ? 'font-bold text-ink' : 'text-gray-450 font-medium'}`}>{l.label}</span>
                      <span className={`text-sm font-bold tabular-nums ${l.value < 0 ? 'text-[color:var(--color-bad)]' : 'text-ink'}`}>{l.value < 0 ? '−' : ''}{brl(Math.abs(l.value))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-sm font-bold text-heading">= Lucro líquido</span>
                    <span className={`text-lg font-bold tabular-nums ${metrics.netProfit >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-bad)]'}`}>{brl(metrics.netProfit)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-line">
                  <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">Margem líquida</span>
                  <span className={`text-sm font-bold ${metrics.margin >= 0 ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-bad)]'}`}>{metrics.margin.toFixed(1)}%</span>
                </div>
                {metrics.lostRevenue > 0 && (
                  <p className="mt-3 text-[11px] text-gray-450">Receita perdida com cancelamentos/faltas no mês: <strong className="text-[color:var(--color-bad)]">{brl(metrics.lostRevenue)}</strong> (não entra no cálculo, é informativo).</p>
                )}
                {metrics.variableCosts === 0 && (
                  <p className="mt-2 text-[11px] text-gray-450">Dica: informe o <strong>custo de insumos</strong> de cada serviço (tela Serviços) para o DRE calcular os custos variáveis.</p>
                )}
              </div>

              {/* Projeção + comparativo anual */}
              <div className="card p-5 sm:p-6 flex flex-col">
                <SectionHeader title="Projeção do mês" subtitle={isCurrentMonth ? 'Estimativa até o fim do mês' : 'Disponível só no mês corrente'} icon={<TrendingUp className="h-4 w-4" />} />
                {isCurrentMonth ? (
                  <>
                    <p className="text-3xl font-bold text-heading mt-4 tabular-nums">{brl(projection.projected)}</p>
                    <div className="mt-4 space-y-2 text-xs">
                      <Row label="Já realizado" value={brl(projection.realized)} />
                      <Row label="Confirmados a vir" value={brl(projection.confirmedAhead)} />
                      <Row label="Estimativa (média histórica)" value={brl(projection.historicalRunRate)} muted />
                    </div>
                    <p className="mt-3 text-[11px] text-gray-450">Soma o que já foi concluído, os agendamentos confirmados que ainda vão acontecer e uma estimativa dos dias restantes pela sua média diária dos últimos 90 dias.</p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center py-8">
                    <p className="text-xs text-gray-450 max-w-[220px]">A projeção é calculada para o mês atual. Volte para {MONTHS[now.getMonth()]} para vê-la.</p>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-line flex items-center justify-between text-xs">
                  <span className="text-gray-450 font-semibold">vs. mesmo mês de {cursor.y - 1}</span>
                  <span className="font-bold text-ink tabular-nums">{brl(lyMetrics.grossRevenue + lyMetrics.manualIncome)} → {compare(income, lyMetrics.grossRevenue + lyMetrics.manualIncome).deltaPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* A receber + formas de pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5 sm:p-6">
                <SectionHeader title="Contas a receber" subtitle="Valores previstos ainda não realizados" icon={<ScrollText className="h-4 w-4" />}
                  actions={<button onClick={() => setDrill('receivable')} className="text-[11px] font-bold text-forest hover:underline">Ver tudo →</button>} />
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={() => setDrill('receivable')} className="text-left rounded-xl border border-[color:var(--color-bad)]/20 bg-[color:var(--color-bad)]/5 p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-[color:var(--color-bad)] uppercase tracking-wider"><Clock4 className="h-3.5 w-3.5" /> Vencido</p>
                    <p className="text-xl font-bold text-[color:var(--color-bad)] mt-1 tabular-nums">{brl(receivables.overdue.total)}</p>
                    <p className="text-[11px] text-gray-450 mt-0.5">{receivables.overdue.items.length} agendamento(s)</p>
                  </button>
                  <div className="rounded-xl border border-line bg-surface-2 p-4">
                    <p className="flex items-center gap-1.5 text-[10px] font-bold text-gray-450 uppercase tracking-wider"><Clock4 className="h-3.5 w-3.5" /> A vencer</p>
                    <p className="text-xl font-bold text-ink mt-1 tabular-nums">{brl(receivables.dueSoon.total)}</p>
                    <p className="text-[11px] text-gray-450 mt-0.5">{receivables.dueSoon.items.length} agendamento(s)</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-gray-450">Baseado em agendamentos pendentes/confirmados (data passada = vencido).</p>
              </div>

              <div className="card p-5 sm:p-6">
                <SectionHeader title="Por forma de pagamento" subtitle="Bruto, taxa e líquido no mês" icon={<CreditCard className="h-4 w-4" />}
                  actions={<button onClick={() => setShowRates(s => !s)} className="inline-flex items-center gap-1 text-[11px] font-bold text-forest hover:underline"><Sliders className="h-3.5 w-3.5" /> Taxas</button>} />
                {showRates && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3">
                    {['pix', 'debito', 'credito', 'dinheiro'].map(m => (
                      <label key={m} className="flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-gray-450 font-semibold">{paymentLabel(m)}</span>
                        <span className="flex items-center gap-1">
                          <input type="number" min={0} step={0.1} value={rates[m] ?? 0} onChange={e => updateRate(m, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 text-right border border-line rounded-md bg-surface text-ink font-bold" />
                          <span className="text-gray-450">%</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {payments.length === 0 ? (
                  <p className="text-xs text-gray-450 py-8 text-center">Sem vendas com forma de pagamento no mês.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {payments.map(p => (
                      <div key={p.method} className="flex items-center justify-between gap-2 rounded-xl border border-line p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink truncate">{p.label}</p>
                          <p className="text-[11px] text-gray-450">{p.count} venda(s) · taxa {brl(p.fee)}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">{brl(p.net)}</p>
                          <p className="text-[10px] text-gray-450">líquido de {brl(p.gross)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Evolução do lucro líquido */}
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Evolução do lucro líquido" subtitle="Faturamento x lucro · últimos 12 meses" icon={<LineIcon className="h-4 w-4" />} />
              <div className="mt-5">
                <LineChart
                  labels={netSeries.map(p => p.label)}
                  series={[
                    { name: 'Faturamento', color: 'var(--color-gray-450)', values: netSeries.map(p => p.gross / 100) },
                    { name: 'Lucro líquido', color: 'var(--color-wine-500)', values: netSeries.map(p => p.net / 100) },
                  ]}
                  format={(v) => brl(Math.round(v * 100))}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===================== EXTRATO ===================== */}
        {activeTab === 'ledger' && (
          <div className="card p-5 sm:p-6 space-y-4 animate-fade-up">
            <SectionHeader title="Extrato do mês" subtitle={`${monthItems.length} lançamentos`} icon={<ReceiptText className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportLedgerCSV} />} />
            <div className="space-y-2 max-h-[600px] overflow-y-auto scroll-touch -mx-1 px-1">
              {monthItems.length === 0 ? (
                <div className="text-center py-14 border border-dashed border-line rounded-2xl">
                  <Wallet className="h-8 w-8 text-gray-450/60 mx-auto" />
                  <p className="text-xs text-gray-450 mt-3">Nenhum lançamento neste mês.</p>
                  <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-bold text-forest hover:underline">Adicionar o primeiro →</button>
                </div>
              ) : monthItems.map((i) => {
                const inc = i.kind === 'income';
                const isFixed = i.id.startsWith('fixed-');
                return (
                  <div key={i.id} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2 transition-colors">
                    <span className={`p-2 rounded-lg shrink-0 ${inc ? 'bg-[color:var(--color-ok)]/10 text-[color:var(--color-ok)]' : 'bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)]'}`}>
                      {isFixed ? <Repeat className="h-4 w-4" /> : inc ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{i.category}</p>
                      <p className="text-[11px] text-gray-450 truncate">{i.description || '—'} · {formatDateBR(i.date)}</p>
                    </div>
                    <span className={`text-sm font-bold shrink-0 tabular-nums ${inc ? 'text-[color:var(--color-ok)]' : 'text-[color:var(--color-bad)]'}`}>{inc ? '+' : '−'}{brl(i.amount_cents)}</span>
                    {i.auto ? (
                      <span className="text-[8px] font-bold text-gray-450 bg-surface-2 rounded-full px-1.5 py-0.5 shrink-0 no-print">{isFixed ? 'FIXA' : 'AUTO'}</span>
                    ) : (
                      <button onClick={() => remove(i.id)} disabled={deletingId === i.id} className="p-1.5 rounded-lg text-gray-450 hover:text-[color:var(--color-bad)] hover:bg-[color:var(--color-bad)]/10 transition-colors shrink-0 no-print">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== FLUXO & LUCRO ===================== */}
        {activeTab === 'cashflow' && (
          <div className="card p-5 sm:p-6 animate-fade-up">
            <SectionHeader title="Fluxo de caixa e lucro" subtitle="Faturamento x lucro líquido · últimos 12 meses" icon={<LineIcon className="h-4 w-4" />} />
            <div className="mt-6">
              <LineChart
                height={260}
                labels={netSeries.map(p => p.label)}
                series={[
                  { name: 'Faturamento', color: 'var(--color-gray-450)', values: netSeries.map(p => p.gross / 100) },
                  { name: 'Lucro líquido', color: 'var(--color-wine-500)', values: netSeries.map(p => p.net / 100) },
                ]}
                format={(v) => brl(Math.round(v * 100))}
              />
            </div>
          </div>
        )}

        {/* ===================== CATEGORIAS ===================== */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Saídas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {expenseByCat.length === 0 ? <p className="text-xs text-gray-450 py-8 text-center">Sem saídas no mês.</p> : (
                  <DonutChart format={brl} data={expenseByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Entradas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {incomeByCat.length === 0 ? <p className="text-xs text-gray-450 py-8 text-center">Sem entradas no mês.</p> : (
                  <DonutChart format={brl} data={incomeByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== CONTAS FIXAS ===================== */}
        {activeTab === 'fixed' && (
          <div className="card p-5 sm:p-6 max-w-2xl mx-auto animate-fade-up">
            <SectionHeader title="Contas fixas mensais" subtitle="Lançadas como saída todo mês, a partir do cadastro" icon={<Repeat className="h-4 w-4" />} />
            <form onSubmit={addFixed} className="flex flex-col sm:flex-row gap-2 my-5 no-print">
              <input placeholder="Ex: Aluguel do espaço" value={fxName} onChange={(e) => setFxName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 bg-surface-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500" />
              <input inputMode="decimal" placeholder="R$ 0,00" value={fxAmount} onChange={(e) => setFxAmount(e.target.value)}
                className="w-full sm:w-32 px-3 py-2.5 bg-surface-2 border border-line rounded-xl text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500" />
              <button type="submit" disabled={fxSaving} className="px-5 py-2.5 bg-forest hover:bg-forest-hover text-white rounded-xl font-bold text-xs disabled:opacity-60 shrink-0 transition-colors">Adicionar</button>
            </form>
            <div className="space-y-2">
              {fixedExpenses.filter(f => f.active).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-line rounded-2xl">
                  <Repeat className="h-6 w-6 text-gray-450/50 mx-auto mb-2" />
                  <p className="text-xs text-gray-450">Nenhuma conta fixa cadastrada.</p>
                </div>
              ) : fixedExpenses.filter(f => f.active).map(f => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-line p-4 hover:bg-surface-2 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="bg-[color:var(--color-bad)]/10 p-2 rounded-lg text-[color:var(--color-bad)]"><Repeat className="h-4 w-4" /></span>
                    <div>
                      <p className="text-sm font-bold text-ink truncate">{f.name}</p>
                      <p className="text-[11px] text-gray-450">Desde {formatDateBR(f.created_at.split('T')[0])}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[color:var(--color-bad)] font-bold tabular-nums">{brl(f.amount_cents)} / mês</span>
                    <button onClick={() => removeFixed(f.id)} className="p-1.5 rounded-lg text-gray-450 hover:text-[color:var(--color-bad)] hover:bg-[color:var(--color-bad)]/10 transition-colors no-print"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {fixedMonthlyTotal > 0 && (
              <div className="mt-6 pt-4 border-t border-line flex justify-between items-center text-sm">
                <span className="font-bold text-ink">Total projetado todo mês:</span>
                <span className="text-xl font-bold text-[color:var(--color-bad)] tabular-nums">{brl(fixedMonthlyTotal)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Drill-down */}
      <DrillDownModal
        open={drill !== null}
        title={drillData.title}
        subtitle={drill === 'receivable' ? undefined : `${MONTHS[cursor.m]} ${cursor.y}`}
        rows={drillData.rows}
        onClose={() => setDrill(null)}
      />

      {/* Modal Novo Lançamento */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#100b0c]/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-2xl p-6 z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-heading tracking-tight">Novo lançamento</h3>
              <button onClick={() => setShowForm(false)} aria-label="Fechar" className="p-2 rounded-lg hover:bg-surface-2 text-gray-450"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-surface-2 rounded-xl p-1">
                <button type="button" onClick={() => setFormType('expense')} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${formType === 'expense' ? 'bg-[color:var(--color-bad)] text-white shadow-soft' : 'text-gray-450'}`}>Saída</button>
                <button type="button" onClick={() => setFormType('income')} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${formType === 'income' ? 'bg-[color:var(--color-ok)] text-white shadow-soft' : 'text-gray-450'}`}>Entrada</button>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-lg font-bold text-ink focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Categoria</label>
                <input list="fin-cats" placeholder="Selecione ou digite" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500" />
                <datalist id="fin-cats">{(formType === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-500/20" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Descrição</label>
                  <input placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)}
                    className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-500/20" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full py-3.5 bg-forest hover:bg-forest-hover text-white text-sm font-bold rounded-xl shadow-soft transition-colors disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <div className="flex items-center justify-between">
    <span className={`${muted ? 'text-gray-450' : 'text-ink'} font-medium`}>{label}</span>
    <span className={`font-bold tabular-nums ${muted ? 'text-gray-450' : 'text-ink'}`}>{value}</span>
  </div>
);

export default FinancePanel;
