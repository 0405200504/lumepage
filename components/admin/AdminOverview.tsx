'use client';

import React from 'react';
import Link from 'next/link';
import {
  DollarSign, Calendar, Users, Activity, Clock, UserPlus, ArrowRight,
  TrendingUp, Crown, BarChart3
} from 'lucide-react';
import { ProfMetric, MonthPoint, StatusCounts, moneyBR } from '@/lib/admin';
import { statusMeta } from '@/lib/appointments/status';
import { formatDateBR } from '@/lib/whatsapp';
import { AppointmentStatus } from '@/types/database';

interface Totals {
  revenueCents: number; monthRevenueCents: number; appointments: number;
  clients: number; professionals: number; activeProfessionals: number; pending: number;
}
interface RecentItem { id: string; client: string; service: string; date: string; time: string; status: AppointmentStatus; professional: string; }

interface AdminOverviewProps {
  adminName: string;
  totals: Totals;
  metrics: ProfMetric[];
  series: MonthPoint[];
  status: StatusCounts;
  recent: RecentItem[];
}

const STATUS_LABEL: Record<keyof StatusCounts, string> = {
  pending: 'Pendentes', confirmed: 'Confirmados', completed: 'Finalizados', cancelled: 'Cancelados', no_show: 'Faltas',
};

export const AdminOverview: React.FC<AdminOverviewProps> = ({ adminName, totals, metrics, series, status, recent }) => {
  const maxCount = Math.max(1, ...series.map(s => s.count));
  const maxRevenue = Math.max(1, ...metrics.map(m => m.revenueCents));
  const totalStatus = Object.values(status).reduce((a, b) => a + b, 0) || 1;

  const kpis = [
    { label: 'Faturamento total', value: moneyBR(totals.revenueCents), icon: DollarSign, hint: 'Toda a rede (confirmados + concluídos)' },
    { label: 'Faturamento do mês', value: moneyBR(totals.monthRevenueCents), icon: TrendingUp, hint: 'Mês atual' },
    { label: 'Agendamentos', value: totals.appointments, icon: Calendar, hint: 'Ativos na rede' },
    { label: 'Profissionais ativas', value: `${totals.activeProfessionals}/${totals.professionals}`, icon: Activity, hint: 'Em operação' },
    { label: 'Clientes na rede', value: totals.clients, icon: Users, hint: 'Total cadastradas' },
    { label: 'Pendentes', value: totals.pending, icon: Clock, hint: 'Aguardando aprovação' },
  ];

  return (
    <div className="space-y-7 select-none animate-fade-up">
      {/* Banner */}
      <div className="surface-wine text-white p-7 md:p-9 rounded-4xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 relative overflow-hidden ring-hairline">
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-black uppercase text-wine-200 tracking-[0.2em]">Central da Plataforma</span>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">Olá, {adminName}!</h3>
          <p className="text-xs text-white/65 max-w-md leading-relaxed">
            Monitore o crescimento da rede Lume: faturamento, agendamentos e desempenho de cada profissional.
          </p>
        </div>
        <Link href="/admin/professionals/new" className="z-10 inline-flex items-center gap-2 px-5 py-3.5 bg-white text-wine-700 text-xs font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom shrink-0">
          <UserPlus className="h-4 w-4" /> Cadastrar Profissional
        </Link>
        <div className="absolute right-0 top-0 h-48 w-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="card p-4 sm:p-5">
              <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700 mb-3"><Icon className="h-5 w-5" /></div>
              <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
              <p className="text-lg sm:text-xl font-black text-ink mt-1 leading-none">{k.value}</p>
              <p className="text-[10px] text-gray-450 font-semibold mt-1.5 hidden sm:block leading-tight">{k.hint}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de agendamentos por mês */}
        <div className="card p-6 lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-ink tracking-tight">Agendamentos por mês</h3>
              <p className="text-xs text-gray-450 mt-0.5">Últimos 6 meses · toda a rede</p>
            </div>
            <BarChart3 className="h-5 w-5 text-wine-400" />
          </div>
          <div className="flex items-end justify-between gap-3 h-44 pt-4">
            {series.map((s) => (
              <div key={s.key} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-black text-wine-700">{s.count}</span>
                <div className="w-full surface-wine rounded-t-lg transition-all" style={{ height: `${(s.count / maxCount) * 100}%`, minHeight: s.count ? '6px' : '2px', opacity: s.count ? 1 : 0.25 }} />
                <span className="text-[10px] font-bold text-gray-450 capitalize">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Distribuição de status */}
        <div className="card p-6 space-y-4">
          <h3 className="text-base font-black text-ink tracking-tight">Distribuição de status</h3>
          <div className="space-y-3">
            {(Object.keys(STATUS_LABEL) as (keyof StatusCounts)[]).map((key) => {
              const m = statusMeta(key as AppointmentStatus);
              const val = status[key];
              const pct = Math.round((val / totalStatus) * 100);
              return (
                <div key={key}>
                  <div className="flex justify-between text-[11px] font-semibold mb-1">
                    <span className="inline-flex items-center gap-1.5 text-ink"><span className={`h-2 w-2 rounded-full ${m.dot}`} />{STATUS_LABEL[key]}</span>
                    <span className="text-gray-450">{val} · {pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-cream overflow-hidden">
                    <div className={`h-full rounded-full ${m.dot}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top profissionais */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink tracking-tight">Top profissionais</h3>
            <Link href="/admin/professionals" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1">Ver todas <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {metrics.length === 0 ? (
            <p className="text-xs text-gray-450 py-6 text-center">Nenhuma profissional cadastrada.</p>
          ) : (
            <div className="space-y-3">
              {metrics.slice(0, 5).map((m, i) => (
                <Link key={m.id} href={`/admin/professionals/${m.id}`} className="block group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-ink truncate flex items-center gap-1.5">
                      {i === 0 && <Crown className="h-3.5 w-3.5 text-wine-500" />}
                      {m.brandName}
                    </span>
                    <span className="font-black text-wine-700 shrink-0">{moneyBR(m.revenueCents)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-cream overflow-hidden">
                    <div className="h-full rounded-full surface-wine group-hover:opacity-90" style={{ width: `${Math.max(4, (m.revenueCents / maxRevenue) * 100)}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-450 mt-1">{m.total} agend. · {m.clients} clientes · {m.noShow} faltas</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Atividade recente */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-ink tracking-tight">Atividade recente</h3>
            <Link href="/admin/appointments" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1">Ver tudo <ArrowRight className="h-3 w-3" /></Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-gray-450 py-6 text-center">Nenhum agendamento ainda.</p>
          ) : (
            <div className="divide-y divide-gray-150">
              {recent.map((r) => {
                const m = statusMeta(r.status);
                return (
                  <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-ink truncate">{r.client} <span className="text-gray-450 font-normal">· {r.professional}</span></p>
                      <p className="text-[10px] text-gray-450 truncate">{r.service} · {formatDateBR(r.date)} {r.time.substring(0, 5)}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.badge}`}>{m.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AdminOverview;
