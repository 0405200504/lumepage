'use client';

import React, { useMemo, useState } from 'react';
import { Appointment, Service } from '@/types/database';
import {
  TrendingUp, TrendingDown, DollarSign, ReceiptText, Sparkles, Filter, 
  BarChart4, ArrowUpRight, ArrowDownRight, Tag
} from 'lucide-react';
import { formatDateBR } from '@/lib/whatsapp';
import { serviceRevenueCents } from '@/lib/finance';

interface SalesPanelProps {
  appointments: Appointment[];
  services: Service[];
}

type TabType = 'overview' | 'sales' | 'services';

const brl = (cents: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
const idxOf = (y: number, m: number) => y * 12 + m;
const now = new Date();

export const SalesPanel: React.FC<SalesPanelProps> = ({ appointments, services }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  // Consideramos 'venda' um atendimento confirmado ou concluído
  const sales = useMemo(() => appointments.filter(a => a.status === 'completed' || a.status === 'confirmed'), [appointments]);
  
  // Períodos
  const currYear = now.getFullYear();
  const currMonth = now.getMonth();
  const prevDate = new Date(currYear, currMonth - 1, 1);
  const prevYear = prevDate.getFullYear();
  const prevMonth = prevDate.getMonth();
  
  const inMonth = (iso: string, y: number, m: number) => {
    const [yy, mm] = iso.split('-').map(Number);
    return yy === y && mm === m + 1;
  };
  
  const currSales = sales.filter(s => inMonth(s.date, currYear, currMonth));
  const prevSales = sales.filter(s => inMonth(s.date, prevYear, prevMonth));
  
  const currRevenue = serviceRevenueCents(sales, currYear, currMonth);
  const prevRevenue = serviceRevenueCents(sales, prevYear, prevMonth);
  
  const currAvgTicket = currSales.length > 0 ? currRevenue / currSales.length : 0;
  const prevAvgTicket = prevSales.length > 0 ? prevRevenue / prevSales.length : 0;
  
  const revDiff = prevRevenue === 0 ? 100 : ((currRevenue - prevRevenue) / prevRevenue) * 100;
  const tktDiff = prevAvgTicket === 0 ? 100 : ((currAvgTicket - prevAvgTicket) / prevAvgTicket) * 100;
  const qtdDiff = prevSales.length === 0 ? 100 : ((currSales.length - prevSales.length) / prevSales.length) * 100;
  
  // Agrupamento por serviço (Ranking)
  const serviceRanking = useMemo(() => {
    const map: Record<string, { count: number; revenue: number; name: string }> = {};
    sales.forEach(s => {
      const id = s.service_id;
      if (!map[id]) map[id] = { count: 0, revenue: 0, name: s.service?.name || 'Serviço excluído' };
      map[id].count++;
      map[id].revenue += s.service?.price_cents || 0;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);
  
  const maxRev = serviceRanking.length > 0 ? serviceRanking[0].revenue : 1;

  const tabs = [
    { key: 'overview' as const, label: 'Visão geral', icon: BarChart4 },
    { key: 'sales' as const, label: 'Relatório de vendas', icon: ReceiptText },
    { key: 'services' as const, label: 'Relatório de serviços', icon: Sparkles },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-up">
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

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-up">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700"><DollarSign className="h-5 w-5" /></div>
                  {revDiff !== 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${revDiff > 0 ? 'bg-[#2e7d5b]/10 text-[#226045]' : 'bg-[#b23a48]/10 text-[#b23a48]'}`}>
                      {revDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(revDiff).toFixed(1)}% vs mês ant.
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Faturamento (Mês)</p>
                <p className="text-2xl font-black mt-1 text-wine-700">{brl(currRevenue)}</p>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex p-2.5 rounded-2xl bg-blue-500/10 text-blue-600"><Tag className="h-5 w-5" /></div>
                  {tktDiff !== 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tktDiff > 0 ? 'bg-[#2e7d5b]/10 text-[#226045]' : 'bg-[#b23a48]/10 text-[#b23a48]'}`}>
                      {tktDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(tktDiff).toFixed(1)}% vs mês ant.
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Ticket Médio (Mês)</p>
                <p className="text-2xl font-black mt-1 text-blue-600">{brl(currAvgTicket)}</p>
              </div>

              <div className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 text-amber-600"><ReceiptText className="h-5 w-5" /></div>
                  {qtdDiff !== 0 && (
                    <span className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${qtdDiff > 0 ? 'bg-[#2e7d5b]/10 text-[#226045]' : 'bg-[#b23a48]/10 text-[#b23a48]'}`}>
                      {qtdDiff > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {Math.abs(qtdDiff).toFixed(1)}% vs mês ant.
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Total de Vendas (Mês)</p>
                <p className="text-2xl font-black mt-1 text-amber-600">{currSales.length}</p>
              </div>
            </div>
            
            <div className="card p-6">
              <h3 className="text-base font-black text-ink tracking-tight mb-4">Top 5 Serviços (Geral)</h3>
              <div className="space-y-4">
                {serviceRanking.slice(0, 5).map((s, idx) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-sm font-semibold mb-1.5">
                      <span className="text-ink truncate">{idx + 1}. {s.name}</span>
                      <span className="text-ink">{brl(s.revenue)} <span className="text-gray-450 text-[11px]">({s.count}x)</span></span>
                    </div>
                    <div className="h-2 rounded-full bg-cream overflow-hidden">
                      <div className="h-full rounded-full surface-wine" style={{ width: `${Math.max(2, (s.revenue / maxRev) * 100)}%` }} />
                    </div>
                  </div>
                ))}
                {serviceRanking.length === 0 && <p className="text-xs text-gray-450 py-4 text-center">Nenhuma venda registrada ainda.</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="card overflow-hidden animate-fade-up">
            <div className="p-4 border-b border-gray-150 flex items-center justify-between">
              <h3 className="text-base font-black text-ink">Histórico de Vendas</h3>
              <span className="text-[10px] font-bold text-gray-450">{sales.length} registros</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-150 text-left">
                <thead className="bg-cream/60 text-[10px] font-black text-gray-450 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Cliente</th>
                    <th className="px-6 py-4">Serviço</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-sm text-ink">
                  {sales.sort((a,b) => b.date.localeCompare(a.date)).map((sale) => (
                    <tr key={sale.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-600">{formatDateBR(sale.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-ink">{sale.client_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 truncate max-w-[200px]">{sale.service?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          sale.status === 'completed' ? 'bg-[#2e7d5b]/10 text-[#226045]' : 'bg-wine-700/8 text-wine-700'
                        }`}>
                          {sale.status === 'completed' ? 'Concluído' : 'Confirmado'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-black text-[#226045]">
                        {brl(sale.service?.price_cents || 0)}
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-xs text-gray-450">Nenhuma venda encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="card p-6 animate-fade-up">
            <h3 className="text-base font-black text-ink mb-6">Receita por Serviço (Geral)</h3>
            <div className="space-y-5">
              {serviceRanking.map((s, idx) => (
                <div key={s.name}>
                  <div className="flex justify-between text-sm font-semibold mb-1.5">
                    <span className="text-ink truncate">{idx + 1}. {s.name}</span>
                    <span className="text-ink">{brl(s.revenue)} <span className="text-gray-450 text-[11px]">({s.count} vendas)</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-cream overflow-hidden">
                    <div className="h-full rounded-full bg-wine-600" style={{ width: `${Math.max(1, (s.revenue / maxRev) * 100)}%` }} />
                  </div>
                </div>
              ))}
              {serviceRanking.length === 0 && <p className="text-xs text-gray-450 text-center">Nenhum dado disponível.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
