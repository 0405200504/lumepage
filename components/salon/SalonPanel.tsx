'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, CalendarDays, LogOut, ArrowRight, Store } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { ProfMetric, moneyBR } from '@/lib/admin';
import { actAsProfessionalAction } from '@/app/actions/salon';

interface SalonPanelProps {
  managerName: string;
  salonName: string;
  metrics: ProfMetric[];
}

export const SalonPanel: React.FC<SalonPanelProps> = ({ managerName, salonName, metrics }) => {
  const router = useRouter();
  const { error, info } = useToast();
  const [openingId, setOpeningId] = useState<string | null>(null);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenueCents, 0);
  const totalAppts = metrics.reduce((s, m) => s + m.total, 0);

  const openPanel = async (id: string) => {
    setOpeningId(id);
    try {
      const res = await actAsProfessionalAction(id);
      if (res.success) { info('Abrindo painel...', 'Você está gerenciando esta profissional.'); router.push('/dashboard'); }
      else { error('Falha', res.error || 'Não foi possível abrir o painel.'); setOpeningId(null); }
    } catch { error('Erro', 'Tente novamente.'); setOpeningId(null); }
  };

  const logout = async () => {
    const { logoutAction } = await import('@/app/actions/professional');
    await logoutAction();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-cream">
      {/* Top bar */}
      <header className="surface-wine text-white">
        <div className="max-w-6xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LumeLogo variant="light" className="h-7" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-[0.2em] text-white/55 border-l border-white/20 pl-3">Gerência de Salão</span>
          </div>
          <button onClick={logout} className="inline-flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition-colors">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-8 animate-fade-up">
        {/* Cabeçalho do salão */}
        <div>
          <div className="flex items-center gap-2 text-wine-600 text-[11px] font-black uppercase tracking-widest"><Store className="h-3.5 w-3.5" /> {salonName}</div>
          <h1 className="text-2xl md:text-3xl font-black text-forest tracking-tight mt-1">Olá, {managerName}!</h1>
          <p className="text-xs text-gray-450 mt-1">Gerencie os painéis das profissionais do seu salão em um só lugar.</p>
        </div>

        {/* KPIs do salão */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Profissionais', value: metrics.length, icon: Users },
            { label: 'Faturamento total', value: moneyBR(totalRevenue), icon: DollarSign },
            { label: 'Agendamentos', value: totalAppts, icon: CalendarDays },
          ].map((k) => {
            const Icon = k.icon;
            return (
              <div key={k.label} className="card p-5">
                <div className="inline-flex p-2.5 rounded-2xl bg-wine-700/8 text-wine-700 mb-3"><Icon className="h-5 w-5" /></div>
                <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{k.label}</p>
                <p className="text-xl font-black text-ink mt-1">{k.value}</p>
              </div>
            );
          })}
        </div>

        {/* Lista de profissionais */}
        <div>
          <h2 className="text-base font-black text-ink tracking-tight mb-3">Profissionais do salão</h2>
          {metrics.length === 0 ? (
            <div className="card p-10 text-center">
              <Users className="h-8 w-8 text-wine-200 mx-auto" />
              <p className="text-sm text-gray-450 mt-3">Nenhuma profissional vinculada a este salão ainda.</p>
              <p className="text-xs text-gray-450/70 mt-1">Peça ao administrador da Lume para vincular as profissionais.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m) => (
                <div key={m.id} className="card p-5 flex flex-col">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl surface-wine text-white flex items-center justify-center font-black">{m.brandName.substring(0, 2).toUpperCase()}</div>
                    <div className="min-w-0">
                      <p className="font-black text-ink truncate">{m.brandName}</p>
                      <p className="text-[11px] text-gray-450 truncate">{m.name}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                    <div><p className="text-sm font-black text-forest">{m.total}</p><p className="text-[9px] text-gray-450 uppercase font-bold">Agend.</p></div>
                    <div><p className="text-sm font-black text-forest">{m.clients}</p><p className="text-[9px] text-gray-450 uppercase font-bold">Clientes</p></div>
                    <div><p className="text-sm font-black text-forest">{moneyBR(m.revenueCents).replace('R$', '').trim()}</p><p className="text-[9px] text-gray-450 uppercase font-bold">Fatur.</p></div>
                  </div>
                  <button onClick={() => openPanel(m.id)} disabled={openingId === m.id}
                    className="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 surface-wine text-white text-xs font-bold rounded-2xl shadow-soft hover:opacity-95 transition-all-custom disabled:opacity-60">
                    {openingId === m.id ? 'Abrindo...' : <>Abrir painel <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
export default SalonPanel;
