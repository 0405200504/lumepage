'use client';

import React, { useMemo, useState } from 'react';
import { Appointment, Service } from '@/types/database';
import {
  DollarSign, Receipt, Sparkles, Users, Search, Filter,
  ArrowUpRight, ArrowDownLeft, CheckCircle2, ChevronRight, User
} from 'lucide-react';
import { formatDateBR } from '@/lib/whatsapp';
import { brl } from '@/lib/format';
import { indexServices, appointmentRevenueCents } from '@/lib/finance';
import {
  monthRange, compare, clientRecurrence, serviceStats, topClientsBySpend,
  monthlySeries, inRange as inDateRange,
} from '@/lib/analytics';
import { Segmented } from '../ui/Segmented';
import { ExportMenu } from '../ui/ExportMenu';
import { DataTable, Column } from '../ui/DataTable';
import { TechChart } from '../ui/charts/TechChart';
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

  const cmpRev = compare(curRevenue, prevRevenue);

  const recurrence = useMemo(() => clientRecurrence(appointments, byId, range), [appointments, byId, range]);
  const svcStats = useMemo(() => serviceStats(appointments, services, byId, range), [appointments, services, byId, range]);
  const topClients = useMemo(() => topClientsBySpend(appointments, byId, range, 10), [appointments, byId, range]);
  const netSeries = useMemo(() => monthlySeries(appointments, [], [], services, 6), [appointments, services]);

  const [search, setSearch] = useState('');
  const [fService, setFService] = useState('');

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
    return allRows.filter(r => {
      if (q && !(`${r.client} ${r.serviceName}`.toLowerCase().includes(q))) return false;
      if (fService && r.serviceName !== fService) return false;
      return true;
    });
  }, [allRows, search, fService]);

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

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral' },
    { key: 'sales' as const, label: 'Histórico' },
    { key: 'services' as const, label: 'Serviços' },
    { key: 'clients' as const, label: 'Clientes' },
  ];

  const periods: { key: PeriodKey; label: string }[] = [
    { key: 'month', label: 'Este mês' }, { key: 'year', label: 'Este ano' }, { key: 'all', label: 'Tudo' },
  ];

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* 1. SELETOR DE PERÍODO / CABEÇALHO BANCÁRIO */}
      <div className="flex items-center justify-between no-print pt-1">
        <div className="flex items-center gap-1 bg-surface px-2.5 py-1 rounded-full border border-line shadow-xs">
          {periods.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1 rounded-full text-caption font-bold transition-colors ${
                period === p.key ? 'bg-wine-700 text-white shadow-xs' : 'text-n-600 hover:text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <ExportMenu onCSV={exportSalesCSV} />
      </div>

      {/* 2. ABAS NAVEGAÇÃO LIMPA */}
      <div className="no-print">
        <Segmented items={tabs} value={activeTab} onChange={setActiveTab} />
      </div>

      {/* ===================== TAB 1: VISÃO GERAL (INTERFACE BANCO) ===================== */}
      {activeTab === 'overview' && (
        <div className="space-y-4 animate-fade-up">
          
          {/* HERO BANCO: Faturamento Total */}
          <div className="bg-surface rounded-2xl p-6 sm:p-7 border border-line shadow-xs space-y-4">
            <div>
              <span className="text-caption font-semibold text-n-500 block">
                Total de vendas ({label})
              </span>
              <div className="flex items-baseline gap-3 mt-1">
                <p className="text-display font-bold num text-heading tracking-tight leading-none">
                  <AnimatedCounter value={curRevenue} format={brl} />
                </p>
                {period !== 'all' && (
                  <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${cmpRev.deltaPct >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'}`}>
                    {cmpRev.deltaPct >= 0 ? `+${cmpRev.deltaPct.toFixed(0)}%` : `${cmpRev.deltaPct.toFixed(0)}%`}
                  </span>
                )}
              </div>
            </div>

            {/* CHIPS RESUMO: Ticket Médio & Volume */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-line">
              <div className="p-3 rounded-xl bg-surface-2/60">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Ticket médio</span>
                <span className="text-body font-bold text-heading num">{brl(curTicket)}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-2/60">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Atendimentos</span>
                <span className="text-body font-bold text-heading num">{curCount}</span>
              </div>

              <div className="p-3 rounded-xl bg-surface-2/60 col-span-2 sm:col-span-1">
                <span className="text-micro font-bold text-n-500 uppercase tracking-wider block">Taxa de retorno</span>
                <span className="text-body font-bold text-wine-700 num">{recurrence.returnRate.toFixed(0)}% fiéis</span>
              </div>
            </div>
          </div>

          {/* GRÁFICO DE VENDAS SUAVE */}
          <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-bold text-heading">Evolução de vendas</h3>
                <p className="text-caption text-n-500">Histórico de receita</p>
              </div>
              <span className="text-caption font-bold text-wine-700 bg-wine-50 px-2.5 py-1 rounded-full">
                {curCount} atendimentos
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
                { name: 'Receita', color: 'var(--color-wine-700)', values: netSeries.map(p => p.gross / 100) },
              ]}
            />
          </div>

          {/* FEED DE ÚLTIMAS VENDAS */}
          <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-line flex items-center justify-between">
              <h3 className="text-body font-bold text-heading">Últimas vendas</h3>
              <button
                onClick={() => setActiveTab('sales')}
                className="text-caption font-bold text-wine-700 hover:text-wine-800"
              >
                Ver histórico completo →
              </button>
            </div>

            <div className="divide-y divide-line">
              {allRows.length === 0 ? (
                <p className="text-caption text-n-500 py-8 text-center">Nenhuma venda registrada no período.</p>
              ) : (
                allRows.slice(0, 5).map((row) => (
                  <div key={row.id} className="p-4 flex items-center justify-between gap-3 hover:bg-n-25 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-wine-50 text-wine-700 flex items-center justify-center font-bold text-caption shrink-0">
                        {row.client.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-body-sm font-bold text-heading truncate">{row.client}</p>
                        <p className="text-caption text-n-500 truncate">
                          {row.serviceName} · {formatDateBR(row.date)}
                        </p>
                      </div>
                    </div>
                    <span className="text-body-sm font-bold text-heading num shrink-0">
                      {brl(row.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* ===================== TAB 2: HISTÓRICO COMPLETO ===================== */}
      {activeTab === 'sales' && (
        <div className="bg-surface rounded-2xl border border-line shadow-xs overflow-hidden animate-fade-up">
          <div className="p-4 border-b border-line">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-n-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente ou serviço..."
                className="w-full pl-9 pr-3 py-2 bg-surface-2 rounded-xl text-body-sm text-heading border border-line focus-visible:outline-2 focus-visible:outline-wine-700"
              />
            </div>
          </div>

          <div className="divide-y divide-line max-h-[600px] overflow-y-auto">
            {filteredRows.length === 0 ? (
              <p className="text-caption text-n-500 py-12 text-center">Nenhuma venda encontrada.</p>
            ) : (
              filteredRows.map((row) => (
                <div key={row.id} className="p-4 flex items-center justify-between gap-3 hover:bg-n-25 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-wine-50 text-wine-700 flex items-center justify-center font-bold text-caption shrink-0">
                      {row.client.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-body-sm font-bold text-heading truncate">{row.client}</p>
                      <p className="text-caption text-n-500 truncate">
                        {row.serviceName} · {formatDateBR(row.date)}
                        {row.payment && <span className="capitalize"> · {row.payment}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-body-sm font-bold text-heading num block">{brl(row.amount)}</span>
                    <span className="text-micro font-bold text-success capitalize">{STATUS_LABEL[row.status] ?? row.status}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 3: SERVIÇOS MAIS VENDIDOS ===================== */}
      {activeTab === 'services' && (
        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs space-y-4 animate-fade-up">
          <h3 className="text-body font-bold text-heading">Serviços mais vendidos</h3>
          <div className="divide-y divide-line">
            {svcStats.length === 0 ? (
              <p className="text-caption text-n-500 py-8 text-center">Nenhuma venda no período.</p>
            ) : (
              svcStats.map((s, idx) => (
                <div key={s.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-caption font-bold text-n-400">{idx + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-body-sm font-bold text-heading truncate">{s.name}</p>
                      <p className="text-caption text-n-500">{s.count} vendas · {s.share.toFixed(0)}% da receita</p>
                    </div>
                  </div>
                  <span className="text-body-sm font-bold text-heading num shrink-0">{brl(s.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB 4: CLIENTES & FIDELIDADE ===================== */}
      {activeTab === 'clients' && (
        <div className="bg-surface rounded-2xl p-5 sm:p-6 border border-line shadow-xs space-y-4 animate-fade-up">
          <h3 className="text-body font-bold text-heading">Melhores clientes por valor investido</h3>
          <div className="divide-y divide-line">
            {topClients.length === 0 ? (
              <p className="text-caption text-n-500 py-8 text-center">Nenhum cliente registrado no período.</p>
            ) : (
              topClients.map((c, idx) => (
                <div key={c.key} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 text-caption font-bold text-n-400">{idx + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-body-sm font-bold text-heading truncate">{c.name}</p>
                      <p className="text-caption text-n-500">{c.visits} visita(s)</p>
                    </div>
                  </div>
                  <span className="text-body-sm font-bold text-heading num shrink-0">{brl(c.spent)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default SalesPanel;
