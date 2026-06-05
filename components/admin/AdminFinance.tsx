'use client';

import React from 'react';
import Link from 'next/link';
import { DollarSign, TrendingUp, Receipt, Tag, ArrowUpCircle, ArrowDownCircle, BarChart3 } from 'lucide-react';
import { ProfMetric, MonthPoint, moneyBR } from '@/lib/admin';

interface Totals {
  totalRevenue: number; monthRevenue: number; avgTicket: number;
  billableCount: number; manualIncome: number; manualExpense: number;
}

export const AdminFinance: React.FC<{ totals: Totals; metrics: ProfMetric[]; series: MonthPoint[] }> = ({ totals, metrics, series }) => {
  const maxRevenue = Math.max(1, ...metrics.map(m => m.revenueCents));
  const maxSeries = Math.max(1, ...series.map(s => s.revenueCents));

  const kpis = [
    { label: 'Faturamento total', value: moneyBR(totals.totalRevenue), icon: DollarSign },
    { label: 'Faturamento do mês', value: moneyBR(totals.monthRevenue), icon: TrendingUp },
    { label: 'Ticket médio', value: moneyBR(totals.avgTicket), icon: Tag },
    { label: 'Atendimentos faturáveis', value: totals.billableCount, icon: Receipt },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4 sm:p-5">
              <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700 mb-3"><Icon className="h-5 w-5" /></div>
              <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
              <p className="text-lg sm:text-xl font-black text-ink mt-1">{k.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Faturamento por mês */}
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink tracking-tight">Faturamento por mês</h3>
            <BarChart3 className="h-5 w-5 text-wine-400" />
          </div>
          <div className="flex items-end justify-between gap-3 h-44 pt-4">
            {series.map(s => (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[9px] font-black text-wine-700">{(s.revenueCents / 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                <div className="w-full surface-wine rounded-t-lg" style={{ height: `${(s.revenueCents / maxSeries) * 100}%`, minHeight: s.revenueCents ? '6px' : '2px', opacity: s.revenueCents ? 1 : 0.25 }} />
                <span className="text-[10px] font-bold text-gray-450 capitalize">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Movimentação manual */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-black text-ink tracking-tight">Movimentação manual</h3>
          <p className="text-[11px] text-gray-450 -mt-2">Lançamentos registrados pelas profissionais (Contas).</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-gray-150 p-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#226045]"><ArrowUpCircle className="h-4 w-4" /> Entradas</span>
              <span className="font-black text-[#226045]">{moneyBR(totals.manualIncome)}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-150 p-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-[#b23a48]"><ArrowDownCircle className="h-4 w-4" /> Saídas</span>
              <span className="font-black text-[#b23a48]">{moneyBR(totals.manualExpense)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking por profissional */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-black text-ink tracking-tight">Faturamento por profissional</h3>
        {metrics.length === 0 ? (
          <p className="text-xs text-gray-450 py-6 text-center">Nenhuma profissional cadastrada.</p>
        ) : (
          <div className="space-y-3.5">
            {metrics.map(m => (
              <Link key={m.id} href={`/admin/professionals/${m.id}`} className="block group">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-ink truncate">{m.brandName}</span>
                  <span className="font-black text-wine-700 shrink-0">{moneyBR(m.revenueCents)}</span>
                </div>
                <div className="h-2 rounded-full bg-cream overflow-hidden">
                  <div className="h-full rounded-full surface-wine group-hover:opacity-90" style={{ width: `${Math.max(3, (m.revenueCents / maxRevenue) * 100)}%` }} />
                </div>
                <p className="text-[10px] text-gray-450 mt-1">{m.completed} concluídos · {m.total} agend. · {m.clients} clientes</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminFinance;
