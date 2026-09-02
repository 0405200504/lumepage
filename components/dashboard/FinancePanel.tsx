'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction, Appointment, TransactionType, FixedExpense, Service } from '@/types/database';
import {
  ChevronLeft, ChevronRight, ArrowDownLeft, ArrowUpRight, Plus, Trash2, X,
  Receipt, Wallet, TrendingUp, Calendar, Search, SlidersHorizontal,
  CreditCard, PieChart, Repeat, AlertCircle, Clock4, CheckCircle2, ChevronRight as ChevronRightIcon
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
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { DrillDownModal, DrillDownRow } from '../ui/DrillDownModal';
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

type TabType = 'overview' | 'ledger' | 'receivables' | 'categories' | 'fixed';
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
  const [searchLedger, setSearchLedger] = useState('');

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
  const netSeries = useMemo(() => monthlySeries(appointments, transactions, fixedExpenses, services, 6), [appointments, transactions, fixedExpenses, services]);

  // Categorias
  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.filter(i => i.kind === 'expense').forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount_cents; });
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
    { key: 'overview' as const, label: 'Visão geral' },
    { key: 'ledger' as const, label: 'Extrato' },
    { key: 'receivables' as const, label: 'A receber' },
    { key: 'categories' as const, label: 'Categorias' },
    { key: 'fixed' as const, label: 'Contas fixas' },
  ];

  const filteredLedgerItems = useMemo(() => {
    if (!searchLedger.trim()) return monthItems;
    const q = searchLedger.toLowerCase();
    return monthItems.filter(i => i.category.toLowerCase().includes(q) || (i.description && i.description.toLowerCase().includes(q)));
  }, [monthItems, searchLedger]);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* 1. SELETOR DE MÊS / CABEÇALHO BANCÁRIO */}
      <div className="flex items-center justify-between no-print pt-1">
        <div className="flex items-center gap-1.5 bg-surface px-3 py-1.5 rounded-full border border-line shadow-xs">
          <button onClick={() => step(-1)} aria-label="Mês anterior" className="p-1 text-n-600 hover:text-ink">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-body-sm font-bold text-heading capitalize px-2">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          <button onClick={() => step(1)} aria-label="Próximo mês" className="p-1 text-n-600 hover:text-ink">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            data-tour="module-action"
            onClick={() => setShowForm(true)}
            className="rounded-full bg-wine-700 hover:bg-wine-800 text-white font-bold"
            leadingIcon={<Plus className="h-4 w-4" />}
          >
            Novo lançamento
          </Button>
        </div>
      </div>

      {/* 2. ABAS NAVEGAÇÃO LIMPA */}
      <div className="no-print">
        <Segmented items={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ===================== TAB 1: VISÃO GERAL (INTERFACE BANCO MODERNO) ===================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-up">
          
          {/* HERO BANCO: Saldo & Lucro com Clareza Absoluta */}
          <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-line shadow-xs space-y-5">
            <div>
              <span className="text-caption font-semibold text-n-500 block">
                Lucro líquido do mês
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <p className={`text-display font-bold num tracking-tight leading-none ${metrics.netProfit >= 0 ? 'text-heading' : 'text-danger'}`}>
                  <AnimatedCounter value={metrics.netProfit} format={brl} />
                </p>
                <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${cmpProfit.deltaPct >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                  {cmpProfit.deltaPct >= 0 ? `+${cmpProfit.deltaPct.toFixed(0)}%` : `${cmpProfit.deltaPct.toFixed(0)}%`}
                </span>
              </div>
              <span className="text-caption text-n-500 block mt-1.5">
                Saldo total em caixa: <strong className="text-heading num font-bold">{brl(totalBalance)}</strong>
              </span>
            </div>

            {/* ENTRADAS vs SAÍDAS: 2 Blocos Limpos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-line">
              
              {/* Bloco Entradas */}
              <div
                onClick={() => setDrill('income')}
                className="p-4 rounded-xl bg-surface-2/60 hover:bg-success-bg/30 border border-line/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success-bg text-success flex items-center justify-center shrink-0">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Entradas</span>
                    <span className="text-body font-bold text-heading num">{brl(income)}</span>
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-n-400" />
              </div>

              {/* Bloco Saídas */}
              <div
                onClick={() => setDrill('expense')}
                className="p-4 rounded-xl bg-surface-2/60 hover:bg-danger-bg/30 border border-line/60 transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-danger-bg text-danger flex items-center justify-center shrink-0">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Saídas</span>
                    <span className="text-body font-bold text-danger num">− {brl(expense)}</span>
                  </div>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-n-400" />
              </div>
            </div>
          </div>

          {/* GRÁFICO DE EVOLUÇÃO LIMPO (SEM RUÍDO) */}
          <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-bold text-heading">Evolução do faturamento</h3>
                <p className="text-caption text-n-500">Últimos 6 meses</p>
              </div>
              <span className="text-caption font-bold text-wine-700 bg-wine-50 px-2.5 py-1 rounded-full">
                Margem {metrics.margin.toFixed(0)}%
              </span>
            </div>
            <TechChart
              height={180}
              labels={netSeries.map(p => p.label)}
              format={(v) => brl(Math.round(v * 100))}
              axisFormat={(v) => {
                const r = Math.round(v);
                return Math.abs(r) >= 1000 ? `${(r / 1000).toFixed(1).replace('.', ',')}k` : String(r);
              }}
              series={[
                { name: 'Faturamento', color: 'var(--color-wine-700)', values: netSeries.map(p => p.gross / 100) },
              ]}
            />
          </div>

          {/* ÚLTIMAS MOVIMENTAÇÕES (FEED BANCÁRIO) */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-body font-bold text-heading">Últimas movimentações</h3>
              <button
                onClick={() => setActiveTab('ledger')}
                className="text-caption font-bold text-wine-700 hover:text-wine-800"
              >
                Ver extrato completo →
              </button>
            </div>

            <div className="divide-y divide-line">
              {monthItems.length === 0 ? (
                <p className="text-caption text-n-500 py-8 text-center">Nenhuma movimentação registrada no mês.</p>
              ) : (
                monthItems.slice(0, 5).map((item) => {
                  const isInc = item.kind === 'income';
                  return (
                    <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-n-25 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isInc ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                          {isInc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-body-sm font-bold text-heading truncate">{item.category}</p>
                          <p className="text-caption text-n-500 truncate">
                            {formatDateBR(item.date)}{item.description ? ` · ${item.description}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-body-sm font-bold num shrink-0 ${isInc ? 'text-success' : 'text-heading'}`}>
                        {isInc ? '+' : '−'} {brl(item.amount_cents)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {/* ===================== TAB 2: EXTRATO COMPLETO ===================== */}
      {activeTab === 'ledger' && (
        <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden animate-fade-up">
          <div className="p-4 sm:p-5 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n-500" />
              <input
                value={searchLedger}
                onChange={(e) => setSearchLedger(e.target.value)}
                placeholder="Buscar no extrato..."
                className="w-full pl-9 pr-3 py-2 bg-surface-2 rounded-xl text-body-sm text-heading border border-line focus-visible:outline-2 focus-visible:outline-wine-700"
              />
            </div>
            <ExportMenu onCSV={exportLedgerCSV} />
          </div>

          <div className="divide-y divide-line max-h-[600px] overflow-y-auto">
            {filteredLedgerItems.length === 0 ? (
              <p className="text-caption text-n-500 py-12 text-center">Nenhum lançamento encontrado.</p>
            ) : (
              filteredLedgerItems.map((item) => {
                const isInc = item.kind === 'income';
                return (
                  <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:bg-n-25 transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isInc ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                        {isInc ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-bold text-heading truncate">{item.category}</p>
                        <p className="text-caption text-n-500 truncate">
                          {formatDateBR(item.date)}{item.description ? ` · ${item.description}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-body-sm font-bold num ${isInc ? 'text-success' : 'text-heading'}`}>
                        {isInc ? '+' : '−'} {brl(item.amount_cents)}
                      </span>
                      {!item.auto && (
                        <button
                          onClick={() => remove(item.id)}
                          disabled={deletingId === item.id}
                          className="p-1 text-n-400 hover:text-danger opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: CONTAS A RECEBER ===================== */}
      {activeTab === 'receivables' && (
        <div className="space-y-4 animate-fade-up">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-surface rounded-2xl p-5 border border-line shadow-xs">
              <span className="text-micro font-bold text-danger uppercase tracking-wider block">Vencidos</span>
              <p className="text-h1 font-bold text-danger num mt-1">{brl(receivables.overdue.total)}</p>
              <span className="text-caption text-n-500 block mt-1">
                {receivables.overdue.items.length} agendamento(s) com data passada
              </span>
            </div>

            <div className="bg-surface rounded-2xl p-5 border border-line shadow-xs">
              <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">A Vencer</span>
              <p className="text-h1 font-bold text-heading num mt-1">{brl(receivables.dueSoon.total)}</p>
              <span className="text-caption text-n-500 block mt-1">
                {receivables.dueSoon.items.length} agendamentos confirmados
              </span>
            </div>
          </div>

          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
            <div className="p-4 border-b border-line">
              <h3 className="text-body font-bold text-heading">Detalhamento a receber</h3>
            </div>
            <div className="divide-y divide-line">
              {[...receivables.overdue.items, ...receivables.dueSoon.items].length === 0 ? (
                <p className="text-caption text-n-500 py-8 text-center">Nenhum valor pendente a receber.</p>
              ) : (
                [...receivables.overdue.items, ...receivables.dueSoon.items].map((r) => (
                  <div key={r.appointment.id} className="p-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-body-sm font-bold text-heading">{r.appointment.client_name}</p>
                      <p className="text-caption text-n-500">
                        {r.appointment.service?.name ?? 'Serviço'} · {formatDateBR(r.appointment.date)}
                        {r.daysOverdue > 0 && <span className="text-danger font-bold"> · {r.daysOverdue}d vencido</span>}
                      </p>
                    </div>
                    <span className="text-body font-bold text-heading num">{brl(r.amount)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB 4: CATEGORIAS ===================== */}
      {activeTab === 'categories' && (
        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs space-y-4 animate-fade-up">
          <h3 className="text-body font-bold text-heading">Gastos por categoria</h3>
          {expenseByCat.length === 0 ? (
            <p className="text-caption text-n-500 py-8 text-center">Sem saídas registradas neste mês.</p>
          ) : (
            <DonutChart format={brl} data={expenseByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
          )}
        </div>
      )}

      {/* ===================== TAB 5: CONTAS FIXAS ===================== */}
      {activeTab === 'fixed' && (
        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs space-y-5 animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-body font-bold text-heading">Contas fixas mensais</h3>
              <p className="text-caption text-n-500">Lançadas automaticamente todo mês</p>
            </div>
            {fixedMonthlyTotal > 0 && (
              <span className="text-body font-bold text-danger num">{brl(fixedMonthlyTotal)}/mês</span>
            )}
          </div>

          <form onSubmit={addFixed} className="flex flex-col sm:flex-row gap-2">
            <input
              placeholder="Ex: Aluguel, Internet..."
              value={fxName}
              onChange={(e) => setFxName(e.target.value)}
              className="flex-1 px-3 py-2 bg-surface-2 border border-line rounded-xl text-body-sm text-heading"
            />
            <input
              inputMode="decimal"
              placeholder="R$ 0,00"
              value={fxAmount}
              onChange={(e) => setFxAmount(e.target.value)}
              className="w-full sm:w-32 px-3 py-2 bg-surface-2 border border-line rounded-xl text-body-sm font-bold text-heading"
            />
            <Button type="submit" loading={fxSaving} className="rounded-xl bg-wine-700 text-white">Adicionar</Button>
          </form>

          <div className="divide-y divide-line">
            {fixedExpenses.filter(f => f.active).length === 0 ? (
              <p className="text-caption text-n-500 py-6 text-center">Nenhuma conta fixa cadastrada.</p>
            ) : (
              fixedExpenses.filter(f => f.active).map(f => (
                <div key={f.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-body-sm font-bold text-heading">{f.name}</p>
                    <p className="text-caption text-n-500">Desde {formatDateBR(f.created_at.split('T')[0])}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-body-sm font-bold text-danger num">{brl(f.amount_cents)}</span>
                    <button onClick={() => removeFixed(f.id)} className="p-1 text-n-400 hover:text-danger">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL NOVO LANÇAMENTO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="sheet-backdrop absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setShowForm(false)} />
          <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl p-6 shadow-xl border border-line z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-bold text-heading">Novo lançamento</h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-full hover:bg-surface-2 text-n-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-1 bg-surface-2 rounded-xl p-1">
                <button type="button" onClick={() => setFormType('expense')} className={`py-2 rounded-lg text-caption font-bold ${formType === 'expense' ? 'bg-danger text-white' : 'text-n-600'}`}>Saída</button>
                <button type="button" onClick={() => setFormType('income')} className={`py-2 rounded-lg text-caption font-bold ${formType === 'income' ? 'bg-success text-white' : 'text-n-600'}`}>Entrada</button>
              </div>
              <div>
                <label className="text-micro font-bold text-n-500 uppercase tracking-wider block mb-1">Valor</label>
                <input inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full px-3 py-2.5 bg-surface-2 border border-line rounded-xl text-h2 font-bold num text-heading" />
              </div>
              <div>
                <label className="text-micro font-bold text-n-500 uppercase tracking-wider block mb-1">Categoria</label>
                <input list="fin-cats-modal" placeholder="Selecione ou digite" value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 bg-surface-2 border border-line rounded-xl text-body-sm text-heading" />
                <datalist id="fin-cats-modal">{(formType === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-micro font-bold text-n-500 uppercase tracking-wider block mb-1">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 bg-surface-2 border border-line rounded-xl text-body-sm text-heading" />
                </div>
                <div>
                  <label className="text-micro font-bold text-n-500 uppercase tracking-wider block mb-1">Descrição</label>
                  <input placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-surface-2 border border-line rounded-xl text-body-sm text-heading" />
                </div>
              </div>
              <Button type="submit" size="lg" loading={saving} className="w-full rounded-xl bg-wine-700 text-white font-bold">Salvar lançamento</Button>
            </form>
          </div>
        </div>
      )}

      {/* Drill Down Modal */}
      <DrillDownModal
        open={drill !== null}
        title={drillData.title}
        subtitle={`${MONTHS[cursor.m]} ${cursor.y}`}
        rows={drillData.rows}
        onClose={() => setDrill(null)}
      />
    </div>
  );
};

export default FinancePanel;
