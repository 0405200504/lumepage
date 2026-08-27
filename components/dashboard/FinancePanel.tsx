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
import { IndexGrid } from '../ui/IndexGrid';
import { PageHeader } from '../ui/PageHeader';
import { MonoLabel, MonoValue } from '../ui/Mono';
import { StatusLabel } from '../ui/StatusDot';
import { SectionHeader } from '../ui/SectionHeader';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { DrillDownModal, DrillDownRow } from '../ui/DrillDownModal';
import { TechChart } from '../ui/charts/TechChart';
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
// Monocromática dentro da escala vinho, com dois neutros no fim para as fatias
// de cauda longa. Nenhum arco-íris: a categoria não muda de significado por cor.
const DONUT_COLORS = [
  'var(--color-wine-700)', 'var(--color-wine-600)', 'var(--color-wine-500)',
  'var(--color-wine-400)', 'var(--color-wine-300)', 'var(--color-wine-200)',
  'var(--color-n-400)', 'var(--color-n-300)',
];
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
    <div className="space-y-6">
      {/* O seletor de mês virou um controle de RÉGUA: setas encostadas no
          rótulo, dentro da mesma moldura retangular, como um contador de
          instrumento. Antes eram dois botões fantasma soltos ao lado de um
          h2 — nada indicava que o mês era navegável. */}
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
        {/* ===================== VISÃO GERAL ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            {/* ARQUÉTIPO 3 · os quatro índices dividem UMA superfície, separados
                por hairline, sem ícone e sem sombra. Eram quatro cards soltos
                com um iconezinho num quadrado cinza cada — o rótulo "Entradas
                do mês" já dizia o que o cifrãozinho diria, e o gap entre eles
                transformava uma leitura contínua em quatro leituras. */}
            <IndexGrid
              items={[
                { label: 'Entradas do mês', value: brl(income), accent: true, hint: 'Serviços + avulsos',
                  delta: { pct: cmpIncome.deltaPct }, onClick: () => setDrill('income') },
                { label: 'Saídas do mês', value: brl(expense), hint: 'Insumos + fixas + lançamentos',
                  delta: { pct: cmpExpense.deltaPct, good: cmpExpense.deltaPct <= 0 }, onClick: () => setDrill('expense') },
                { label: 'Lucro do mês', value: brl(metrics.netProfit), hint: `Margem ${metrics.margin.toFixed(0)}%`,
                  delta: { pct: cmpProfit.deltaPct }, onClick: () => setDrill('profit') },
                { label: 'Saldo acumulado', value: brl(totalBalance), hint: 'Sobrou até hoje' },
              ]}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* DRE */}
              <div className="card p-5 sm:p-6">
                <SectionHeader title="DRE simplificado" subtitle={`${MONTHS[cursor.m]} ${cursor.y}`} icon={<Calculator className="h-4 w-4" />} />
                <div className="mt-4 divide-y divide-line">
                  {dreLines.map((l) => (
                    <div key={l.label} className="flex items-center justify-between py-2.5">
                      <span className={`text-label ${l.strong ? 'font-semibold text-ink' : 'text-n-600 font-medium'}`}>{l.label}</span>
                      <span className={`text-label font-semibold num ${l.value < 0 ? 'text-danger' : 'text-ink'}`}>{l.value < 0 ? '−' : ''}{brl(Math.abs(l.value))}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-label font-semibold text-heading">= Lucro líquido</span>
                    <span className={`text-h3 sm:text-h2 font-semibold num ${metrics.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{brl(metrics.netProfit)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 pt-3 border-t border-line">
                  <span className="overline text-n-500">Margem líquida</span>
                  <span className={`text-label font-semibold ${metrics.margin >= 0 ? 'text-success' : 'text-danger'}`}>{metrics.margin.toFixed(1)}%</span>
                </div>
                {metrics.lostRevenue > 0 && (
                  <p className="mt-3 text-caption text-n-600">Receita perdida com cancelamentos/faltas no mês: <strong className="text-danger">{brl(metrics.lostRevenue)}</strong> (não entra no cálculo, é informativo).</p>
                )}
                {metrics.variableCosts === 0 && (
                  <p className="mt-2 text-caption text-n-600">Dica: informe o <strong>custo de insumos</strong> de cada serviço (tela Serviços) para o DRE calcular os custos variáveis.</p>
                )}
              </div>

              {/* Projeção + comparativo anual */}
              <div className="card p-5 sm:p-6 flex flex-col">
                <SectionHeader title="Projeção do mês" subtitle={isCurrentMonth ? 'Estimativa até o fim do mês' : 'Disponível só no mês corrente'} icon={<TrendingUp className="h-4 w-4" />} />
                {isCurrentMonth ? (
                  <>
                    <p className="text-h2 sm:text-h1 font-semibold text-heading mt-4 num">{brl(projection.projected)}</p>
                    <div className="mt-4 space-y-2 text-caption">
                      <Row label="Já realizado" value={brl(projection.realized)} />
                      <Row label="Confirmados a vir" value={brl(projection.confirmedAhead)} />
                      <Row label="Estimativa (média histórica)" value={brl(projection.historicalRunRate)} muted />
                    </div>
                    <p className="mt-3 text-caption text-n-600">Soma o que já foi concluído, os agendamentos confirmados que ainda vão acontecer e uma estimativa dos dias restantes pela sua média diária dos últimos 90 dias.</p>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-center py-8">
                    <p className="text-caption text-n-600 max-w-[220px]">A projeção é calculada para o mês atual. Volte para {MONTHS[now.getMonth()]} para vê-la.</p>
                  </div>
                )}
                <div className="mt-auto pt-4 border-t border-line flex items-center justify-between text-caption">
                  <span className="text-n-600 font-semibold">vs. mesmo mês de {cursor.y - 1}</span>
                  <span className="font-semibold text-ink num">{brl(lyMetrics.grossRevenue + lyMetrics.manualIncome)} → {compare(income, lyMetrics.grossRevenue + lyMetrics.manualIncome).deltaPct.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            {/* A receber + formas de pagamento */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="card p-5 sm:p-6">
                <SectionHeader title="Contas a receber" subtitle="Valores previstos ainda não realizados" icon={<ScrollText className="h-4 w-4" />}
                  actions={<button onClick={() => setDrill('receivable')} className="text-caption font-semibold text-wine-700 hover:text-wine-800 transition-ui">Ver tudo →</button>} />
                {/* Os dois blocos perderam o fundo (salmão e cinza) e dividem
                    uma moldura só, separados por hairline. O "vencido" continua
                    marcado — mas por um PONTO e pelo número em --danger, não
                    por um retângulo colorido de 100×90px.
                    "A vencer" leva contorno tracejado: é previsto, e tracejado
                    quer dizer previsto em todo o produto. */}
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 mt-4 border border-line rounded-surface overflow-hidden">
                  <button onClick={() => setDrill('receivable')} className="text-left p-4 border-b min-[420px]:border-b-0 min-[420px]:border-r border-line transition-ui hover:bg-n-25">
                    <StatusLabel tone="danger">Vencido</StatusLabel>
                    <p className="text-h3 sm:text-h2 font-semibold text-danger mt-1.5 num leading-none">{brl(receivables.overdue.total)}</p>
                    <MonoValue className="text-micro text-n-500 mt-1.5 block">
                      {receivables.overdue.items.length} AGENDAMENTO(S)
                    </MonoValue>
                  </button>
                  <div className="p-4">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-3 border-t border-dashed border-line-strong" aria-hidden />
                      <MonoLabel>A vencer</MonoLabel>
                    </span>
                    <p className="text-h3 sm:text-h2 font-semibold text-ink mt-1.5 num leading-none">{brl(receivables.dueSoon.total)}</p>
                    <MonoValue className="text-micro text-n-500 mt-1.5 block">
                      {receivables.dueSoon.items.length} AGENDAMENTO(S)
                    </MonoValue>
                  </div>
                </div>
                <p className="mt-3 text-caption text-n-600">Baseado em agendamentos pendentes/confirmados (data passada = vencido).</p>
              </div>

              <div className="card p-5 sm:p-6">
                <SectionHeader title="Por forma de pagamento" subtitle="Bruto, taxa e líquido no mês" icon={<CreditCard className="h-4 w-4" />}
                  actions={<button onClick={() => setShowRates(s => !s)} className="inline-flex items-center gap-1 text-caption font-semibold text-wine-700 hover:text-wine-800 transition-ui"><Sliders className="h-3.5 w-3.5" /> Taxas</button>} />
                {showRates && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3">
                    {['pix', 'debito', 'credito', 'dinheiro'].map(m => (
                      <label key={m} className="flex items-center justify-between gap-2 text-caption">
                        <span className="text-n-600 font-semibold">{paymentLabel(m)}</span>
                        <span className="flex items-center gap-1">
                          <input type="number" min={0} step={0.1} value={rates[m] ?? 0} onChange={e => updateRate(m, parseFloat(e.target.value) || 0)}
                            className="w-14 px-1.5 py-1 text-right border border-line rounded-md bg-surface text-ink font-semibold" />
                          <span className="text-n-600">%</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {payments.length === 0 ? (
                  <p className="text-caption text-n-600 py-8 text-center">Sem vendas com forma de pagamento no mês.</p>
                ) : (
                  /* Uma moldura por forma de pagamento era card dentro de card.
                     Viraram linhas divididas por hairline de ponta a ponta. */
                  <div className="mt-4 -mx-5 sm:-mx-6">
                    {payments.map(p => (
                      <div key={p.method} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 px-5 sm:px-6 py-3 sm:py-2.5 border-b border-line last:border-b-0">
                        <div className="min-w-0">
                          <p className="text-body-sm text-ink truncate">{p.label}</p>
                          <MonoValue className="text-micro text-n-500">
                            {p.count} VENDA(S) · TAXA {brl(p.fee)}
                          </MonoValue>
                        </div>
                        <div className="sm:text-right shrink-0 flex sm:block items-center gap-2">
                          <p className="text-body-sm font-semibold text-ink num">{brl(p.net)}</p>
                          <MonoValue className="text-micro text-n-500">LÍQ. DE {brl(p.gross)}</MonoValue>
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
              {/* Legenda em mono, sólido × tracejado. O faturamento (a linha
                  de referência) virou tracejada e o LUCRO ficou sólido em
                  vinho: o dado que a tela existe para mostrar é o que ganha o
                  traço cheio, e o outro passa a ser a régua ao fundo. */}
              <div className="flex items-center gap-4 mt-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-px bg-wine-700" aria-hidden />
                  <MonoLabel>Lucro líquido</MonoLabel>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 border-t border-dashed border-line-strong" aria-hidden />
                  <MonoLabel>Faturamento</MonoLabel>
                </span>
              </div>
              <div className="mt-4">
                <TechChart
                  labels={netSeries.map(p => p.label)}
                  height={180}
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

        {/* ===================== EXTRATO ===================== */}
        {activeTab === 'ledger' && (
          <div className="card p-5 sm:p-6 space-y-4 animate-fade-up">
            <SectionHeader title="Extrato do mês" subtitle={`${monthItems.length} lançamentos`} icon={<ReceiptText className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportLedgerCSV} />} />
            {/* Extrato = ARQUÉTIPO 2 em forma de lista: linha de 44px,
                divisória de ponta a ponta, valor à direita em tabular.
                O quadradinho colorido com a setinha (menta para entrada,
                salmão para saída) saiu: o SINAL do valor (+/−) e a cor do
                próprio número já dizem a direção, e a seta repetia isso 40
                vezes numa coluna de manchas. Sobrou uma barra de 3px à
                esquerda — a mesma gramática do bloco da agenda. */}
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
                    <div className="flex-1 min-w-0 flex items-center gap-3 pr-5 sm:pr-6 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm text-ink truncate">{i.category}</p>
                        <p className="mono-micro text-n-500 truncate">
                          {formatDateBR(i.date)}{i.description ? ` · ${i.description}` : ''}
                        </p>
                      </div>
                      <span className={`text-body-sm font-semibold shrink-0 num ${inc ? 'text-success' : 'text-danger'}`}>
                        {inc ? '+' : '−'}{brl(i.amount_cents)}
                      </span>
                      <span className="shrink-0 w-16 text-right no-print">
                        {i.auto ? (
                          <span className="mono-micro text-n-400">{isFixed ? 'FIXA' : 'AUTO'}</span>
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

        {/* ===================== FLUXO & LUCRO ===================== */}
        {activeTab === 'cashflow' && (
          <div className="card p-5 sm:p-6 animate-fade-up">
            <SectionHeader title="Fluxo de caixa e lucro" subtitle="Faturamento x lucro líquido · últimos 12 meses" icon={<LineIcon className="h-4 w-4" />} />
            <div className="flex items-center gap-4 mt-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 h-px bg-wine-700" aria-hidden />
                <MonoLabel>Lucro líquido</MonoLabel>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-4 border-t border-dashed border-line-strong" aria-hidden />
                <MonoLabel>Faturamento</MonoLabel>
              </span>
            </div>
            <div className="mt-5">
              <TechChart
                height={220}
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

        {/* ===================== CATEGORIAS ===================== */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-up">
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Saídas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {expenseByCat.length === 0 ? <p className="text-caption text-n-600 py-8 text-center">Sem saídas no mês.</p> : (
                  <DonutChart format={brl} data={expenseByCat.map(([cat, val], i): DonutSlice => ({ label: cat, value: val, color: DONUT_COLORS[i % DONUT_COLORS.length] }))} />
                )}
              </div>
            </div>
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Entradas por categoria" icon={<PieChart className="h-4 w-4" />} />
              <div className="mt-5">
                {incomeByCat.length === 0 ? <p className="text-caption text-n-600 py-8 text-center">Sem entradas no mês.</p> : (
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
                  description="Aluguel, energia, internet — o que sai todo mês. Cadastre uma vez e o lançamento passa a se repetir sozinho."
                />
              ) : fixedExpenses.filter(f => f.active).map(f => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-line p-4 hover:bg-surface-2 transition-colors">
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
                <label className="block overline text-n-500 mb-1.5">Valor (R$)</label>
                <input inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-control text-h2 font-semibold num text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
              </div>
              <div>
                <label className="block overline text-n-500 mb-1.5">Categoria</label>
                <input list="fin-cats" placeholder="Selecione ou digite" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
                <datalist id="fin-cats">{(formType === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block overline text-n-500 mb-1.5">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="block w-full px-3 py-3 bg-surface-2 border border-line rounded-xl text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
                </div>
                <div>
                  <label className="block overline text-n-500 mb-1.5">Descrição</label>
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

const Row: React.FC<{ label: string; value: string; muted?: boolean }> = ({ label, value, muted }) => (
  <div className="flex items-center justify-between">
    <span className={`${muted ? 'text-n-600' : 'text-ink'} font-medium`}>{label}</span>
    <span className={`font-semibold num ${muted ? 'text-n-600' : 'text-ink'}`}>{value}</span>
  </div>
);

export default FinancePanel;
