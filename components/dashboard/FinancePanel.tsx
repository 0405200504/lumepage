'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Transaction, Appointment, TransactionType, FixedExpense } from '@/types/database';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank,
  Plus, Trash2, X, ArrowDownCircle, ArrowUpCircle, Sparkles, Repeat, DollarSign,
  BarChart4, ReceiptText, PieChart, LineChart
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import {
  createTransactionAction, deleteTransactionAction,
  createFixedExpenseAction, deleteFixedExpenseAction,
} from '@/app/actions/crm';
import { formatDateBR } from '@/lib/whatsapp';
import { serviceRevenueCents } from '@/lib/finance';

interface FinancePanelProps {
  professionalId: string;
  transactions: Transaction[];
  appointments: Appointment[];
  fixedExpenses: FixedExpense[];
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const EXPENSE_CATS = ['Produtos e materiais', 'Aluguel', 'Energia/Água/Internet', 'Marketing', 'Salários/Comissões', 'Impostos', 'Equipamentos', 'Outros'];
const INCOME_CATS = ['Serviço avulso', 'Venda de produto', 'Pacote/Plano', 'Outros'];

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
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

export const FinancePanel: React.FC<FinancePanelProps> = ({ professionalId, transactions, appointments, fixedExpenses }) => {
  const router = useRouter();
  const { success, error } = useToast();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const currentIdx = idxOf(now.getFullYear(), now.getMonth());
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');

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

  // --- Itens do mês selecionado ---
  const monthAuto: LedgerItem[] = useMemo(() =>
    appointments
      .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.service?.price_cents && inMonth(a.date, cursor.y, cursor.m))
      .map(a => ({
        id: `appt-${a.id}`, kind: 'income' as TransactionType, amount_cents: a.service!.price_cents,
        category: a.status === 'completed' ? 'Atendimento concluído' : 'Atendimento confirmado',
        description: `${a.service?.name} · ${a.client_name}`, date: a.date, auto: true,
      })),
  [appointments, cursor]);

  const monthManual: LedgerItem[] = useMemo(() =>
    transactions.filter(t => inMonth(t.date, cursor.y, cursor.m))
      .map(t => ({ id: t.id, kind: t.type, amount_cents: t.amount_cents, category: t.category, description: t.description, date: t.date })),
  [transactions, cursor]);

  // Contas fixas ativas que valem para o mês selecionado (a partir do mês de criação)
  const monthFixed: LedgerItem[] = useMemo(() =>
    fixedExpenses.filter(f => f.active).filter(f => {
      const c = new Date(f.created_at);
      return idxOf(cursor.y, cursor.m) >= idxOf(c.getFullYear(), c.getMonth());
    }).map(f => ({
      id: `fixed-${f.id}`, kind: 'expense' as TransactionType, amount_cents: f.amount_cents,
      category: 'Conta fixa', description: f.name, date: monthFirst, auto: true,
    })),
  [fixedExpenses, cursor, monthFirst]);

  const monthItems = useMemo(
    () => [...monthAuto, ...monthManual, ...monthFixed].sort((a, b) => b.date.localeCompare(a.date)),
    [monthAuto, monthManual, monthFixed]
  );

  const sum = (items: LedgerItem[], kind: TransactionType) => items.filter(i => i.kind === kind).reduce((s, i) => s + i.amount_cents, 0);

  const faturamento = sum(monthAuto, 'income');
  const extraIncome = sum(monthManual, 'income');
  const monthExpense = sum(monthItems, 'expense');
  const monthIncome = faturamento + extraIncome;
  const monthProfit = monthIncome - monthExpense;

  // Saldo acumulado (até o mês ATUAL real, independente do mês navegado na tela)
  const totalBalance = useMemo(() => {
    const today = new Date();
    const realIdx = idxOf(today.getFullYear(), today.getMonth());
    
    const validAppts = appointments.filter(a => {
      const [y, m] = a.date.split('-').map(Number);
      return idxOf(y, m - 1) <= realIdx;
    });
    
    const validTrans = transactions.filter(t => {
      const [y, m] = t.date.split('-').map(Number);
      return idxOf(y, m - 1) <= realIdx;
    });

    const incomeAll = serviceRevenueCents(validAppts) + validTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_cents, 0);
    const manualExpenseAll = validTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0);
    
    const fixedAll = fixedExpenses.filter(f => f.active).reduce((s, f) => {
      const c = new Date(f.created_at);
      const startIdx = idxOf(c.getFullYear(), c.getMonth());
      if (startIdx > realIdx) return s;
      const months = realIdx - startIdx + 1;
      return s + f.amount_cents * months;
    }, 0);
    
