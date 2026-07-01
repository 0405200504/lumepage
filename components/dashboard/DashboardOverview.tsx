'use client';

import React from 'react';
import { Appointment, Service } from '@/types/database';
import {
  Calendar, Clock, DollarSign, Users, Sparkles, AlertCircle, ArrowRight,
  CalendarRange, Wallet, Contact, Share2,
} from 'lucide-react';
import Link from 'next/link';
import { statusMeta } from '@/lib/appointments/status';
import { serviceRevenueCents, indexServices } from '@/lib/finance';

interface DashboardOverviewProps {
  professionalName: string;
  brandName: string;
  slug: string;
  appointments: Appointment[];
  services: Service[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  professionalName,
  slug,
  appointments,
  services,
}) => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const activeApps = appointments.filter(a => a.status !== 'cancelled');
  const todayApps = activeApps.filter(a => a.date === todayStr);
  const sortedTodayApps = [...todayApps].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const pendingApps = activeApps.filter(a => a.status === 'pending');
  const uniqueClients = new Set(activeApps.map(a => a.client_whatsapp)).size;
  // Faturamento do mês — MESMA regra da aba Contas (lib/finance).
  // Passa o índice de serviços p/ resolver multi-serviço igual à aba Contas (números batem).
  const monthlyRevenueCents = serviceRevenueCents(appointments, today.getFullYear(), today.getMonth(), indexServices(services));

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const firstName = professionalName?.split(' ')[0] || professionalName;
  const bookingHref = slug ? `/agendar/${slug}` : '#';

  // Ações rápidas (mesmos destinos que já existem no menu) — cara de app.
  const quickActions = [
    { label: 'Agenda', icon: CalendarRange, href: '/dashboard/agenda', external: false },
    { label: 'Contatos', icon: Contact, href: '/dashboard/clients', external: false },
    { label: 'Contas', icon: Wallet, href: '/dashboard/finance', external: false },
    { label: 'Divulgar', icon: Share2, href: bookingHref, external: true },
  ];

  // KPIs com acento de cor suave por métrica (leve, sem poluir).
  const kpis = [
    { label: 'Faturamento do mês', value: formatPrice(monthlyRevenueCents), hint: 'Confirmados + concluídos', icon: DollarSign, tint: 'wine', link: undefined as string | undefined },
    { label: 'Atendimentos hoje', value: todayApps.length, hint: 'Reservados para hoje', icon: Calendar, tint: 'indigo', link: undefined as string | undefined },
    { label: 'Pendentes', value: pendingApps.length, hint: pendingApps.length > 0 ? 'Há pendências' : 'Tudo em dia!', icon: Clock, tint: 'amber', link: pendingApps.length > 0 ? '/dashboard/appointments?status=pending' : undefined },
    { label: 'Total de clientes', value: uniqueClients, hint: 'Na sua carteira', icon: Users, tint: 'emerald', link: undefined as string | undefined },
  ];

  const tintClasses: Record<string, string> = {
    wine: 'bg-wine-700/10 text-wine-700',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    amber: 'bg-amber-500/10 text-amber-600',
    emerald: 'bg-emerald-500/10 text-emerald-600',
  };

  return (
    <div className="space-y-6 sm:space-y-8 select-none animate-fade-up">
      {/* Hero — número-chave grande + ações rápidas circulares (cara de app) */}
      <div data-tour="home-hero" className="surface-wine text-white rounded-[1.75rem] sm:rounded-4xl p-6 sm:p-8 relative overflow-hidden ring-hairline">
        <div className="absolute right-0 -top-6 h-48 w-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase text-white/60 tracking-[0.18em] flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" /> Faturamento do mês
            </span>
            <p className="text-[2rem] sm:text-4xl font-black tracking-tight mt-2 leading-none tabular-nums">{formatPrice(monthlyRevenueCents)}</p>
            <p className="text-xs text-white/60 mt-2">Bem-vinda de volta, {firstName}</p>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="relative z-10 mt-6 grid grid-cols-4 gap-2">
          {quickActions.map(({ label, icon: Icon, href, external }) => (
            <Link
              key={label}
              href={href}
              target={external ? '_blank' : undefined}
              className="tap flex flex-col items-center gap-2 group"
            >
              <span className="h-12 w-12 sm:h-13 sm:w-13 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/20 transition-colors">
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-[10px] sm:text-[11px] font-semibold text-white/85 text-center leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs — cards arredondados, 2 colunas no mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const body = (
            <>
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${tintClasses[kpi.tint]}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {kpi.link && <ArrowRight className="h-4 w-4 text-gray-450" />}
              </div>
              <p className="text-xl sm:text-2xl font-black text-ink leading-none mt-4 tabular-nums">{kpi.value}</p>
              <span className="text-[11px] font-bold text-gray-450 mt-1.5 block">{kpi.label}</span>
              <span className="text-[10px] text-gray-450 font-medium flex items-center gap-1 mt-0.5">
                {kpi.link && <AlertCircle className="h-3 w-3 text-wine-500" />}{kpi.hint}
              </span>
            </>
          );
          return kpi.link ? (
            <Link key={kpi.label} href={kpi.link} className="card-elevated p-4 sm:p-5 rounded-3xl hover:-translate-y-0.5">{body}</Link>
          ) : (
            <div key={kpi.label} className="card-elevated p-4 sm:p-5 rounded-3xl">{body}</div>
          );
        })}
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Atendimentos de Hoje */}
        <div className="card p-5 sm:p-6 rounded-3xl lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-ink tracking-tight">Atendimentos de hoje</h3>
              <p className="text-xs text-gray-450 mt-0.5">Sua agenda cronológica para hoje.</p>
            </div>
            <Link href="/dashboard/agenda" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1 shrink-0">
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {sortedTodayApps.length > 0 ? (
              sortedTodayApps.map((app) => {
                const m = statusMeta(app.status);
                return (
                  <Link
                    key={app.id}
                    href="/dashboard/appointments"
                    className="tap flex items-center gap-3 bg-surface-2/60 hover:bg-surface-2 border border-gray-150 rounded-2xl p-3 transition-colors"
                  >
                    <span className={`h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center bg-wine-700/8 text-wine-700 font-black text-xs tabular-nums`}>
                      {app.start_time.substring(0, 5)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-ink truncate">{app.client_name}</p>
                      <p className="text-xs text-gray-450 truncate">{app.service?.name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.badge}`}>{m.label}</span>
                  </Link>
                );
              })
            ) : (
              <div className="text-center py-10 border border-dashed border-gray-250 rounded-2xl">
                <p className="text-xs text-gray-450">Nenhum agendamento marcado para hoje.</p>
                <Link href={bookingHref} target="_blank" className="mt-3 inline-block text-xs font-bold text-wine-700 hover:underline">
                  Abrir link de agendamento &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Serviços */}
        <div className="card p-5 sm:p-6 rounded-3xl space-y-5">
          <div>
            <h3 className="text-base font-black text-ink tracking-tight">Seus serviços</h3>
            <p className="text-xs text-gray-450 mt-0.5">Preços e duração cadastrados.</p>
          </div>

          <div className="divide-y divide-gray-150 max-h-[300px] overflow-y-auto scroll-touch -mx-1 px-1">
            {services.length > 0 ? services.map((service) => (
              <div key={service.id} className="py-3 flex justify-between items-center gap-3 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-ink truncate">{service.name}</p>
                  <p className="text-[10px] text-gray-450 mt-0.5">{service.duration_minutes} minutos</p>
                </div>
                <span className="font-black text-ink shrink-0 tabular-nums">{formatPrice(service.price_cents)}</span>
              </div>
            )) : (
              <p className="text-xs text-gray-450 py-6 text-center">Nenhum serviço cadastrado ainda.</p>
            )}
          </div>

          <Link href="/dashboard/services" className="block text-center w-full py-2.5 bg-cream hover:bg-sand text-xs font-bold text-wine-700 rounded-xl border border-gray-150 transition-colors">
            Gerenciar serviços
          </Link>
        </div>
      </div>
    </div>
  );
};
export default DashboardOverview;
