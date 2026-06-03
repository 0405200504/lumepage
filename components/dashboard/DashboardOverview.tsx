'use client';

import React from 'react';
import { Appointment, Service } from '@/types/database';
import { Calendar, Clock, DollarSign, Users, Sparkles, AlertCircle, Check, Play } from 'lucide-react';
import Link from 'next/link';

interface DashboardOverviewProps {
  professionalName: string;
  brandName: string;
  slug: string;
  appointments: Appointment[];
  services: Service[];
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  professionalName,
  brandName,
  slug,
  appointments,
  services
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Agendamentos ativos (não cancelados)
  const activeApps = appointments.filter(a => a.status !== 'cancelled');
  
  // Agendamentos de hoje
  const todayApps = activeApps.filter(a => a.date === todayStr);
  const sortedTodayApps = [...todayApps].sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Agendamentos pendentes
  const pendingApps = activeApps.filter(a => a.status === 'pending');

  // Clientes Únicas
  const uniqueClients = new Set(activeApps.map(a => a.client_whatsapp)).size;

  // Faturamento Estimado do Mês (confirmados/finalizados)
  const monthlyRevenueCents = activeApps
    .filter(a => ['confirmed', 'completed'].includes(a.status))
    .reduce((sum, a) => sum + (a.service?.price_cents || 0), 0);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <div className="space-y-8 select-none">
      {/* Banner de Boas Vindas */}
      <div className="bg-[#500b18] text-white p-6 md:p-8 rounded-4xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden border border-[#681624]">
        <div className="space-y-1.5 z-10">
          <span className="text-[10px] font-black uppercase text-[#e3bc8f] tracking-widest flex items-center gap-1">
            <Sparkles className="h-3 w.3" />
            <span>Agenda Operacional</span>
          </span>
          <h3 className="text-lg md:text-xl font-black tracking-tight">Bem-vinda, {professionalName}!</h3>
          <p className="text-xs text-white/70 max-w-md leading-relaxed">
            Seu link público está ativo e pronto para receber clientes. Divulgue-o no Instagram para preencher sua agenda.
          </p>
        </div>
        <div className="flex gap-2 shrink-0 z-10 w-full md:w-auto">
          <Link
            href={`/agendar/${slug}`}
            target="_blank"
            className="flex-1 md:flex-none text-center px-5 py-3 bg-[#e3bc8f] hover:bg-[#d5ab79] text-[#500b18] text-xs font-bold rounded-2xl shadow-md transition-colors cursor-pointer"
          >
            Página de Agendamento
          </Link>
        </div>
        <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Faturamento */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Faturamento Confirmado</span>
            <p className="text-xl font-black text-gray-900 leading-none">{formatPrice(monthlyRevenueCents)}</p>
            <span className="text-[10px] text-gray-400 font-semibold block">Soma de serviços aprovados</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-650 rounded-2xl shrink-0">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 2: Atendimentos de Hoje */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Atendimentos de Hoje</span>
            <p className="text-xl font-black text-gray-900 leading-none">{todayApps.length}</p>
            <span className="text-[10px] text-gray-400 font-semibold block">Horários reservados para hoje</span>
          </div>
          <div className="p-3 bg-[#500b18]/5 text-forest rounded-2xl shrink-0">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 3: Pendentes de Aprovação */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Pendentes de Aprovação</span>
            <p className="text-xl font-black text-gray-900 leading-none">{pendingApps.length}</p>
            {pendingApps.length > 0 ? (
              <Link href="/dashboard/appointments?status=pending" className="text-[10px] text-amber-700 hover:underline font-bold flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                <span>Aprovar pendentes</span>
              </Link>
            ) : (
              <span className="text-[10px] text-emerald-650 font-bold block">Tudo em dia!</span>
            )}
          </div>
          <div className="p-3 bg-amber-50 text-amber-650 rounded-2xl shrink-0">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* KPI 4: Clientes Únicos */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
          <div className="space-y-3">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Total de Clientes</span>
            <p className="text-xl font-black text-gray-900 leading-none">{uniqueClients}</p>
            <span className="text-[10px] text-gray-400 font-semibold block">Clientes cadastrados na rede</span>
          </div>
          <div className="p-3 bg-[#500b18]/5 text-forest rounded-2xl shrink-0">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Conteúdo Principal: Agenda de Hoje */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Atendimentos (Timeline) */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-6 shadow-xs lg:col-span-2 space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-800 tracking-tight">Atendimentos de Hoje</h3>
            <p className="text-xs text-gray-450 mt-1">Sua agenda cronológica para hoje.</p>
          </div>

          <div className="space-y-4">
            {sortedTodayApps.length > 0 ? (
              <div className="relative pl-4 border-l border-gray-150 space-y-5">
                {sortedTodayApps.map((app) => {
                  const isPending = app.status === 'pending';
                  return (
                    <div key={app.id} className="relative">
                      {/* Indicador de status circular na linha do tempo */}
                      <div className={`absolute -left-[21px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white ${
                        isPending ? 'bg-amber-500' : 'bg-emerald-600'
                      }`} />
                      
                      <div className="bg-gray-50/50 border border-gray-200 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-forest bg-forest/5 px-2 py-0.5 rounded-md">
                            {app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}
                          </span>
                          <h4 className="font-bold text-sm text-gray-800 mt-2">{app.client_name}</h4>
                          <p className="text-xs text-gray-450 mt-0.5">{app.service?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPending 
                              ? 'bg-amber-50 text-amber-700 border border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          }`}>
                            {isPending ? 'Pendente' : 'Confirmado'}
                          </span>
                          <Link
                            href="/dashboard/appointments"
                            className="p-1.5 hover:bg-gray-150 rounded-lg text-gray-450 hover:text-forest transition-colors"
                          >
                            Ver detalhes
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border-2 border-dashed border-gray-250 rounded-2xl">
                <p className="text-xs text-gray-400">Você não tem agendamentos marcados para hoje.</p>
                <Link
                  href={`/agendar/${slug}`}
                  target="_blank"
                  className="mt-4 inline-block text-xs font-bold text-forest hover:underline"
                >
                  Abrir link de agendamento público &rarr;
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Atalhos e Estatísticas de Serviços */}
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-6 shadow-xs space-y-6">
          <div>
            <h3 className="text-base font-bold text-gray-800 tracking-tight">Seus Serviços</h3>
            <p className="text-xs text-gray-450 mt-1">Preços e duração dos procedimentos cadastrados.</p>
          </div>

          <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto pr-1">
            {services.map((service) => (
              <div key={service.id} className="py-3 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-gray-800">{service.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{service.duration_minutes} minutos</p>
                </div>
                <span className="font-black text-gray-900">{formatPrice(service.price_cents)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <Link
              href="/dashboard/services"
              className="block text-center w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-forest rounded-xl border border-gray-200 transition-colors"
            >
              Gerenciar Serviços
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardOverview;
