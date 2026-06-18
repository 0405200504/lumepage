'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, Service } from '@/types/database';
import { Calendar, Clock, DollarSign, Users, Sparkles, AlertCircle, ExternalLink, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { statusMeta } from '@/lib/appointments/status';
import { serviceRevenueCents } from '@/lib/finance';

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
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const handleRefresh = () => startRefresh(() => router.refresh());

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const activeApps = appointments.filter(a => a.status !== 'cancelled');
  const todayApps = activeApps.filter(a => a.date === todayStr);
  const sortedTodayApps = [...todayApps].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const pendingApps = activeApps.filter(a => a.status === 'pending');
  const uniqueClients = new Set(activeApps.map(a => a.client_whatsapp)).size;
  // Faturamento do mês — MESMA regra da aba Contas (lib/finance)
  const monthlyRevenueCents = serviceRevenueCents(appointments, today.getFullYear(), today.getMonth());

  const formatPrice = (cents: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

  const bookingHref = slug ? `/agendar/${slug}` : '#';

  const kpis = [
    { label: 'Faturamento do mês', value: formatPrice(monthlyRevenueCents), hint: 'Serviços confirmados + concluídos', icon: DollarSign, link: undefined as string | undefined },
    { label: 'Atendimentos de Hoje', value: todayApps.length, hint: 'Reservados para hoje', icon: Calendar, link: undefined as string | undefined },
    { label: 'Pendentes de Aprovação', value: pendingApps.length, hint: pendingApps.length > 0 ? 'Há pendências' : 'Tudo em dia!', icon: Clock, link: pendingApps.length > 0 ? '/dashboard/appointments?status=pending' : undefined },
    { label: 'Total de Clientes', value: uniqueClients, hint: 'Na sua carteira', icon: Users, link: undefined as string | undefined },
  ];

  return (
    <div className="space-y-8 select-none animate-fade-up">
      {/* Banner de Boas-Vindas */}
      <div className="surface-wine text-white p-7 md:p-9 rounded-4xl flex flex-col md:flex-row justify-between items-start md:items-center gap-5 relative overflow-hidden ring-hairline">
        <div className="space-y-2 z-10">
          <span className="text-[10px] font-black uppercase text-wine-200 tracking-[0.2em] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            <span>Agenda Operacional</span>
          </span>
          <h3 className="text-xl md:text-2xl font-black tracking-tight">Bem-vinda, {professionalName}!</h3>
          <p className="text-xs text-white/65 max-w-md leading-relaxed">
            Seu link público está ativo e pronto para receber clientes. Divulgue-o no Instagram para preencher sua agenda.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 z-10 w-full md:w-auto">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Atualizar dados sem recarregar a página"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white/10 text-white text-xs font-bold rounded-2xl border border-white/20 hover:bg-white/15 transition-all-custom disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando…' : 'Atualizar'}
          </button>
          <Link
            href={bookingHref}
            target="_blank"
            className="flex-1 md:flex-none text-center inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-wine-700 text-xs font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom"
          >
            <ExternalLink className="h-4 w-4" />
            Página de Agendamento
          </Link>
        </div>
        <div className="absolute right-0 top-0 h-48 w-48 bg-white/5 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const body = (
            <>
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{kpi.label}</span>
                <p className="text-2xl font-black text-ink leading-none">{kpi.value}</p>
                <span className="text-[10px] text-gray-450 font-semibold flex items-center gap-1">
                  {kpi.link && <AlertCircle className="h-3 w-3 text-wine-500" />}{kpi.hint}
                </span>
              </div>
              <div className="p-3 bg-wine-700/6 text-wine-700 rounded-2xl shrink-0">
                <Icon className="h-5 w-5" />
              </div>
            </>
          );
          return kpi.link ? (
            <Link key={kpi.label} href={kpi.link} className="card p-5 flex justify-between items-start hover:shadow-glow transition-all-custom">{body}</Link>
          ) : (
            <div key={kpi.label} className="card p-5 flex justify-between items-start">{body}</div>
          );
        })}
      </div>

      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline de Hoje */}
        <div className="card p-6 lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-ink tracking-tight">Atendimentos de Hoje</h3>
              <p className="text-xs text-gray-450 mt-1">Sua agenda cronológica para hoje.</p>
            </div>
            <Link href="/dashboard/agenda" className="text-[11px] font-bold text-wine-700 hover:underline flex items-center gap-1">
              Ver agenda <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {sortedTodayApps.length > 0 ? (
              <div className="relative pl-4 border-l border-gray-150 space-y-5">
                {sortedTodayApps.map((app) => {
                  const m = statusMeta(app.status);
                  return (
                    <div key={app.id} className="relative">
                      <div className={`absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-paper ${m.dot}`} />
                      <div className="bg-cream/60 border border-gray-150 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-wine-700 bg-wine-700/8 px-2 py-0.5 rounded-md">
                            {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}
                          </span>
                          <h4 className="font-bold text-sm text-ink mt-2">{app.client_name}</h4>
                          <p className="text-xs text-gray-450 mt-0.5">{app.service?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badge}`}>{m.label}</span>
                          <Link href="/dashboard/appointments" className="text-[11px] font-bold text-gray-450 hover:text-wine-700 transition-colors">
                            Detalhes
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-250 rounded-2xl">
                <p className="text-xs text-gray-450">Você não tem agendamentos marcados para hoje.</p>
                <Link href={bookingHref} target="_blank" className="mt-4 inline-block text-xs font-bold text-wine-700 hover:underline">
                  Abrir link de agendamento público &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Serviços */}
        <div className="card p-6 space-y-6">
          <div>
            <h3 className="text-base font-black text-ink tracking-tight">Seus Serviços</h3>
            <p className="text-xs text-gray-450 mt-1">Preços e duração cadastrados.</p>
          </div>

          <div className="divide-y divide-gray-150 max-h-[300px] overflow-y-auto pr-1">
            {services.length > 0 ? services.map((service) => (
              <div key={service.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-ink">{service.name}</p>
                  <p className="text-[10px] text-gray-450 mt-0.5">{service.duration_minutes} minutos</p>
                </div>
                <span className="font-black text-ink">{formatPrice(service.price_cents)}</span>
              </div>
            )) : (
              <p className="text-xs text-gray-450 py-6 text-center">Nenhum serviço cadastrado ainda.</p>
            )}
          </div>

          <Link href="/dashboard/services" className="block text-center w-full py-2.5 bg-cream hover:bg-sand text-xs font-bold text-wine-700 rounded-xl border border-gray-150 transition-colors">
            Gerenciar Serviços
          </Link>
        </div>
      </div>
    </div>
  );
};
export default DashboardOverview;
