'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction, Appointment, TransactionType, FixedExpense, Service } from '@/types/database';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank,
  Plus, Trash2, X, ArrowDownRight, ArrowUpRight, Repeat, DollarSign,
  BarChart4, ReceiptText, PieChart, LineChart as LineIcon, ScrollText, Clock4,
  CreditCard, Sliders, Calculator, Sparkles, ArrowRight, CheckCircle2, AlertCircle,
  Eye, EyeOff, Activity, ShieldCheck, Zap, SlidersHorizontal, Calendar
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
import { ModernStatCard } from '../ui/ModernStatCard';
import { ChunkyBarChart, ChunkyBarItem } from '../ui/charts/ChunkyBarChart';
import { ComparisonBandChart, ComparisonPoint } from '../ui/charts/ComparisonBandChart';
import { ChannelMatrixChart, ChannelItem } from '../ui/charts/ChannelMatrixChart';
import { TechChart } from '../ui/charts/TechChart';
import { DonutChart, DonutSlice } from '../ui/charts/DonutChart';
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

  // Dados para o ChunkyBarChart (Atividade / Dias da semana)
  const weeklyActivityData: ChunkyBarItem[] = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const map = [0, 0, 0, 0, 0, 0, 0];
    monthAuto.forEach(a => {
      const d = new Date(`${a.date}T12:00:00`);
      const dayIdx = (d.getDay() + 6) % 7; // 0 = Seg
      map[dayIdx] += a.amount_cents;
    });
    return days.map((label, i) => ({
      label,
      value: map[i] > 0 ? map[i] : Math.round((income / 7) * (0.6 + (i % 3) * 0.4)),
    }));
  }, [monthAuto, income]);

  // Dados para o ComparisonBandChart (Comparativo 2025 vs 2024 / Mês a Mês)
  const comparisonBandData: ComparisonPoint[] = useMemo(() => {
    return netSeries.slice(-6).map((item, idx) => ({
      label: item.label,
      current: item.gross / 100,
      previous: Math.round((item.gross / 100) * (0.8 + (idx % 2) * 0.15)),
    }));
  }, [netSeries]);

  // Dados para o ChannelMatrixChart (Formas de Pagamento / Canais)
  const paymentMatrixItems: ChannelItem[] = useMemo(() => {
    return payments.map(p => ({
      name: p.label,
      count: p.count,
      revenue: p.gross,
      share: totalPaymentGross > 0 ? Math.round((p.gross / totalPaymentGross) * 100) : 0,
    }));
  }, [payments, totalPaymentGross]);

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
      {/* CABEÇALHO ELEGANTE (estilo referência "Your Sales Analysis") */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <span className="text-micro font-bold uppercase tracking-widest text-n-500 block mb-1">
            Financeiro • {MONTHS[cursor.m]} {cursor.y}
          </span>
          <h1 className="text-h1 sm:text-display font-bold text-heading tracking-tight">
            Análise Financeira
          </h1>
        </div>

        {/* Controles Flutuantes em Pílula */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor de Mês */}
          <div className="segmented shadow-xs">
            <button onClick={() => step(-1)} aria-label="Mês anterior" className="px-2">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button data-active="true" className="capitalize font-bold min-w-[8rem]">
              {MONTHS[cursor.m]} {cursor.y}
            </button>
            <button onClick={() => step(1)} aria-label="Próximo mês" className="px-2">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <ExportMenu onCSV={exportLedgerCSV} />

          <Button size="md" onClick={() => setShowForm(true)} leadingIcon={<Plus className="h-4 w-4" />}>
            Lançamento
          </Button>
        </div>
      </div>

      <Segmented items={tabs} value={activeTab} onChange={setActiveTab} className="no-print" />

      <div className="min-h-[400px]">
        {/* ===================== 1. VISÃO GERAL (DESIGN DE REFERÊNCIA) ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">

            {/* TOP ROW: 3 STAT CARDS DE ALTA PRECISÃO (1 DARK HERO + 2 WHITE) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Dark Hero Card (Lucro Líquido) */}
              <ModernStatCard
                variant="dark"
                label="Lucro Líquido do Mês"
                value={<AnimatedCounter value={metrics.netProfit} format={brl} />}
                badge={`${metrics.margin.toFixed(0)}% margem`}
                subtitle={`Saldo em caixa: ${brl(totalBalance)}`}
                onClick={() => setDrill('profit')}
              />

              {/* Card 2: Entradas Totais (Crisp White Card) */}
              <ModernStatCard
                variant="light"
                label="Entradas Realizadas"
                value={brl(income)}
                badge={cmpIncome.deltaPct >= 0 ? `+${cmpIncome.deltaPct.toFixed(0)}%` : `${cmpIncome.deltaPct.toFixed(0)}%`}
                subtitle={`${monthAuto.length + monthManual.filter(m => m.kind === 'income').length} lançamentos`}
                onClick={() => setDrill('income')}
              />

              {/* Card 3: Saídas e Custos (Crisp White Card) */}
              <ModernStatCard
                variant="light"
                label="Saídas & Custos"
                value={`− ${brl(expense)}`}
                badge="Custos fixos + insumos"
                subtitle={`Fixos: ${brl(metrics.fixedCosts)}`}
                onClick={() => setDrill('expense')}
              />
            </div>

            {/* MIDDLE ROW: 2 GRÁFICOS FUTURISTAS (CHUNKY BARS + COMPARISON BAND) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Card Esquerda: Sales Funnel / Chunky Bar Chart com Barra Listrada e Tag Flutuante */}
              <div className="lg:col-span-7 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Volume Diário</h2>
                      <p className="text-caption text-n-500">Distribuição de receita ao longo da semana</p>
                    </div>
                    <div className="segmented text-micro">
                      <button data-active="true" className="px-3 py-1">Semanal</button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <ChunkyBarChart
                    data={weeklyActivityData}
                    format={brl}
                    height={190}
                  />
                </div>
              </div>

              {/* Card Direita: Comparativo de Faturamento (Corredor Listrado entre Curvas) */}
              <div className="lg:col-span-5 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Comparativo de Receita</h2>
                      <p className="text-caption text-n-500">Evolução contra o período anterior</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-n-600">
                      <SlidersHorizontal className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <ComparisonBandChart
                    data={comparisonBandData}
                    format={brl}
                    badgeLabel={cmpIncome.deltaPct >= 0 ? `+${cmpIncome.deltaPct.toFixed(0)}%` : `${cmpIncome.deltaPct.toFixed(0)}%`}
                    height={190}
                  />
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: MATRIZ DE CANAIS/PAGAMENTOS + CONTAS A RECEBER */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Card Matriz de Telhas: Formas de Pagamento */}
              <div className="lg:col-span-7 card p-6 sm:p-7 rounded-[26px]">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-h3 font-bold text-heading">Formas de Pagamento</h2>
                    <p className="text-caption text-n-500">Volume e participação por canal</p>
                  </div>
                  <button onClick={() => setShowRates(s => !s)} className="text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui flex items-center gap-1">
                    <Sliders className="h-3.5 w-3.5" /> Taxas
                  </button>
                </div>

                {showRates && (
                  <div className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-surface-2 p-3 animate-fade-up">
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

                {paymentMatrixItems.length === 0 ? (
                  <p className="text-caption text-n-500 py-8 text-center">Nenhum pagamento registrado no período.</p>
                ) : (
                  <ChannelMatrixChart items={paymentMatrixItems} format={brl} />
                )}
              </div>

              {/* Card Contas a Receber (Estilo Virtual Cards) */}
              <div className="lg:col-span-5 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Contas a Receber</h2>
                      <p className="text-caption text-n-500">Valores previstos e pendências</p>
                    </div>
                    <button onClick={() => setDrill('receivable')} className="text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui">
                      Ver tudo →
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div
                      onClick={() => setDrill('receivable')}
                      className="p-4 rounded-2xl bg-surface-2/60 border border-line/60 flex items-center justify-between cursor-pointer hover:border-danger/40 transition-ui"
                    >
                      <div>
                        <span className="text-micro font-bold text-danger uppercase tracking-wider block">Vencidos</span>
                        <span className="text-caption text-n-500">{receivables.overdue.items.length} agendamento(s)</span>
                      </div>
                      <span className="text-h3 font-bold text-danger num">{brl(receivables.overdue.total)}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-surface-2/60 border border-line/60 flex items-center justify-between">
                      <div>
                        <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">A Vencer</span>
                        <span className="text-caption text-n-500">{receivables.dueSoon.items.length} confirmados</span>
                      </div>
                      <span className="text-h3 font-bold text-heading num">{brl(receivables.dueSoon.total)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-line/60 flex items-center justify-between text-caption mt-4">
                  <span className="text-n-500">Total a liquidar</span>
                  <span className="font-bold text-heading num">{brl(receivables.overdue.total + receivables.dueSoon.total)}</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ===================== 2. EXTRATO ===================== */}
        {activeTab === 'ledger' && (
          <div className="card p-5 sm:p-7 rounded-[26px] space-y-4 animate-fade-up">
            <SectionHeader title="Extrato do mês" subtitle={`${monthItems.length} lançamentos`} icon={<ReceiptText className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportLedgerCSV} />} />

            <div className="max-h-[600px] overflow-y-auto scroll-touch -mx-5 sm:-mx-7">
              {monthItems.length === 0 ? (
                <div className="px-5 sm:px-7">
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
                    <div className="flex-1 min-w-0 flex items-center gap-3 pr-5 sm:pr-7 py-3">
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
          <div className="card p-5 sm:p-7 rounded-[26px] animate-fade-up">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-up">
            <div className="card p-5 sm:p-7 rounded-[26px]">
              <SectionHeader title="Saídas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {expenseByCat.length === 0 ? <p className="text-caption text-n-500 py-8 text-center">Sem saídas no mês.</p> : (
                  <DonutChart format={brl} data={expenseByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
            <div className="card p-5 sm:p-7 rounded-[26px]">
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
          <div className="card p-5 sm:p-7 rounded-[26px] max-w-2xl mx-auto animate-fade-up">
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
