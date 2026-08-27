'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction, Appointment, TransactionType, FixedExpense, Service } from '@/types/database';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank,
  Plus, Trash2, X, ArrowDownRight, ArrowUpRight, Repeat, DollarSign,
  BarChart4, ReceiptText, PieChart, LineChart as LineIcon, ScrollText, Clock4,
  CreditCard, Sliders, Calculator, Sparkles, ArrowRight, CheckCircle2, AlertCircle,
  Eye, EyeOff, Activity, ShieldCheck, Zap
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
import { PageHeader } from '../ui/PageHeader';
import { SectionHeader } from '../ui/SectionHeader';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { DrillDownModal, DrillDownRow } from '../ui/DrillDownModal';
import { TechChart } from '../ui/charts/TechChart';
import { DonutChart, DonutSlice } from '../ui/charts/DonutChart';
import { GaugeChart } from '../ui/charts/GaugeChart';
import { MiniSparkArea } from '../ui/charts/MiniSparkArea';
import { AnimatedCounter } from '../ui/AnimatedCounter';
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
const DONUT_COLORS = ['#6B1525', '#8C2438', '#A94257', '#C66E84', '#DEA0B0', '#F0CBD5', '#CFCBCC', '#E3E0E1'];
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

export const FinancePanel: React.FC<FinancePanelProps> = ({
  professionalId, transactions, appointments, fixedExpenses, services
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const now = new Date();
  const byId = useMemo(() => indexServices(services), [services]);
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const isCurrentMonth = cursor.y === now.getFullYear() && cursor.m === now.getMonth();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [drill, setDrill] = useState<DrillType>(null);
  const [showDreDetails, setShowDreDetails] = useState(false);

  // Taxas
  const [rates, setRates] = useState<PaymentRates>(() => {
    if (typeof window === 'undefined') return DEFAULT_PAYMENT_RATES;
    try { const s = localStorage.getItem(RATES_KEY); if (s) return { ...DEFAULT_PAYMENT_RATES, ...JSON.parse(s) }; } catch { /* */ }
    return DEFAULT_PAYMENT_RATES;
  });
  const [showRates, setShowRates] = useState(false);
  const updateRate = (method: string, value: number) => {
    setRates(prev => {
      const next = { ...prev, [method]: value };
      try { localStorage.setItem(RATES_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  // Formulário lançamento
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Contas fixas
  const [fxName, setFxName] = useState('');
  const [fxAmount, setFxAmount] = useState('');
  const [fxSaving, setFxSaving] = useState(false);

  const inMonth = (iso: string, y: number, m: number) => {
    const [yy, mm] = iso.split('-').map(Number);
    return yy === y && mm === m + 1;
  };
  const monthFirst = `${cursor.y}-${pad(cursor.m + 1)}-01`;

  const fixedForMonth = useCallback((y: number, m: number) =>
    fixedExpenses.filter(f => f.active).filter(f => {
      const c = new Date(f.created_at);
      return idxOf(y, m) >= idxOf(c.getFullYear(), c.getMonth());
    }), [fixedExpenses]);

  // Itens do mês
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

  // Métricas
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

  // Saldo acumulado
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

  // Projeção & Pagamentos
  const projection = useMemo(() => projectionForMonth(appointments, byId), [appointments, byId]);
  const receivables = useMemo(() => receivablesAging(appointments, byId), [appointments, byId]);
  const payments = useMemo(() => byPaymentMethod(appointments, byId, rates, range), [appointments, byId, rates, range]);
  const totalPaymentGross = useMemo(() => payments.reduce((acc, p) => acc + p.gross, 0), [payments]);
  const netSeries = useMemo(() => monthlySeries(appointments, transactions, fixedExpenses, services, 12), [appointments, transactions, fixedExpenses, services]);

  // Sparklines simulados para os cards de métricas
  const incomeSpark = useMemo(() => netSeries.slice(-6).map(p => p.gross / 100), [netSeries]);
  const profitSpark = useMemo(() => netSeries.slice(-6).map(p => Math.max(0, p.net) / 100), [netSeries]);
  const expenseSpark = useMemo(() => netSeries.slice(-6).map(p => Math.max(0, (p.gross - p.net)) / 100), [netSeries]);

  const projDonePct = projection.projected > 0 ? Math.min(100, Math.round((projection.realized / projection.projected) * 100)) : 0;
  const marginPct = Math.max(0, Math.min(100, Math.round(metrics.margin)));

  // Categorias
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

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Navegação com Seletor de Mês */}
      <PageHeader
        className="no-print"
        trail={['Financeiro', `${monthItems.length} lançamentos`, `margem ${metrics.margin.toFixed(0)}%`]}
        title="Financeiro"
        actions={
          <>
            <div className="segmented">
              <button onClick={() => step(-1)} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button data-active="true" className="capitalize min-w-[9rem]">
                {MONTHS[cursor.m]} {cursor.y}
              </button>
              <button onClick={() => step(1)} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <ExportMenu onCSV={exportLedgerCSV} />
            <Button size="md" onClick={() => setShowForm(true)} leadingIcon={<Plus className="h-[18px] w-[18px]" />}>
              Lançamento
            </Button>
          </>
        }
      />

      <Segmented items={tabs} value={activeTab} onChange={setActiveTab} className="no-print" />

      <div className="min-h-[400px]">
        {/* ===================== 1. VISÃO GERAL COCKPIT FUTURISTA ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">

            {/* HERO TELEMETRY: Cockpit Financeiro com Gauge de Margem */}
            <div className="card p-6 sm:p-8 bg-surface rounded-hero shadow-sm border border-line/60 relative overflow-hidden">
              {/* Brilho sutil de fundo */}
              <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-wine-50/50 pointer-events-none blur-3xl" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
                
                {/* Lado Esquerdo: Foco no Lucro Líquido & Saldo */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-micro font-bold uppercase tracking-widest text-n-500 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-wine-700" />
                      Resultado Líquido Operacional
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-micro font-bold ${
                      cmpProfit.deltaPct >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                    }`}>
                      {cmpProfit.deltaPct >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {cmpProfit.deltaPct >= 0 ? `+${cmpProfit.deltaPct.toFixed(0)}%` : `${cmpProfit.deltaPct.toFixed(0)}%`} vs anterior
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-4">
                    <p className={`text-display font-bold num tracking-tight leading-none ${
                      metrics.netProfit >= 0 ? 'text-heading' : 'text-danger'
                    }`}>
                      <AnimatedCounter value={metrics.netProfit} format={brl} />
                    </p>
                    <span className="text-caption font-semibold text-n-500">
                      Saldo em caixa hoje: <strong className="num text-heading">{brl(totalBalance)}</strong>
                    </span>
                  </div>

                  <p className="text-body-sm text-n-600 max-w-xl">
                    {metrics.netProfit >= 0
                      ? 'Desempenho excelente. Sua receita líquida está superando todos os custos fixos e operacionais.'
                      : 'Atenção: as saídas superaram as entradas no período selecionado.'}
                  </p>
                </div>

                {/* Lado Direito: Gauge Circular Futurista de Margem Operacional */}
                <div className="lg:col-span-4 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-l border-line/80 pt-4 lg:pt-0 lg:pl-6">
                  <GaugeChart
                    value={marginPct}
                    label="Margem Líquida"
                    sublabel={marginPct >= 50 ? 'Alta Rentabilidade' : 'Margem Moderada'}
                    size={170}
                    strokeWidth={13}
                  />
                </div>
              </div>
            </div>

            {/* CARDS DE ONDA TELEMÉTRICOS (Entradas, Saídas, Saldo) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Entradas */}
              <div
                onClick={() => setDrill('income')}
                className="card p-5 cursor-pointer hover:border-wine-300 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-micro font-bold uppercase tracking-wider text-n-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success inline-block shadow-sm" />
                      Entradas Totais
                    </span>
                    <span className="text-micro font-bold text-wine-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Ver tudo <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-h2 font-bold num text-heading mt-2">
                    {brl(income)}
                  </p>
                  <span className="text-micro text-n-400 block mt-0.5">
                    {monthAuto.length + monthManual.filter(m => m.kind === 'income').length} lançamentos no mês
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-end justify-between">
                  <span className="text-caption font-semibold text-success flex items-center gap-1">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    {cmpIncome.deltaPct >= 0 ? `+${cmpIncome.deltaPct.toFixed(0)}%` : `${cmpIncome.deltaPct.toFixed(0)}%`}
                  </span>
                  <MiniSparkArea data={incomeSpark} tone="emerald" width={100} height={32} />
                </div>
              </div>

              {/* Card 2: Saídas */}
              <div
                onClick={() => setDrill('expense')}
                className="card p-5 cursor-pointer hover:border-danger/40 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-micro font-bold uppercase tracking-wider text-n-500 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-danger inline-block shadow-sm" />
                      Saídas & Despesas
                    </span>
                    <span className="text-micro font-bold text-danger opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Ver tudo <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-h2 font-bold num text-danger mt-2">
                    − {brl(expense)}
                  </p>
                  <span className="text-micro text-n-400 block mt-0.5">
                    Fixos ({brl(metrics.fixedCosts)}) + Insumos
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-end justify-between">
                  <span className="text-caption font-semibold text-n-600">
                    {metrics.fixedCosts > 0 ? `${Math.round((metrics.fixedCosts / (expense || 1)) * 100)}% fixo` : 'Variável'}
                  </span>
                  <MiniSparkArea data={expenseSpark} tone="rose" width={100} height={32} />
                </div>
              </div>

              {/* Card 3: Lucro com Onda */}
              <div
                onClick={() => setDrill('profit')}
                className="card p-5 cursor-pointer hover:border-wine-500 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-micro font-bold uppercase tracking-wider text-wine-700 flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" />
                      Eficiência Líquida
                    </span>
                    <span className="text-micro font-bold text-wine-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      Detalhes <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                  <p className="text-h2 font-bold num text-heading mt-2">
                    {metrics.margin.toFixed(1)}%
                  </p>
                  <span className="text-micro text-n-400 block mt-0.5">
                    Margem líquida de retenção
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-line/60 flex items-end justify-between">
                  <span className="text-caption font-bold text-wine-700">
                    {brl(metrics.netProfit)}
                  </span>
                  <MiniSparkArea data={profitSpark} tone="wine" width={100} height={32} />
                </div>
              </div>
            </div>

            {/* GRADE SECUNDÁRIA: Projeção com Gauge & DRE Visual */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* PROJEÇÃO INTELIGENTE COM GAUGE RADIAL */}
              <div className="card p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <SectionHeader title="Meta & Projeção" subtitle={isCurrentMonth ? 'Estimativa de faturamento' : 'Histórico do mês'} icon={<TrendingUp className="h-4 w-4" />} />

                  {isCurrentMonth ? (
                    <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
                      {/* Gauge de Progresso da Meta */}
                      <GaugeChart
                        value={projDonePct}
                        centerValue={brl(projection.projected)}
                        label="meta"
                        size={170}
                        strokeWidth={12}
                      />

                      {/* Dados de decomposição da meta */}
                      <div className="flex-1 w-full space-y-2.5">
                        <div className="p-3 rounded-2xl bg-surface-2/70 flex justify-between items-center">
                          <span className="text-caption font-semibold text-n-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-wine-700" /> Já Realizado
                          </span>
                          <span className="text-label font-bold text-heading num">{brl(projection.realized)}</span>
                        </div>

                        <div className="p-3 rounded-2xl bg-surface-2/70 flex justify-between items-center">
                          <span className="text-caption font-semibold text-n-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-wine-400" /> Confirmados a Vir
                          </span>
                          <span className="text-label font-bold text-heading num">{brl(projection.confirmedAhead)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-caption text-n-500 max-w-xs mx-auto">
                        Projeção disponível para o mês corrente ({MONTHS[now.getMonth()]}).
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-line flex items-center justify-between text-caption mt-4">
                  <span className="text-n-500">vs. mesmo período em {cursor.y - 1}</span>
                  <span className="font-bold text-ink num">{brl(lyMetrics.grossRevenue + lyMetrics.manualIncome)}</span>
                </div>
              </div>

              {/* DRE VISUAL FLUIDO */}
              <div className="card p-5 sm:p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Estrutura de Resultados (DRE)" subtitle={`${MONTHS[cursor.m]} ${cursor.y}`} icon={<Calculator className="h-4 w-4" />} />
                    <button
                      onClick={() => setShowDreDetails(!showDreDetails)}
                      className="text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui inline-flex items-center gap-1"
                    >
                      {showDreDetails ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {showDreDetails ? 'Resumido' : 'Detalhado'}
                    </button>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="p-3 rounded-2xl bg-surface-2 flex items-center justify-between">
                      <span className="text-caption font-bold text-heading">1. Receita Bruta</span>
                      <span className="text-h3 font-bold text-heading num">{brl(income)}</span>
                    </div>

                    <div className="p-3 rounded-2xl bg-danger-bg/40 flex items-center justify-between">
                      <span className="text-caption font-semibold text-danger">2. Custos Totais</span>
                      <span className="text-label font-bold text-danger num">− {brl(expense)}</span>
                    </div>

                    {showDreDetails && (
                      <div className="px-3 py-2 space-y-1.5 border-l-2 border-line ml-3 text-caption animate-fade-up">
                        <div className="flex justify-between text-n-600">
                          <span>Insumos & Produtos:</span>
                          <span className="num font-semibold">− {brl(metrics.variableCosts)}</span>
                        </div>
                        <div className="flex justify-between text-n-600">
                          <span>Custos Fixos Mensais:</span>
                          <span className="num font-semibold">− {brl(metrics.fixedCosts)}</span>
                        </div>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl border border-line bg-surface flex items-center justify-between shadow-xs">
                      <div>
                        <span className="text-micro font-bold text-n-400 uppercase tracking-wider block">Resultado Final</span>
                        <span className="text-body font-bold text-heading">Lucro Líquido</span>
                      </div>
                      <div className="text-right">
                        <span className={`text-h2 font-bold num ${metrics.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                          {brl(metrics.netProfit)}
                        </span>
                        <span className="block text-micro font-semibold text-n-500">
                          {metrics.margin.toFixed(1)}% de margem
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {metrics.lostRevenue > 0 && (
                  <p className="mt-4 pt-3 border-t border-line text-caption text-n-500 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 text-danger shrink-0" />
                    Cancelamentos/faltas no mês: <strong className="text-danger">{brl(metrics.lostRevenue)}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* CONTAS A RECEBER + FORMAS DE PAGAMENTO */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

              {/* CONTAS A RECEBER */}
              <div className="card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <SectionHeader title="Contas a Receber" subtitle="Valores previstos e pendências" icon={<ScrollText className="h-4 w-4" />} />
                  <button onClick={() => setDrill('receivable')} className="text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui">
                    Ver todos →
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                  <div
                    onClick={() => setDrill('receivable')}
                    className="p-4 rounded-2xl border border-line bg-surface hover:bg-danger-bg/20 cursor-pointer transition-ui"
                  >
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-danger-bg text-danger text-micro font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-danger inline-block" /> Vencidos
                    </span>
                    <p className="text-h2 font-bold text-danger mt-2 num">{brl(receivables.overdue.total)}</p>
                    <span className="text-micro text-n-500 mt-1 block">
                      {receivables.overdue.items.length} agendamento(s)
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-line bg-surface-2/60">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-n-100 text-n-600 text-micro font-bold">
                      <Clock4 className="h-3 w-3" /> A Vencer
                    </span>
                    <p className="text-h2 font-bold text-heading mt-2 num">{brl(receivables.dueSoon.total)}</p>
                    <span className="text-micro text-n-500 mt-1 block">
                      {receivables.dueSoon.items.length} confirmados
                    </span>
                  </div>
                </div>
              </div>

              {/* FORMAS DE PAGAMENTO COM BARRAS DE ENERGIA */}
              <div className="card p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <SectionHeader title="Formas de Pagamento" subtitle="Participação no faturamento" icon={<CreditCard className="h-4 w-4" />} />
                  <button onClick={() => setShowRates(s => !s)} className="inline-flex items-center gap-1 text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui">
                    <Sliders className="h-3.5 w-3.5" /> Taxas
                  </button>
                </div>

                {showRates && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-3 animate-fade-up">
                    {['pix', 'debito', 'credito', 'dinheiro'].map(m => (
                      <label key={m} className="flex items-center justify-between gap-2 text-caption">
                        <span className="text-n-600 font-semibold">{paymentLabel(m)}</span>
                        <span className="flex items-center gap-1">
                          <input
                            type="number" min={0} step={0.1}
                            value={rates[m] ?? 0}
                            onChange={e => updateRate(m, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 text-right border border-line rounded-lg bg-surface text-ink font-semibold"
                          />
                          <span className="text-n-600">%</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}

                {payments.length === 0 ? (
                  <p className="text-caption text-n-500 py-8 text-center">Nenhum pagamento registrado no período.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {payments.map(p => {
                      const share = totalPaymentGross > 0 ? Math.round((p.gross / totalPaymentGross) * 100) : 0;
                      return (
                        <div key={p.method} className="space-y-1">
                          <div className="flex items-center justify-between text-caption">
                            <span className="font-semibold text-heading flex items-center gap-2">
                              {p.label}
                              <span className="text-micro text-n-400 font-normal">({p.count} vendas)</span>
                            </span>
                            <span className="font-bold text-heading num">
                              {brl(p.net)}
                              <span className="text-n-400 font-normal text-micro ml-1.5">({share}%)</span>
                            </span>
                          </div>
                          <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-wine-700 to-wine-500 transition-all duration-500"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* GRÁFICO DE EVOLUÇÃO TEMPORAL (TechChart Holográfico) */}
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Telemetria & Evolução Anual" subtitle="Faturamento vs Lucro Líquido nos últimos 12 meses" icon={<LineIcon className="h-4 w-4" />} />
              <div className="flex items-center gap-4 mt-3">
                <span className="inline-flex items-center gap-1.5 text-caption">
                  <span className="w-3.5 h-1 rounded-full bg-wine-700" />
                  <span className="font-bold text-heading">Lucro Líquido</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-caption">
                  <span className="w-3.5 border-t border-dashed border-n-400" />
                  <span className="font-semibold text-n-500">Faturamento</span>
                </span>
              </div>
              <div className="mt-4">
                <TechChart
                  labels={netSeries.map(p => p.label)}
                  height={220}
                  format={(v) => brl(Math.round(v * 100))}
                  axisFormat={(v: number) => {
                    const r = Math.round(v);
                    return Math.abs(r) >= 1000 ? `${(r / 1000).toFixed(1).replace('.', ',')}k` : String(r);
                  }}
                  series={[
                    { name: 'Faturamento', style: 'dashed', color: 'var(--color-n-400)', values: netSeries.map(p => p.gross / 100) },
                    { name: 'Lucro líquido', color: 'var(--color-wine-700)', values: netSeries.map(p => p.net / 100) },
                  ]}
                />
              </div>
            </div>

          </div>
        )}

        {/* ===================== 2. EXTRATO ===================== */}
        {activeTab === 'ledger' && (
          <div className="card p-5 sm:p-6 space-y-4 animate-fade-up">
            <SectionHeader title="Extrato do mês" subtitle={`${monthItems.length} lançamentos`} icon={<ReceiptText className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportLedgerCSV} />} />

            <div className="max-h-[600px] overflow-y-auto scroll-touch -mx-5 sm:-mx-6">
              {monthItems.length === 0 ? (
                <div className="px-5 sm:px-6">
                  <EmptyState
                    title="Nenhum lançamento neste mês"
                    description="Entradas e saídas que você registrar aparecem aqui, junto com o que a agenda gera sozinha."
                    actionText="Adicionar o primeiro"
                    onAction={() => setShowForm(true)}
                  />
                </div>
              ) : monthItems.map((i) => {
                const inc = i.kind === 'income';
                const isFixed = i.id.startsWith('fixed-');
                return (
                  <div key={i.id} className="flex items-stretch gap-3 border-b border-line last:border-b-0 hover:bg-n-25 transition-ui group">
                    <span className={`w-[3px] shrink-0 ${inc ? 'bg-success' : 'bg-danger'}`} aria-hidden />
                    <div className="flex-1 min-w-0 flex items-center gap-3 pr-5 sm:pr-6 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-semibold text-heading truncate">{i.category}</p>
                        <p className="text-caption text-n-500 truncate">
                          {formatDateBR(i.date)}{i.description ? ` · ${i.description}` : ''}
                        </p>
                      </div>
                      <span className={`text-body-sm font-bold shrink-0 num ${inc ? 'text-success' : 'text-danger'}`}>
                        {inc ? '+' : '−'}{brl(i.amount_cents)}
                      </span>
                      <span className="shrink-0 w-12 text-right no-print">
                        {i.auto ? (
                          <span className="text-micro font-bold text-n-400">{isFixed ? 'FIXA' : 'AUTO'}</span>
                        ) : (
                          <Button
                            variant="ghost" size="sm" iconOnly
                            aria-label={`Excluir lançamento ${i.category}`}
                            onClick={() => remove(i.id)}
                            disabled={deletingId === i.id}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-ui"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================== 3. FLUXO & LUCRO ===================== */}
        {activeTab === 'cashflow' && (
          <div className="card p-5 sm:p-6 animate-fade-up">
            <SectionHeader title="Fluxo de caixa e lucro" subtitle="Faturamento x lucro líquido · últimos 12 meses" icon={<LineIcon className="h-4 w-4" />} />
            <div className="flex items-center gap-4 mt-3">
              <span className="inline-flex items-center gap-1.5 text-caption">
                <span className="w-3.5 h-1 rounded-full bg-wine-700" />
                <span className="font-bold text-heading">Lucro Líquido</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-caption">
                <span className="w-3.5 border-t border-dashed border-n-400" />
                <span className="font-semibold text-n-500">Faturamento</span>
              </span>
            </div>
            <div className="mt-5">
              <TechChart
                height={260}
                labels={netSeries.map(p => p.label)}
                format={(v: number) => brl(Math.round(v * 100))}
                axisFormat={(v: number) => {
                  const r = Math.round(v);
                  return Math.abs(r) >= 1000 ? `${(r / 1000).toFixed(1).replace('.', ',')}k` : String(r);
                }}
                series={[
                  { name: 'Faturamento', style: 'dashed', color: 'var(--color-n-400)', values: netSeries.map(p => p.gross / 100) },
                  { name: 'Lucro líquido', color: 'var(--color-wine-700)', values: netSeries.map(p => p.net / 100) },
                ]}
              />
            </div>
          </div>
        )}

        {/* ===================== 4. CATEGORIAS ===================== */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Saídas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {expenseByCat.length === 0 ? <p className="text-caption text-n-500 py-8 text-center">Sem saídas no mês.</p> : (
                  <DonutChart format={brl} data={expenseByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Entradas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {incomeByCat.length === 0 ? <p className="text-caption text-n-500 py-8 text-center">Sem entradas no mês.</p> : (
                  <DonutChart format={brl} data={incomeByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== 5. CONTAS FIXAS ===================== */}
        {activeTab === 'fixed' && (
          <div className="card p-5 sm:p-6 max-w-2xl mx-auto animate-fade-up">
            <SectionHeader title="Contas fixas mensais" subtitle="Lançadas como saída todo mês automaticamente" icon={<Repeat className="h-4 w-4" />} />
            <form onSubmit={addFixed} className="flex flex-col sm:flex-row gap-2 my-5 no-print">
              <input placeholder="Ex: Aluguel do espaço" value={fxName} onChange={(e) => setFxName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-2.5 bg-surface-2 border border-line rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
              <input inputMode="decimal" placeholder="R$ 0,00" value={fxAmount} onChange={(e) => setFxAmount(e.target.value)}
                className="w-full sm:w-32 px-3 py-2.5 bg-surface-2 border border-line rounded-xl text-label font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
              <Button type="submit" loading={fxSaving} className="shrink-0">Adicionar</Button>
            </form>
            <div className="space-y-2">
              {fixedExpenses.filter(f => f.active).length === 0 ? (
                <EmptyState
                  icon={<Repeat className="h-6 w-6" />}
                  title="Nenhuma conta fixa"
                  description="Aluguel, energia, internet — cadastre uma vez e o lançamento se repete sozinho todo mês."
                />
              ) : fixedExpenses.filter(f => f.active).map(f => (
                <div key={f.id} className="flex items-center justify-between rounded-2xl border border-line p-4 hover:bg-surface-2 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="icon-chip !text-danger"><Repeat className="h-4 w-4" /></span>
                    <div>
                      <p className="text-label font-semibold text-ink truncate">{f.name}</p>
                      <p className="text-caption text-n-600">Desde {formatDateBR(f.created_at.split('T')[0])}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-danger font-semibold num">{brl(f.amount_cents)} / mês</span>
                    <button onClick={() => removeFixed(f.id)} className="p-1.5 rounded-lg text-n-600 hover:text-danger hover:bg-n-100 transition-colors no-print"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            {fixedMonthlyTotal > 0 && (
              <div className="mt-6 pt-4 border-t border-line flex justify-between items-center text-label">
                <span className="font-semibold text-ink">Total projetado todo mês:</span>
                <span className="text-h2 font-semibold text-danger num">{brl(fixedMonthlyTotal)}</span>
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Novo lançamento">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setShowForm(false)} />
          <div className="sheet-panel relative w-full sm:max-w-md sm:mx-4 sm:rounded-hero p-6 z-10 safe-sheet sm:pb-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-h2 text-heading">Novo lançamento</h3>
              <Button variant="ghost" size="sm" iconOnly aria-label="Fechar" onClick={() => setShowForm(false)} leadingIcon={<X className="h-5 w-5" />} />
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 bg-n-100 rounded-control p-1" role="radiogroup" aria-label="Tipo de lançamento">
                <button type="button" role="radio" aria-checked={formType === 'expense'} onClick={() => setFormType('expense')}
                  className={`h-10 rounded-chip text-label font-semibold transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 ${formType === 'expense' ? 'bg-danger text-white' : 'text-n-600 hover:text-heading'}`}>Saída</button>
                <button type="button" role="radio" aria-checked={formType === 'income'} onClick={() => setFormType('income')}
                  className={`h-10 rounded-chip text-label font-semibold transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 ${formType === 'income' ? 'bg-success text-white' : 'text-n-600 hover:text-heading'}`}>Entrada</button>
              </div>
              <div>
                <label className="block text-micro font-bold text-n-500 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-control text-h2 font-semibold num text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
              </div>
              <div>
                <label className="block text-micro font-bold text-n-500 uppercase tracking-wider mb-1.5">Categoria</label>
                <input list="fin-cats" placeholder="Selecione ou digite" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
                <datalist id="fin-cats">{(formType === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-micro font-bold text-n-500 uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
                </div>
                <div>
                  <label className="block text-micro font-bold text-n-500 uppercase tracking-wider mb-1.5">Descrição</label>
                  <input placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)}
                    className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
                </div>
              </div>
              <Button type="submit" size="lg" loading={saving} className="w-full">Salvar lançamento</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancePanel;
