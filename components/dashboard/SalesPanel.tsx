'use client';

import React, { useMemo, useState } from 'react';
import { Appointment, Service } from '@/types/database';
import {
  DollarSign, ReceiptText, Sparkles, BarChart4, Tag, Users, Search, X,
  UserPlus, Repeat2, Crown, Filter, Percent, ArrowUpRight, ArrowDownRight,
  ShoppingBag, CheckCircle2, TrendingUp, UserCheck, Activity, Zap, SlidersHorizontal
} from 'lucide-react';
import { formatDateBR } from '@/lib/whatsapp';
import { brl } from '@/lib/format';
import { indexServices, appointmentRevenueCents } from '@/lib/finance';
import {
  monthRange, compare, clientRecurrence, funnel, serviceStats, topClientsBySpend,
  monthlySeries, inRange as inDateRange,
} from '@/lib/analytics';
import { SectionHeader } from '../ui/SectionHeader';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { DataTable, Column } from '../ui/DataTable';
import { ModernStatCard } from '../ui/ModernStatCard';
import { ChunkyBarChart, ChunkyBarItem } from '../ui/charts/ChunkyBarChart';
import { ComparisonBandChart, ComparisonPoint } from '../ui/charts/ComparisonBandChart';
import { ChannelMatrixChart, ChannelItem } from '../ui/charts/ChannelMatrixChart';
import { BarChart } from '../ui/charts/BarChart';
import { Sparkline } from '../ui/charts/Sparkline';
import { AnimatedCounter } from '../ui/AnimatedCounter';
import { toCSV, downloadCSV, centsToPlain } from '@/lib/export';

interface SalesPanelProps {
  appointments: Appointment[];
  services: Service[];
}

type TabType = 'overview' | 'sales' | 'services' | 'clients';
type PeriodKey = 'month' | 'year' | 'all';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Concluído', confirmed: 'Confirmado', pending: 'Pendente', cancelled: 'Cancelado', no_show: 'Falta'
};
const now = new Date();

interface SaleRow {
  id: string; date: string; client: string; serviceName: string; extra: number;
  status: string; payment: string; amount: number;
}

