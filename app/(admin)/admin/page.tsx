import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { getDashboardStatsAction } from '@/app/actions/admin';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { Users, Calendar, DollarSign, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';

export default async function AdminDashboardPage() {
  const session = await requireAdmin();
  const res = await getDashboardStatsAction();

  const stats = res.success && res.stats ? res.stats : {
    totalProfessionals: 0,
    activeProfessionals: 0,
    totalAppointments: 0,
    totalRevenueCents: 0
  };

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <LayoutAdmin 
      session={session} 
      title="Painel Administrativo" 
      subtitle="Gerencie o crescimento da plataforma e acompanhe as métricas gerais em tempo real."
    >
      <div className="space-y-8 select-none">
        {/* Banner de Boas Vindas */}
        <div className="bg-[#500b18] text-white p-6 md:p-8 rounded-4xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden border border-[#681624]">
          <div className="space-y-1.5 z-10">
            <h3 className="text-lg md:text-xl font-black tracking-tight">Olá, Administrador!</h3>
            <p className="text-xs text-white/70 max-w-md leading-relaxed">
              Você está na central de controle do Lume Agenda. Monitore novos cadastros e o faturamento total gerado pelas profissionais.
            </p>
          </div>
          <Link
            href="/admin/professionals/new"
            className="px-5 py-3 bg-[#eccbd2] hover:bg-[#e0b4be] text-[#500b18] text-xs font-bold rounded-2xl shadow-md transition-colors cursor-pointer shrink-0 z-10"
          >
            Cadastrar Profissional
          </Link>
          <div className="absolute right-0 top-0 h-40 w-40 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Faturamento */}
          <div className="bg-white border border-[#efe9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Faturamento Gerado</span>
              <p className="text-xl font-black text-gray-900 leading-none">{formatPrice(stats.totalRevenueCents)}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <TrendingUp className="h-3 w-3" />
                <span>+ 12.4% este mês</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>

          {/* Card 2: Agendamentos */}
          <div className="bg-white border border-[#efe9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Total Agendamentos</span>
              <p className="text-xl font-black text-gray-900 leading-none">{stats.totalAppointments}</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                <span>Total acumulado na rede</span>
              </div>
            </div>
            <div className="p-3 bg-[#500b18]/5 text-forest rounded-2xl shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
          </div>

          {/* Card 3: Profissionais */}
          <div className="bg-white border border-[#efe9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Profissionais</span>
              <p className="text-xl font-black text-gray-900 leading-none">{stats.totalProfessionals}</p>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                <span>Cadastradas no sistema</span>
              </div>
            </div>
            <div className="p-3 bg-[#500b18]/5 text-forest rounded-2xl shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </div>

          {/* Card 4: Ativos */}
          <div className="bg-white border border-[#efe9e6] rounded-3xl p-5 shadow-xs flex justify-between items-start">
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Ativas Agora</span>
              <p className="text-xl font-black text-gray-900 leading-none">{stats.activeProfessionals}</p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                <Activity className="h-3 w-3" />
                <span>Em operação regular</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Activity className="h-5 w-5" />
            </div>
          </div>
        </div>
      </div>
    </LayoutAdmin>
  );
}
