'use client';

import React from 'react';
import { BarChart3, UserPlus, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react';
import { ProfMetric, MonthPoint, ServiceCount, moneyBR } from '@/lib/admin';

interface Props {
  apptSeries: MonthPoint[];
  newClients: { key: string; label: string; count: number }[];
  services: ServiceCount[];
  metrics: ProfMetric[];
  kpis: { noShowRate: number; completionRate: number; totalActive: number; totalClients: number };
}

export const AdminReports: React.FC<Props> = ({ apptSeries, newClients, services, metrics, kpis }) => {
  const maxAppt = Math.max(1, ...apptSeries.map(s => s.count));
  const maxNew = Math.max(1, ...newClients.map(s => s.count));
  const maxSvc = Math.max(1, ...services.map(s => s.count));
  const noShowRanking = [...metrics].filter(m => m.noShow > 0).sort((a, b) => b.noShow - a.noShow).slice(0, 6);

  const kpiCards = [
    { label: 'Taxa de comparecimento', value: `${kpis.completionRate}%`, icon: CheckCircle2, accent: 'text-[#226045]', bg: 'bg-[#2e7d5b]/8' },
    { label: 'Taxa de faltas', value: `${kpis.noShowRate}%`, icon: AlertTriangle, accent: 'text-[#b23a48]', bg: 'bg-[#b23a48]/8' },
    { label: 'Agendamentos ativos', value: kpis.totalActive, icon: BarChart3, accent: 'text-wine-700', bg: 'bg-wine-700/8' },
    { label: 'Clientes na rede', value: kpis.totalClients, icon: UserPlus, accent: 'text-wine-700', bg: 'bg-wine-700/8' },
  ];

  return (
    <div className="space-y-6 select-none animate-fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpiCards.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4 sm:p-5">
              <div className={`inline-flex p-2.5 rounded-2xl ${k.bg} ${k.accent} mb-3`}><Icon className="h-5 w-5" /></div>
              <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
              <p className={`text-lg sm:text-xl font-black mt-1 ${k.accent}`}>{k.value}</p>
            </div>
          );
        })}
      </div>

      {/* Agendamentos 12 meses */}
      <div className="card p-6 space-y-5">
        <h3 className="text-base font-black text-ink tracking-tight">Agendamentos (12 meses)</h3>
        <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-48 pt-4">
          {apptSeries.map(s => (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
              <span className="text-[9px] font-black text-wine-700">{s.count}</span>
              <div className="w-full surface-wine rounded-t-lg" style={{ height: `${(s.count / maxAppt) * 100}%`, minHeight: s.count ? '5px' : '2px', opacity: s.count ? 1 : 0.25 }} />
              <span className="text-[9px] font-bold text-gray-450 capitalize">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Novos clientes */}
        <div className="card p-6 space-y-5">
          <h3 className="text-base font-black text-ink tracking-tight">Novos clientes por mês</h3>
          <div className="flex items-end justify-between gap-2 h-40 pt-4">
            {newClients.map(s => (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[9px] font-black text-wine-700">{s.count}</span>
                <div className="w-full bg-wine-300 rounded-t-lg" style={{ height: `${(s.count / maxNew) * 100}%`, minHeight: s.count ? '5px' : '2px', opacity: s.count ? 1 : 0.25 }} />
                <span className="text-[10px] font-bold text-gray-450 capitalize">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Serviços mais populares */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-black text-ink tracking-tight">Serviços mais agendados</h3>
          {services.length === 0 ? (
            <div className="text-center py-10"><Sparkles className="h-7 w-7 text-wine-200 mx-auto" /><p className="text-xs text-gray-450 mt-3">Sem dados ainda.</p></div>
          ) : (
            <div className="space-y-3">
              {services.map(s => (
                <div key={s.name}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="text-ink truncate">{s.name}</span>
                    <span className="text-gray-450 shrink-0">{s.count}x · {moneyBR(s.revenueCents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream overflow-hidden">
                    <div className="h-full rounded-full surface-wine" style={{ width: `${Math.max(5, (s.count / maxSvc) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ranking de faltas */}
      <div className="card p-6 space-y-4">
        <h3 className="text-base font-black text-ink tracking-tight">Profissionais com mais faltas</h3>
        {noShowRanking.length === 0 ? (
          <p className="text-xs text-gray-450 py-4 text-center">Nenhuma falta registrada — excelente! 🎉</p>
        ) : (
          <div className="space-y-2.5">
            {noShowRanking.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-2xl border border-gray-150 p-3">
                <span className="text-sm font-bold text-ink truncate">{m.brandName}</span>
                <span className="text-xs font-bold text-[#b23a48] bg-[#b23a48]/10 rounded-full px-2.5 py-0.5">{m.noShow} falta{m.noShow > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default AdminReports;