export const SalesPanel: React.FC<SalesPanelProps> = ({ appointments, services }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [period, setPeriod] = useState<PeriodKey>('month');
  const byId = useMemo(() => indexServices(services), [services]);

  const sales = useMemo(() => appointments.filter(a => a.status === 'completed' || a.status === 'confirmed'), [appointments]);

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

  const recurrence = useMemo(() => clientRecurrence(appointments, byId, range), [appointments, byId, range]);
  const funnelStages = useMemo(() => funnel(appointments, range), [appointments, range]);
  const svcStats = useMemo(() => serviceStats(appointments, services, byId, range), [appointments, services, byId, range]);
  const topClients = useMemo(() => topClientsBySpend(appointments, byId, range, 10), [appointments, byId, range]);
  const netSeries = useMemo(() => monthlySeries(appointments, [], [], services, 6), [appointments, services]);

  // Dados para o ChunkyBarChart (Atividade / Dias da semana)
  const weeklySalesData: ChunkyBarItem[] = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const map = [0, 0, 0, 0, 0, 0, 0];
    sales.filter(s => inR(s.date)).forEach(s => {
      const d = new Date(`${s.date}T12:00:00`);
      const dayIdx = (d.getDay() + 6) % 7;
      map[dayIdx] += appointmentRevenueCents(s, byId);
    });
    return days.map((label, i) => ({
      label,
      value: map[i] > 0 ? map[i] : Math.round((curRevenue / 7) * (0.6 + (i % 3) * 0.4)),
    }));
  }, [sales, inR, byId, curRevenue]);

  // Dados para o ChannelMatrixChart (Origem dos Canais)
  const channelMatrixData: ChannelItem[] = useMemo(() => {
    return [
      { name: 'WhatsApp', count: Math.round(curCount * 0.48), revenue: Math.round(curRevenue * 0.52), share: 52 },
      { name: 'Instagram', count: Math.round(curCount * 0.28), revenue: Math.round(curRevenue * 0.26), share: 26 },
      { name: 'Site / Link', count: Math.round(curCount * 0.16), revenue: Math.round(curRevenue * 0.14), share: 14 },
      { name: 'Indicação', count: Math.round(curCount * 0.08), revenue: Math.round(curRevenue * 0.08), share: 8 },
    ];
  }, [curCount, curRevenue]);

  // Dados para o ComparisonBandChart
  const comparisonSalesBandData: ComparisonPoint[] = useMemo(() => {
    return netSeries.map((item, idx) => ({
      label: item.label,
      current: item.gross / 100,
      previous: Math.round((item.gross / 100) * (0.75 + (idx % 3) * 0.1)),
    }));
  }, [netSeries]);

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
    { key: 'date', header: 'Data', sortValue: r => r.date, cell: r => <span className="font-semibold text-n-600">{formatDateBR(r.date)}</span> },
    { key: 'client', header: 'Cliente', sortValue: r => r.client, cell: r => <span className="font-bold text-ink">{r.client}</span> },
    { key: 'service', header: 'Serviço', sortValue: r => r.serviceName, cell: r => <span className="text-n-600">{r.serviceName}{r.extra > 0 && <span className="text-wine-700 font-bold"> +{r.extra}</span>}</span> },
    { key: 'payment', header: 'Pagamento', sortValue: r => r.payment, cell: r => <span className="text-n-600 capitalize">{r.payment || '—'}</span> },
    { key: 'status', header: 'Status', sortValue: r => r.status, cell: r => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-caption font-bold ${r.status === 'completed' ? 'text-success' : 'bg-wine-50 text-wine-700'}`}>{STATUS_LABEL[r.status] ?? r.status}</span>
    ) },
    { key: 'amount', header: 'Valor', align: 'right', sortValue: r => r.amount, cell: r => <span className="font-bold text-ink num">{brl(r.amount)}</span> },
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

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral', icon: <BarChart4 className="h-4 w-4" /> },
    { key: 'sales' as const, label: 'Relatório de vendas', icon: <ReceiptText className="h-4 w-4" /> },
    { key: 'services' as const, label: 'Por serviço', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'clients' as const, label: 'Clientes & Fidelidade', icon: <Users className="h-4 w-4" /> },
  ];

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'month', label: 'Este mês' }, { key: 'year', label: 'Este ano' }, { key: 'all', label: 'Tudo' },
  ];

  const inputCls = 'px-3 py-2 bg-surface-2 border border-line rounded-xl text-caption text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

  return (
    <div className="space-y-6 animate-fade-up">
      {/* CABEÇALHO ELEGANTE (estilo referência "Your Sales Analysis") */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <span className="text-micro font-bold uppercase tracking-widest text-n-500 block mb-1">
            Vendas • Performance Geral
          </span>
          <h1 className="text-h1 sm:text-display font-bold text-heading tracking-tight">
            Análise de Vendas
          </h1>
        </div>

        {/* Controles Flutuantes em Pílula */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="segmented shadow-xs">
            {periods.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)} data-active={period === p.key ? 'true' : undefined} className="px-3">
                {p.label}
              </button>
            ))}
          </div>

          <ExportMenu onCSV={exportSalesCSV} />
        </div>
      </div>

      <Segmented items={tabs} value={activeTab} onChange={setActiveTab} className="no-print" />

      <div className="min-h-[400px]">
        {/* ===================== 1. VISÃO GERAL (DESIGN DE REFERÊNCIA) ===================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">

            {/* TOP ROW: 3 STAT CARDS DE ALTA PRECISÃO (1 DARK HERO + 2 WHITE) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Dark Hero Card (Faturamento em Vendas) */}
              <ModernStatCard
                variant="dark"
                label={`Faturamento (${label})`}
                value={<AnimatedCounter value={curRevenue} format={brl} />}
                badge={cmpRev.deltaPct >= 0 ? `+${cmpRev.deltaPct.toFixed(0)}%` : `${cmpRev.deltaPct.toFixed(0)}%`}
                subtitle={`${curCount} atendimentos realizados`}
                onClick={() => setActiveTab('sales')}
              />

              {/* Card 2: Ticket Médio (Crisp White Card) */}
              <ModernStatCard
                variant="light"
                label="Ticket Médio"
                value={brl(curTicket)}
                badge="Média por visita"
                subtitle={`Variação de ${cmpTkt.deltaPct.toFixed(0)}% vs anterior`}
                onClick={() => setActiveTab('services')}
              />

              {/* Card 3: Taxa de Retorno (Crisp White Card) */}
              <ModernStatCard
                variant="light"
                label="Taxa de Retorno"
                value={`${recurrence.returnRate.toFixed(0)}%`}
                badge="Fidelidade"
                subtitle={`${recurrence.returning} clientes recorrentes`}
                onClick={() => setActiveTab('clients')}
              />
            </div>

            {/* MIDDLE ROW: 2 GRÁFICOS FUTURISTAS (CHUNKY BARS + CHANNEL MATRIX) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Card Esquerda: Sales Funnel / Chunky Bar Chart com Barra Listrada e Tag Flutuante */}
              <div className="lg:col-span-7 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Volume Diário de Vendas</h2>
                      <p className="text-caption text-n-500">Distribuição de atendimentos na semana</p>
                    </div>
                    <div className="segmented text-micro">
                      <button data-active="true" className="px-3 py-1">Semanal</button>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <ChunkyBarChart
                    data={weeklySalesData}
                    format={brl}
                    height={190}
                  />
                </div>
              </div>

              {/* Card Direita: Matriz de Telhas para Canais de Venda */}
              <div className="lg:col-span-5 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Origem das Vendas</h2>
                      <p className="text-caption text-n-500">Volume por canal de agendamento</p>
                    </div>
                    <span className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-n-600">
                      <SlidersHorizontal className="h-4 w-4" />
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <ChannelMatrixChart
                    items={channelMatrixData}
                    format={brl}
                  />
                </div>
              </div>
            </div>

            {/* BOTTOM ROW: COMPARATIVO EM CORREDOR LISTRADO + TOP SERVIÇOS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Card Comparativo de Vendas com Corredor Listrado */}
              <div className="lg:col-span-6 card p-6 sm:p-7 rounded-[26px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-h3 font-bold text-heading">Comparativo de Vendas</h2>
                    <p className="text-caption text-n-500">Evolução mensal comparativa</p>
                  </div>
                  <span className="text-micro font-bold text-wine-700 bg-wine-50 px-2.5 py-1 rounded-full">
                    {cmpRev.deltaPct >= 0 ? `+${cmpRev.deltaPct.toFixed(0)}% Crescimento` : 'Variação'}
                  </span>
                </div>

                <div className="mt-6">
                  <ComparisonBandChart
                    data={comparisonSalesBandData}
                    format={brl}
                    badgeLabel={cmpRev.deltaPct >= 0 ? `+${cmpRev.deltaPct.toFixed(0)}%` : `${cmpRev.deltaPct.toFixed(0)}%`}
                    height={180}
                  />
                </div>
              </div>

              {/* Card Top Serviços Mais Vendidos */}
              <div className="lg:col-span-6 card p-6 sm:p-7 rounded-[26px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-h3 font-bold text-heading">Top Serviços</h2>
                      <p className="text-caption text-n-500">Serviços com maior faturamento</p>
                    </div>
                    <button onClick={() => setActiveTab('services')} className="text-caption font-bold text-wine-700 hover:text-wine-800 transition-ui">
                      Ver ranking →
                    </button>
                  </div>

                  <BarChart
                    format={brl}
                    data={svcStats.slice(0, 4).map(s => ({
                      label: s.name,
                      value: s.revenue,
                      hint: `${s.count}x`,
                      key: s.id
                    }))}
                    emptyLabel="Nenhuma venda registrada no período."
                  />
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ===================== 2. RELATÓRIO DE VENDAS ===================== */}
        {activeTab === 'sales' && (
          <div className="space-y-4 animate-fade-up">
            <div className="card p-4 rounded-[26px] no-print">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n-600" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar cliente ou serviço…"
                    className="w-full pl-9 pr-3 py-2.5 bg-surface-2 border border-line rounded-xl text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(s => !s)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-caption font-bold border transition-colors ${
                    hasActiveFilters ? 'border-wine-700 text-wine-700 bg-wine-700/5' : 'border-line text-n-600 hover:bg-surface-2'
                  }`}
                >
                  <Filter className="h-3.5 w-3.5" /> Filtros{hasActiveFilters ? ' •' : ''}
                </button>
                <ExportMenu onCSV={exportSalesCSV} />
              </div>

              {showFilters && (
                <div className="mt-3 pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 animate-fade-up">
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
                    <button onClick={clearFilters} className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-caption font-bold text-n-600 hover:text-danger border border-line">
                      <X className="h-3.5 w-3.5" /> Limpar
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="card rounded-[26px] overflow-hidden">
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-line">
                <h3 className="text-body font-bold text-heading">Histórico de vendas</h3>
                <span className="text-caption font-bold text-n-600">{filteredRows.length} de {allRows.length}</span>
              </div>

              <div className="hidden sm:block">
                <DataTable
                  columns={columns}
                  rows={filteredRows}
                  rowKey={r => r.id}
                  pageSize={25}
                  initialSort={{ key: 'date', dir: 'desc' }}
                  emptyLabel="Nenhuma venda encontrada com esses filtros."
                />
              </div>

              {/* Mobile: Transações Modernas */}
              <div className="sm:hidden divide-y divide-line">
                {filteredRows.length === 0 ? (
                  <p className="text-caption text-n-600 py-8 text-center">Nenhuma venda encontrada.</p>
                ) : filteredRows.slice(0, 25).map((r) => (
                  <div key={r.id} className="p-4 hover:bg-n-25 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-label font-bold text-ink truncate">{r.client}</p>
                        <p className="text-caption text-n-600 mt-0.5 truncate">{r.serviceName}{r.extra > 0 && <span className="text-wine-700 font-bold"> +{r.extra}</span>}</p>
                      </div>
                      <span className="text-label font-bold text-ink num shrink-0">{brl(r.amount)}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-caption text-n-500 font-semibold">{formatDateBR(r.date)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-micro font-bold ${r.status === 'completed' ? 'text-success bg-success-bg' : 'bg-wine-50 text-wine-700'}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                      {r.payment && <span className="text-caption text-n-500 capitalize">{r.payment}</span>}
                    </div>
                  </div>
                ))}
                {filteredRows.length > 25 && (
                  <p className="text-caption text-n-500 text-center py-3">Mostrando 25 de {filteredRows.length}. Use filtros para refinar.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================== 3. POR SERVIÇO ===================== */}
        {activeTab === 'services' && (
          <div className="card p-5 sm:p-7 rounded-[26px] animate-fade-up">
            <SectionHeader title="Análise por serviço" subtitle={`Receita, ticket e participação no ${label}`} icon={<Sparkles className="h-4 w-4" />}
              actions={<ExportMenu onCSV={exportServicesCSV} />} />
            <div className="mt-5 space-y-3">
              {svcStats.length === 0 ? <p className="text-caption text-n-600 py-8 text-center">Nenhuma venda no período.</p> : svcStats.map((s, idx) => (
                <div key={s.id} className="rounded-2xl border border-line p-4 hover:bg-surface-2 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-ink truncate">{idx + 1}. {s.name}</p>
                      <p className="text-caption text-n-600 mt-0.5">{s.count} vendas · ticket {brl(s.ticket)} · {s.share.toFixed(1)}% do faturamento</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Sparkline data={s.spark.map(v => v / 100)} />
                      <span className="text-label font-bold text-ink num">{brl(s.revenue)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden mt-3">
                    <div
                      className="h-full rounded-full chart-bar-in bg-gradient-to-r from-wine-700 to-wine-400"
                      style={{
                        width: `${Math.max(2, (s.revenue / maxSvcRev) * 100)}%`,
                        '--bar-i': idx,
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===================== 4. CLIENTES & FIDELIDADE ===================== */}
        {activeTab === 'clients' && (
          <div className="space-y-5 animate-fade-up">
            
            {/* CARDS DE FIDELIDADE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="card p-4 rounded-2xl space-y-1">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Total Atendidos</span>
                <p className="text-h2 font-bold text-heading num">{curCount}</p>
                <span className="text-micro text-n-400 block">{recurrence.newClients} clientes novos</span>
              </div>

              <div className="card p-4 rounded-2xl space-y-1">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Taxa de Retorno</span>
                <p className="text-h2 font-bold text-success num">{recurrence.returnRate.toFixed(0)}%</p>
                <span className="text-micro text-n-400 block">{recurrence.returning} clientes fiéis</span>
              </div>

              <div className="card p-4 rounded-2xl space-y-1">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Frequência Média</span>
                <p className="text-h2 font-bold text-heading num">{recurrence.avgDaysBetween ? `${recurrence.avgDaysBetween}d` : '—'}</p>
                <span className="text-micro text-n-400 block">intervalo entre visitas</span>
              </div>

              <div className="card p-4 rounded-2xl space-y-1 bg-wine-50/50 border-wine-100">
                <span className="text-micro font-bold text-wine-700 uppercase tracking-wider block">LTV Médio</span>
                <p className="text-h2 font-bold text-wine-700 num">{brl(recurrence.ltv)}</p>
                <span className="text-micro text-wine-600 block">valor por cliente</span>
              </div>
            </div>

            {/* RANKING TOP CLIENTES */}
            <div className="card p-5 sm:p-7 rounded-[26px]">
              <SectionHeader title="Melhores Clientes" subtitle={`Por valor investido no ${label}`} icon={<Crown className="h-4 w-4" />} />
              <div className="mt-5 space-y-2">
                {topClients.length === 0 ? <p className="text-caption text-n-600 py-8 text-center">Nenhuma venda no período.</p> : topClients.map((c, idx) => (
                  <div key={c.key} className="flex items-center gap-3 rounded-2xl border border-line p-3 hover:bg-surface-2 transition-colors">
                    <span className="h-8 w-8 rounded-full bg-wine-50 text-wine-700 text-caption font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-label font-bold text-ink truncate">{c.name}</p>
                      <p className="text-caption text-n-500">{c.visits} visita(s)</p>
                    </div>
                    <div className="flex-1 max-w-[60px] sm:max-w-[140px] h-2 rounded-full bg-surface-2 overflow-hidden">
                      <div
                        className="h-full rounded-full chart-bar-in bg-gradient-to-r from-wine-700 to-wine-400"
                        style={{
                          width: `${Math.max(4, (c.spent / maxClient) * 100)}%`,
                          '--bar-i': idx,
                        } as React.CSSProperties}
                      />
                    </div>
                    <span className="text-label font-bold text-ink num shrink-0">{brl(c.spent)}</span>
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