    return incomeAll - manualExpenseAll - fixedAll;
  }, [appointments, transactions, fixedExpenses]);

  // Receitas/Saídas por categoria (mês)
  const expenseByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.filter(i => i.kind === 'expense').forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount_cents; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);
  const maxExpenseCat = expenseByCat.length ? expenseByCat[0][1] : 1;
  
  const incomeByCat = useMemo(() => {
    const map: Record<string, number> = {};
    monthItems.filter(i => i.kind === 'income').forEach(i => { map[i.category] = (map[i.category] || 0) + i.amount_cents; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [monthItems]);
  const maxIncomeCat = incomeByCat.length ? incomeByCat[0][1] : 1;

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
  
  // Lógica do gráfico de fluxo de caixa (últimos 6 meses)
  const cashflowData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = now.getMonth() - i;
      let y = now.getFullYear();
      if (m < 0) { m += 12; y--; }
      
      const mStr = `${y}-${pad(m + 1)}-01`;
      const mAuto = appointments
        .filter(a => (a.status === 'completed' || a.status === 'confirmed') && a.service?.price_cents && inMonth(a.date, y, m))
        .reduce((s, a) => s + (a.service?.price_cents || 0), 0);
        
      const mManInc = transactions.filter(t => t.type === 'income' && inMonth(t.date, y, m)).reduce((s, t) => s + t.amount_cents, 0);
      const mManExp = transactions.filter(t => t.type === 'expense' && inMonth(t.date, y, m)).reduce((s, t) => s + t.amount_cents, 0);
      
      const mFixed = fixedExpenses.filter(f => f.active).filter(f => {
        const c = new Date(f.created_at);
        return idxOf(y, m) >= idxOf(c.getFullYear(), c.getMonth());
      }).reduce((s, f) => s + f.amount_cents, 0);
      
      const inc = mAuto + mManInc;
      const exp = mManExp + mFixed;
      
      data.push({ label: `${MONTHS[m].substring(0,3)}/${y.toString().substring(2)}`, inc, exp });
    }
    return data;
  }, [appointments, transactions, fixedExpenses]);

  const kpis = [
    { label: 'Entradas do mês', value: brl(monthIncome), icon: DollarSign, accent: 'text-wine-700', bg: 'bg-wine-700/8', hint: 'Serviços + avulsos' },
    { label: 'Saídas do mês', value: brl(monthExpense), icon: ArrowDownCircle, accent: 'text-[#b23a48]', bg: 'bg-[#b23a48]/8', hint: 'Lançamentos + contas fixas' },
    { label: 'Lucro do mês', value: brl(monthProfit), icon: monthProfit >= 0 ? TrendingUp : TrendingDown, accent: monthProfit >= 0 ? 'text-[#226045]' : 'text-[#b23a48]', bg: monthProfit >= 0 ? 'bg-[#2e7d5b]/8' : 'bg-[#b23a48]/8', hint: 'Entradas − saídas' },
    { label: 'Saldo acumulado', value: brl(totalBalance), icon: PiggyBank, accent: 'text-wine-700', bg: 'bg-wine-700/8', hint: 'Total que sobrou até hoje' },
  ];

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral', icon: BarChart4 },
    { key: 'ledger' as const, label: 'Extrato de movimentações', icon: ReceiptText },
    { key: 'cashflow' as const, label: 'Fluxo de caixa', icon: LineChart },
    { key: 'categories' as const, label: 'Relatório de categorias', icon: PieChart },
    { key: 'fixed' as const, label: 'Contas fixas mensais', icon: Repeat },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-up">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft">
            <button onClick={() => step(-1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest"><ChevronLeft className="h-4 w-4" /></button>
            <button onClick={() => step(1)} className="p-2 rounded-xl hover:bg-cream text-gray-450 hover:text-forest"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <h3 className="text-lg font-black text-forest tracking-tight capitalize">{MONTHS[cursor.m]} {cursor.y}</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-3 surface-wine text-white text-xs font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom">
            <Plus className="h-4 w-4" /> Lançamento
          </button>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-paper border border-gray-150 rounded-2xl p-1 shadow-soft overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all-custom ${
                active ? 'bg-wine-700 text-white shadow-soft' : 'text-gray-450 hover:bg-cream hover:text-ink'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="min-h-[400px]">
        {/* VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-fade-up">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className="card p-4 sm:p-5">
                  <div className={`inline-flex p-2.5 rounded-2xl ${k.bg} ${k.accent} mb-3`}><Icon className="h-5 w-5" /></div>
                  <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
                  <p className={`text-lg sm:text-xl font-black mt-1 ${k.accent}`}>{k.value}</p>
                  <p className="text-[10px] text-gray-450 font-semibold mt-1 hidden sm:block">{k.hint}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* EXTRATO */}
        {activeTab === 'ledger' && (
          <div className="card p-5 sm:p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between border-b border-gray-150 pb-4">
              <h3 className="text-base font-black text-ink tracking-tight">Extrato do mês</h3>
              <span className="text-[10px] font-bold text-gray-450">{monthItems.length} lançamentos</span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto -mx-1 px-1">
              {monthItems.length === 0 ? (
                <div className="text-center py-14 border-2 border-dashed border-gray-250 rounded-2xl">
                  <Wallet className="h-8 w-8 text-wine-200 mx-auto" />
                  <p className="text-xs text-gray-450 mt-3">Nenhum lançamento neste mês.</p>
                  <button onClick={() => setShowForm(true)} className="mt-3 text-xs font-bold text-wine-700 hover:underline">Adicionar o primeiro &rarr;</button>
                </div>
              ) : monthItems.map((i) => {
                const income = i.kind === 'income';
                const isFixed = i.id.startsWith('fixed-');
                return (
                  <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-gray-150 p-3 hover:bg-cream/50 transition-colors">
                    <div className={`p-2 rounded-xl shrink-0 ${income ? 'bg-[#2e7d5b]/10 text-[#226045]' : 'bg-[#b23a48]/10 text-[#b23a48]'}`}>
                      {isFixed ? <Repeat className="h-4 w-4" /> : income ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{i.category}</p>
                      <p className="text-[11px] text-gray-450 truncate">{i.description || '—'} · {formatDateBR(i.date)}</p>
                    </div>
                    <span className={`text-sm font-black shrink-0 ${income ? 'text-[#226045]' : 'text-[#b23a48]'}`}>
                      {income ? '+' : '−'}{brl(i.amount_cents)}
                    </span>
                    {i.auto ? (
                      <span className="text-[8px] font-bold text-gray-450 bg-gray-150 rounded-full px-1.5 py-0.5 shrink-0">{isFixed ? 'FIXA' : 'AUTO'}</span>
                    ) : (
                      <button onClick={() => remove(i.id)} disabled={deletingId === i.id} className="p-1.5 rounded-lg text-gray-450 hover:text-[#b23a48] hover:bg-[#b23a48]/10 transition-colors shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* FLUXO DE CAIXA */}
        {activeTab === 'cashflow' && (
          <div className="card p-6 animate-fade-up">
            <h3 className="text-base font-black text-ink mb-6">Fluxo de Caixa (Últimos 6 meses)</h3>
            <div className="flex h-64 items-end gap-2 mt-8">
              {cashflowData.map((d, i) => {
                const maxVal = Math.max(...cashflowData.flatMap(x => [x.inc, x.exp]), 1);
                const hInc = Math.max(4, (d.inc / maxVal) * 100);
                const hExp = Math.max(4, (d.exp / maxVal) * 100);
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2 group">
                    <div className="w-full flex justify-center gap-1 h-full items-end">
                      <div className="w-[40%] bg-[#2e7d5b] rounded-t-sm opacity-90 group-hover:opacity-100 transition-opacity relative" style={{ height: `${hInc}%` }}>
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#2e7d5b] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{brl(d.inc)}</span>
                      </div>
                      <div className="w-[40%] bg-[#b23a48] rounded-t-sm opacity-90 group-hover:opacity-100 transition-opacity relative" style={{ height: `${hExp}%` }}>
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] font-bold text-[#b23a48] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{brl(d.exp)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-gray-450">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-gray-150">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#2e7d5b] rounded-sm"/><span className="text-xs text-gray-450 font-semibold">Entradas</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#b23a48] rounded-sm"/><span className="text-xs text-gray-450 font-semibold">Saídas</span></div>
            </div>
          </div>
        )}
        
        {/* CATEGORIAS */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-up">
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-black text-[#b23a48] tracking-tight">Saídas por categoria</h3>
              {expenseByCat.length === 0 ? (
                <div className="text-center py-10">
                  <PieChart className="h-7 w-7 text-wine-200 mx-auto" />
                  <p className="text-xs text-gray-450 mt-3">Sem saídas no mês.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {expenseByCat.map(([cat, val]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-ink truncate">{cat}</span>
                        <span className="text-gray-450">{brl(val)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-cream overflow-hidden">
                        <div className="h-full rounded-full bg-[#b23a48]/80" style={{ width: `${Math.max(2, (val / maxExpenseCat) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="card p-6 space-y-4">
              <h3 className="text-base font-black text-[#226045] tracking-tight">Entradas por categoria</h3>
              {incomeByCat.length === 0 ? (
                <div className="text-center py-10">
                  <PieChart className="h-7 w-7 text-wine-200 mx-auto" />
                  <p className="text-xs text-gray-450 mt-3">Sem entradas no mês.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {incomeByCat.map(([cat, val]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-[11px] font-semibold mb-1">
                        <span className="text-ink truncate">{cat}</span>
                        <span className="text-gray-450">{brl(val)}</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-cream overflow-hidden">
                        <div className="h-full rounded-full bg-[#2e7d5b]/80" style={{ width: `${Math.max(2, (val / maxIncomeCat) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* CONTAS FIXAS */}
        {activeTab === 'fixed' && (
          <div className="card p-6 max-w-2xl mx-auto animate-fade-up">
            <h3 className="text-base font-black text-ink mb-1">Contas fixas mensais</h3>
            <p className="text-xs text-gray-450 mb-6">São lançadas automaticamente como saída em <strong>todos os meses</strong> (a partir do momento do cadastro).</p>

            <form onSubmit={addFixed} className="flex flex-col sm:flex-row gap-2 mb-6">
              <input placeholder="Ex: Aluguel do espaço" value={fxName} onChange={(e) => setFxName(e.target.value)}
                className="flex-1 min-w-0 px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
              <input inputMode="decimal" placeholder="R$ 0,00" value={fxAmount} onChange={(e) => setFxAmount(e.target.value)}
                className="w-full sm:w-32 px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
              <button type="submit" disabled={fxSaving} className="px-5 py-3 surface-wine text-white rounded-xl shadow-soft font-bold text-xs hover:opacity-95 disabled:opacity-60 shrink-0">
                Adicionar
              </button>
            </form>

            <div className="space-y-2">
              {fixedExpenses.filter(f => f.active).length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-250 rounded-2xl">
                  <Repeat className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-450">Nenhuma conta fixa cadastrada.</p>
                </div>
              ) : fixedExpenses.filter(f => f.active).map(f => (
                <div key={f.id} className="flex items-center justify-between rounded-xl border border-gray-150 p-4 hover:bg-cream/50 transition-colors">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="bg-[#b23a48]/10 p-2 rounded-lg text-[#b23a48]">
                      <Repeat className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-ink truncate">{f.name}</p>
                      <p className="text-[11px] text-gray-450">Desde {formatDateBR(f.created_at.split('T')[0])}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[#b23a48] font-black">{brl(f.amount_cents)} / mês</span>
                    <button onClick={() => removeFixed(f.id)} className="p-1.5 rounded-lg text-gray-450 hover:text-[#b23a48] hover:bg-[#b23a48]/10 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {fixedMonthlyTotal > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-150 flex justify-between items-center text-sm">
                <span className="font-bold text-ink">Total projetado todo mês:</span>
                <span className="text-xl font-black text-[#b23a48]">{brl(fixedMonthlyTotal)}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Novo Lançamento */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-ink tracking-tight">Novo lançamento</h3>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-xl hover:bg-cream text-gray-450"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-cream rounded-2xl p-1">
                <button type="button" onClick={() => setFormType('expense')} className={`py-2.5 rounded-xl text-xs font-bold transition-all ${formType === 'expense' ? 'bg-[#b23a48] text-white shadow-soft' : 'text-gray-450'}`}>Saída</button>
                <button type="button" onClick={() => setFormType('income')} className={`py-2.5 rounded-xl text-xs font-bold transition-all ${formType === 'income' ? 'bg-[#2e7d5b] text-white shadow-soft' : 'text-gray-450'}`}>Entrada</button>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Valor (R$)</label>
                <input inputMode="decimal" required placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-lg font-black text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Categoria</label>
                <input list="fin-cats" placeholder="Selecione ou digite" value={category} onChange={(e) => setCategory(e.target.value)}
                  className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
                <datalist id="fin-cats">{(formType === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Data</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Descrição</label>
                  <input placeholder="Opcional" value={description} onChange={(e) => setDescription(e.target.value)}
                    className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
                </div>
              </div>
              <button type="submit" disabled={saving} className="w-full py-4 surface-wine text-white text-sm font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom disabled:opacity-60">
                {saving ? 'Salvando...' : 'Salvar lançamento'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default FinancePanel;
