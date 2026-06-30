'use client';

import React, { useMemo, useState } from 'react';
import { Appointment, Service } from '@/types/database';
import {
  DollarSign, ReceiptText, Sparkles, BarChart4, Tag, Users, Search, X,
  UserPlus, Repeat2, Crown, Filter, Percent,
} from 'lucide-react';
import { formatDateBR } from '@/lib/whatsapp';
import { brl } from '@/lib/format';
import { indexServices, appointmentRevenueCents } from '@/lib/finance';
import {
  monthRange, compare, clientRecurrence, funnel, serviceStats, topClientsBySpend,
  monthlySeries, inRange as inDateRange,
} from '@/lib/analytics';
import { KpiCard } from '../ui/KpiCard';
import { SectionHeader } from '../ui/SectionHeader';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { DataTable, Column } from '../ui/DataTable';
import { BarChart } from '../ui/charts/BarChart';
import { Sparkline } from '../ui/charts/Sparkline';
import { toCSV, downloadCSV, centsToPlain } from '@/lib/export';

interface SalesPanelProps {
  appointments: Appointment[];
  services: Service[];
}

type TabType = 'overview' | 'sales' | 'services' | 'clients';
type PeriodKey = 'month' | 'year' | 'all';

const STATUS_LABEL: Record<string, string> = { completed: 'Concluído', confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', no_show: 'Falta' };
const now = new Date();

interface SaleRow {
  id: string; date: string; client: string; serviceName: string; extra: number;
  status: string; payment: string; amount: number;
}

export const SalesPanel: React.FC<SalesPanelProps> = ({ appointments, services }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState<PeriodKey>('month');
  const byId = useMemo(() => indexServices(services), [services]);

  // Vendas = atendimentos confirmados ou concluídos
  const sales = useMemo(() => appointments.filter(a => a.status === 'completed' || a.status === 'confirmed'), [appointments]);

  // Intervalo do período selecionado + intervalo equivalente anterior (p/ comparativo)
  const { range, prevRange, label } = useMemo(() => {
    if (period === 'month') {
      const r = monthRange(now.getFullYear(), now.getMonth());
      const p = monthRange(now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), (now.getMonth() + 11) % 12);
      return { range: r, prevRange: p, label: 'mês' };
    }
    if (period === 'year') {
      const r = { start: `${now.getFullYear()}-01-01`, end: `${now.getFullYear()}-12-31` };
      const p = { start: `${now.getFullYear() - 1}-01-01`, end: `${now.getFullYear() - 1}-12-31` };
      return { range: r, prevRange: p, label: 'ano' };
    }
    return { range: { start: '0000-01-01', end: '9999-12-31' }, prevRange: { start: '0000-01-01', end: '0000-01-01' }, label: 'período' };
  }, [period]);

  const inR = (iso: string) => inDateRange(iso, range.start, range.end);

  // Métricas do período + comparativo
  const curRevenue = sales.filter(s => inR(s.date)).reduce((a, s) => a + appointmentRevenueCents(s, byId), 0);
  const curCount = sales.filter(s => inR(s.date)).length;
  const prevRevenue = sales.filter(s => inDateRange(s.date, prevRange.start, prevRange.end)).reduce((a, s) => a + appointmentRevenueCents(s, byId), 0);
  const prevCount = sales.filter(s => inDateRange(s.date, prevRange.start, prevRange.end)).length;
  const curTicket = curCount ? Math.round(curRevenue / curCount) : 0;
  const prevTicket = prevCount ? Math.round(prevRevenue / prevCount) : 0;

  const showCompare = period !== 'all';
  const cmpRev = compare(curRevenue, prevRevenue);
  const cmpTkt = compare(curTicket, prevTicket);
  const cmpQt = compare(curCount, prevCount);

  // Sparklines (faturamento dos últimos 6 meses)
  const series6 = useMemo(() => monthlySeries(appointments, [], [], services, 6), [appointments, services]);
  const revSpark = series6.map(p => p.gross / 100);

  // Recorrência / funil / serviços / ranking
  const recurrence = useMemo(() => clientRecurrence(appointments, byId, range), [appointments, byId, range]);
  const funnelStages = useMemo(() => funnel(appointments, range), [appointments, range]);
  const svcStats = useMemo(() => serviceStats(appointments, services, byId, range), [appointments, services, byId, range]);
  const topClients = useMemo(() => topClientsBySpend(appointments, byId, range, 10), [appointments, byId, range]);

  // ---- Tabela de vendas: filtros ----
  const [search, setSearch] = useState('');
  const [fService, setFService] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fStart, setFStart] = useState('');
  const [fEnd, setFEnd] = useState('');
  const [fMin, setFMin] = useState('');
  const [fMax, setFMax] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const allRows: SaleRow[] = useMemo(() => sales.map(s => {
    const ids = s.service_ids && s.service_ids.length ? s.service_ids : [s.service_id];
    return {
      id: s.id, date: s.date, client: s.client_name,
      serviceName: s.service?.name ?? byId[s.service_id]?.name ?? 'Serviço',
      extra: Math.max(0, ids.length - 1),
      status: s.status, payment: s.payment_method ?? '', amount: appointmentRevenueCents(s, byId),
    };
  }), [sales, byId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const min = fMin ? Math.round(parseFloat(fMin.replace(',', '.')) * 100) : null;
    const max = fMax ? Math.round(parseFloat(fMax.replace(',', '.')) * 100) : null;
    return allRows.filter(r => {
      if (q && !(`${r.client} ${r.serviceName}`.toLowerCase().includes(q))) return false;
      if (fService && r.serviceName !== fService) return false;
      if (fStatus && r.status !== fStatus) return false;
      if (fStart && r.date < fStart) return false;
      if (fEnd && r.date > fEnd) return false;
      if (min !== null && r.amount < min) return false;
      if (max !== null && r.amount > max) return false;
      return true;
    });
  }, [allRows, search, fService, fStatus, fStart, fEnd, fMin, fMax]);

  const serviceOptions = useMemo(() => Array.from(new Set(allRows.map(r => r.serviceName))).sort(), [allRows]);
  const hasActiveFilters = !!(search || fService || fStatus || fStart || fEnd || fMin || fMax);
  const clearFilters = () => { setSearch(''); setFService(''); setFStatus(''); setFStart(''); setFEnd(''); setFMin(''); setFMax(''); };

  const columns: Column<SaleRow>[] = [
    { key: 'date', header: 'Data', sortValue: r => r.date, cell: r => <span className="font-semibold text-gray-450">{formatDateBR(r.date)}</span> },
    { key: 'client', header: 'Cliente', sortValue: r => r.client, cell: r => <span className="font-bold text-ink">{r.client}</span> },
    { key: 'service', header: 'Serviço', sortValue: r => r.serviceName, cell: r => <span className="text-gray-450">{r.serviceName}{r.extra > 0 && <span className="text-forest font-bold"> +{r.extra}</span>}</span> },
    { key: 'payment', header: 'Pagamento', sortValue: r => r.payment, cell: r => <span className="text-gray-450 capitalize">{r.payment || '—'}</span> },
    { key: 'status', header: 'Status', sortValue: r => r.status, cell: r => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === 'completed' ? 'bg-[color:var(--color-ok)]/10 text-[color:var(--color-ok)]' : 'bg-forest/10 text-forest'}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
    ) },
    { key: 'amount', header: 'Valor', align: 'right', sortValue: r => r.amount, cell: r => <span className="font-bold text-ink tabular-nums">{brl(r.amount)}</span> },
  ];

  const exportSalesCSV = () => {
    const csv = toCSV(filteredRows, [
      { header: 'Data', value: r => formatDateBR(r.date) },
      { header: 'Cliente', value: r => r.client },
      { header: 'Serviço', value: r => r.serviceName + (r.extra ? ` +${r.extra}` : '') },
      { header: 'Pagamento', value: r => r.payment },
      { header: 'Status', value: r => STATUS_LABEL[r.status] ?? r.status },
      { header: 'Valor', value: r => centsToPlain(r.amount) },
    ]);
    downloadCSV('vendas', csv);
  };
  const exportServicesCSV = () => {
    const csv = toCSV(svcStats, [
      { header: 'Serviço', value: s => s.name },
      { header: 'Vendas', value: s => s.count },
      { header: 'Receita', value: s => centsToPlain(s.revenue) },
      { header: 'Ticket médio', value: s => centsToPlain(s.ticket) },
      { header: '% do faturamento', value: s => s.share.toFixed(1) },
    ]);
    downloadCSV('servicos', csv);
  };

  const maxSvcRev = svcStats.length ? svcStats[0].revenue : 1;
  const maxClient = topClients.length ? topClients[0].spent : 1;
  const funnelMax = funnelStages[0]?.value || 1;

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral', icon: <BarChart4 className="h-4 w-4" /> },
    { key: 'sales' as const, label: 'Relatório de vendas', icon: <ReceiptText className="h-4 w-4" /> },
    { key: 'services' as const, label: 'Por serviço', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'clients' as const, label: 'Clientes', icon: <Users className="h-4 w-4" /> },
  ];
  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'month', label: 'Este mês' }, { key: 'year', label: 'Este ano' }, { key: 'all', label: 'Tudo' },
  ];

  const inputCls = 'px-3 py-2 bg-surface-2 border border-line rounded-xl text-xs text-ink focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Período + abas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <Segmented items={tabs} value={activeTab} onChange={setActiveTab} />
        {activeTab !== 'sales' && (
          <div className="flex items-center gap-1 bg-surface border border-line rounded-xl p-1 shadow-soft shrink-0">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all-custom ${period === p.key ? 'bg-[color:var(--color-accent-soft)] text-forest' : 'text-gray-450 hover:text-ink'}`}>{p.label}</button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-[400px]">
        {/* ===================== VISÃO GERAL ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard label={`Faturamento (${label})`} value={brl(curRevenue)} icon={<DollarSign className="h-5 w-5" />} comparison={showCompare ? cmpRev : undefined} spark={revSpark} accent />
              <KpiCard label={`Ticket médio (${label})`} value={brl(curTicket)} icon={<Tag className="h-5 w-5" />} comparison={showCompare ? cmpTkt : undefined} />
              <KpiCard label={`Total de vendas (${label})`} value={String(curCount)} icon={<ReceiptText className="h-5 w-5" />} comparison={showCompare ? cmpQt : undefined} />
            </div>

            {/* Recorrência */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Novos clientes" value={String(recurrence.newClients)} icon={<UserPlus className="h-5 w-5" />} hint={`${recurrence.returning} recorrentes`} />
              <KpiCard label="Taxa de retorno" value={`${recurrence.returnRate.toFixed(0)}%`} icon={<Repeat2 className="h-5 w-5" />} hint="clientes que voltaram" />
              <KpiCard label="Frequência média" value={recurrence.avgDaysBetween ? `${recurrence.avgDaysBetween} dias` : '—'} icon={<Repeat2 className="h-5 w-5" />} hint="entre visitas" />
              <KpiCard label="LTV médio" value={brl(recurrence.ltv)} icon={<Crown className="h-5 w-5" />} hint="por cliente (geral)" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Funil */}
              <div className="card p-5 sm:p-6">
                <SectionHeader title="Funil de conversão" subtitle={`Agendamentos no ${label}`} icon={<Filter className="h-4 w-4" />} />
                <div className="mt-5 space-y-3">
                  {funnelStages.map((st, i) => (
                    <div key={st.label}>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-ink">{st.label}</span>
                        <span className="font-bold text-ink tabular-nums">{st.value} <span className="text-gray-450 font-semibold">({st.pct.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.max(2, (st.value / funnelMax) * 100)}%`, background: i === 3 ? 'var(--color-bad)' : 'var(--color-wine-500)' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top 5 serviços */}
              <div className="card p-5 sm:p-6">
                <SectionHeader title="Top serviços" subtitle={`Receita no ${label}`} icon={<Sparkles className="h-4 w-4" />} />
                <div className="mt-5">
                  <BarChart format={brl} data={svcStats.slice(0, 5).map(s => ({ label: s.name, value: s.revenue, hint: `${s.count}x`, key: s.id }))} emptyLabel="Nenhuma venda no período." />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== RELATÓRIO DE VENDAS ===================== */}
        {activeTab === 'sales' && (
          <div className="space-y-4 animate-fade-up">
            {/* Filtros */}
            <div className="card p-4 no-print">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-450" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente ou serviço…"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-2 border border-line rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-500/20 focus:border-wine-500" />
                </div>
                <button onClick={() => setShowFilters(s => !s)} className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition-colors ${hasActiveFilters ? 'border-forest text-forest bg-forest/5' : 'border-line text-gray-450 hover:bg-surface-2'}`}>
                  <Filter className="h-3.5 w-3.5" /> Filtros{hasActiveFilters ? ' •' : ''}
                </button>
                <ExportMenu onCSV={exportSalesCSV} />
              </div>
              {showFilters && (
                <div className="mt-3 pt-3 border-t border-line grid grid-cols-2 lg:grid-cols-4 gap-2 animate-fade-up">
                  <select value={fService} onChange={e => setFService(e.target.value)} className={inputCls}>
                    <option value="">Todos os serviços</option>
                    {serviceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={fStatus} onChange={e => setFStatus(e.target.value)} className={inputCls}>
                    <option value="">Todos os status</option>
                    <option value="completed">Concluído</option>
                    <option value="confirmed">Confirmado</option>
                  </select>
                  <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} className={inputCls} aria-label="Data inicial" />
                  <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} className={inputCls} aria-label="Data final" />
                  <input inputMode="decimal" value={fMin} onChange={e => setFMin(e.target.value)} placeholder="Valor mín. (R$)" className={inputCls} />
                  <input inputMode="decimal" value={fMax} onChange={e => setFMax(e.target.value)} placeholder="Valor máx. (R$)" className={inputCls} />
                  {hasActiveFilters && (
                    <button onClick={clearFilters} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-gray-450 hover:text-[color:var(--color-bad)] border border-line">
                      <X className="h-3.5 w-3.5" /> Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-line">
                <h3 className="text-base font-bold text-heading">Histórico de vendas</h3>
                <span className="text-[10px] font-bold text-gray-450">{filteredRows.length} de {allRows.length}</span>
              </div>
              <DataTable columns={columns} rows={filteredRows} rowKey={r => r.id} pageSize={25}
                initialSort={{ key: 'date', dir: 'desc' }} emptyLabel="Nenhuma venda encontrada com esses filtros." />
            </div>
          </div>
        )}

        {/* ===================== POR SERVIÇO ===================== */}
        {activeTab === 'services' && (
          <div className="card p-5 sm:p-6 animate-fade-up">
            <SectionHeader title="Análise por serviço" subtitle={`Receita, ticket e participação no ${label}`} icon={<Sparkles className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportServicesCSV} />} />
            <div className="mt-5 space-y-2">
              {svcStats.length === 0 ? <p className="text-xs text-gray-450 py-8 text-center">Nenhuma venda no período.</p> : svcStats.map((s, idx) => (
                <div key={s.id} className="rounded-xl border border-line p-4 hover:bg-surface-2 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink truncate">{idx + 1}. {s.name}</p>
                      <p className="text-[11px] text-gray-450 mt-0.5">{s.count} vendas · ticket {brl(s.ticket)} · {s.share.toFixed(1)}% do faturamento</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline data={s.spark.map(v => v / 100)} />
                      <span className="text-sm font-bold text-ink tabular-nums">{brl(s.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden mt-3">
                    <div className="h-full rounded-full bg-wine-500" style={{ width: `${Math.max(2, (s.revenue / maxSvcRev) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== CLIENTES ===================== */}
        {activeTab === 'clients' && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard label="Clientes no período" value={String(recurrence.newClients + recurrence.returning)} icon={<Users className="h-5 w-5" />} hint={`${recurrence.newClients} novos`} />
              <KpiCard label="Recorrentes" value={String(recurrence.returning)} icon={<Repeat2 className="h-5 w-5" />} />
              <KpiCard label="Taxa de retorno" value={`${recurrence.returnRate.toFixed(0)}%`} icon={<Percent className="h-5 w-5" />} />
              <KpiCard label="LTV médio" value={brl(recurrence.ltv)} icon={<Crown className="h-5 w-5" />} accent />
            </div>
            <div className="card p-5 sm:p-6">
              <SectionHeader title="Melhores clientes" subtitle={`Por valor gasto no ${label}`} icon={<Crown className="h-4 w-4" />} />
              <div className="mt-5 space-y-2">
                {topClients.length === 0 ? <p className="text-xs text-gray-450 py-8 text-center">Nenhuma venda no período.</p> : topClients.map((c, idx) => (
                  <div key={c.key} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2 transition-colors">
                    <span className="h-7 w-7 rounded-full bg-forest/10 text-forest text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink truncate">{c.name}</p>
                      <p className="text-[11px] text-gray-450">{c.visits} visita(s)</p>
                    </div>
                    <div className="flex-1 max-w-[120px] h-1.5 rounded-full bg-surface-2 overflow-hidden hidden sm:block">
                      <div className="h-full rounded-full bg-wine-500" style={{ width: `${Math.max(4, (c.spent / maxClient) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-bold text-ink tabular-nums shrink-0">{brl(c.spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesPanel;
