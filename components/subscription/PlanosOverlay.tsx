'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ShieldCheck, Star, Zap, LogOut, Crown, TrendingUp } from 'lucide-react';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { useToast } from '@/components/ui/Toast';
import { logoutAction } from '@/app/actions/professional';

export function PlanosOverlay() {
  const router = useRouter();
  const { error } = useToast();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleLogout = async () => {
    try {
      await logoutAction();
      router.push('/login');
    } catch {
      error('Erro', 'Não foi possível sair da conta.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center px-4 py-12 select-none overflow-y-auto bg-black/40 backdrop-blur-md"
      style={{
        // Aquele gradiente suave para ajudar na leitura, mas com fundo transparente/blur
        backgroundImage: 'radial-gradient(120% 90% at 85% -10%, rgba(140,36,56,0.3) 0%, transparent 55%), radial-gradient(110% 90% at 0% 110%, rgba(80,11,24,0.4) 0%, transparent 50%)'
      }}
    >
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-0 h-96 w-96 rounded-full bg-wine-700/20 blur-3xl -translate-y-1/2" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(80% 80% at 50% 50%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(80% 80% at 50% 50%, black, transparent)',
        }}
      />

      <div className="max-w-6xl w-full z-10 animate-fade-up flex flex-col">
        
        {/* Header */}
        <div className="flex justify-end items-center mb-6">
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
            <LogOut className="h-4 w-4" />
            <span>Sair da conta</span>
          </button>
        </div>

        {/* Titulo */}
        <div className="text-center mb-10 mt-4">
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-wine-500 text-white border border-wine-400/50 rounded-full text-xs font-black uppercase tracking-widest mb-6 shadow-lg shadow-wine-500/20">
            <ShieldCheck className="h-4 w-4" />
            <span>Seu teste grátis acabou</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-4 uppercase">
            Assine a Lume e continue crescendo
          </h1>
          <p className="text-sm text-white/80 max-w-2xl mx-auto leading-relaxed">
            Não perca os agendamentos, o histórico de clientes e o painel financeiro.
            Escolha o plano que faz mais sentido para o seu momento e desbloqueie o acesso total.
          </p>
        </div>

        {/* Toggle Mensal/Anual */}
        <div className="flex justify-center mb-12">
          <div className="bg-black/40 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex items-center shadow-inner relative">
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-bold transition-colors ${!isAnnual ? 'text-white' : 'text-white/50 hover:text-white/80'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative z-10 px-6 py-2.5 rounded-full text-xs font-bold transition-colors flex items-center gap-2 ${isAnnual ? 'text-forest' : 'text-white/50 hover:text-white/80'}`}
            >
              Anual <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider ${isAnnual ? 'bg-forest/20 text-forest' : 'bg-lima text-forest'}`}>-20%</span>
            </button>
            {/* Pill Background animado */}
            <div 
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-300 ease-out"
              style={{ 
                left: isAnnual ? 'calc(50% + 3px)' : '6px',
                background: isAnnual ? '#c4f000' : 'rgba(255,255,255,0.15)', // lima no anual, branco leve no mensal
              }} 
            />
          </div>
        </div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* 1. START */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 p-8 rounded-3xl flex flex-col justify-between hover:bg-white/[0.06] transition-colors relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-white/10 rounded-lg"><TrendingUp className="h-4 w-4 text-white" /></div>
                <h3 className="text-xl font-bold text-white">Start</h3>
              </div>
              <p className="text-xs text-white/60 mb-6 min-h[40px]">Sua vitrine profissional começa aqui. Pare de agendar no papel.</p>
              
              <div className="mb-8">
                {isAnnual && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white/40 line-through">R$ 598,80</span>
                    <span className="text-[10px] font-bold text-lima bg-lima/10 px-2 py-0.5 rounded-full">Economize R$ 120</span>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <span className="text-sm font-bold text-white/60 mb-1">R$</span>
                  <span className="text-4xl font-black text-white">{isAnnual ? '39' : '49'}</span>
                  <span className="text-sm font-bold text-white/60 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-white/50 block mt-1">Cobrado R$ 478,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-white/90 pb-2 border-b border-white/10">O que está incluso:</div>
                <ul className="space-y-3.5">
                  {[
                    '1 profissional',
                    'Página pública (seu link para Instagram)',
                    'Agenda com horários automáticos',
                    'Serviços ilimitados',
                    'Lista de clientes e contatos',
                    'Lembretes automáticos por WhatsApp',
                    'Financeiro básico'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <a
              href={isAnnual ? "https://pay.hub.la/AgzZbpcOki2gtS9voVrq" : "https://pay.hub.la/W0OcCJoqELUskNPEhbdL"}
              target="_blank"
              rel="noopener noreferrer"
              className="tap w-full py-3.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              Assinar Start
            </a>
          </div>

          {/* 2. PRO (Destaque) */}
          <div className="bg-gradient-to-b from-wine-700/80 to-wine-900/80 backdrop-blur-md border-2 border-wine-500/50 p-8 rounded-3xl flex flex-col justify-between shadow-2xl shadow-wine-900/50 transform md:-translate-y-4 relative">
            
            <div className="absolute -top-4 inset-x-0 flex justify-center">
              <span className="bg-lima text-forest px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                <Star className="h-3.5 w-3.5" />
                Mais Vendido
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-lima/20 rounded-lg"><Zap className="h-4 w-4 text-lima" /></div>
                <h3 className="text-xl font-bold text-white">Pro</h3>
              </div>
              <p className="text-xs text-white/80 mb-6 min-h-[40px]">Para quem vive de agenda cheia e quer automatizar tudo.</p>
              
              <div className="mb-8">
                {isAnnual && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white/60 line-through">R$ 1.198,80</span>
                    <span className="text-[10px] font-bold text-lima bg-lima/10 px-2 py-0.5 rounded-full">Economize R$ 240</span>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <span className="text-sm font-bold text-white/80 mb-1">R$</span>
                  <span className="text-4xl font-black text-white">{isAnnual ? '79' : '99'}</span>
                  <span className="text-sm font-bold text-white/80 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-white/60 block mt-1">Cobrado R$ 958,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-white pb-2 border-b border-white/20">Tudo do Start, e mais:</div>
                <ul className="space-y-3.5">
                  {[
                    'Até 3 profissionais na agenda',
                    'Lista de espera automática (encaixes)',
                    'Bloqueios de horários e folgas',
                    'Módulo de Vendas',
                    'Financeiro completo',
                    'Central de Conversas com clientes',
                    'Notificações via WhatsApp'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-white/90">
                      <CheckCircle2 className="h-4 w-4 text-lima shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <a
              href={isAnnual ? "https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok" : "https://pay.hub.la/Ijgtp0VTZ3QXmyCvAPKe"}
              target="_blank"
              rel="noopener noreferrer"
              className="tap w-full py-4 bg-lima hover:bg-lima-hover text-forest text-sm font-black rounded-2xl transition-all shadow-xl shadow-lima/20 flex items-center justify-center gap-2"
            >
              Assinar Pro
            </a>
          </div>

          {/* 3. PREMIUM */}
          <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 p-8 rounded-3xl flex flex-col justify-between hover:bg-white/[0.06] transition-colors relative">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-amber-500/20 rounded-lg"><Crown className="h-4 w-4 text-amber-400" /></div>
                <h3 className="text-xl font-bold text-white">Premium</h3>
              </div>
              <p className="text-xs text-white/60 mb-6 min-h-[40px]">Gestão completa para estúdios e clínicas escalarem.</p>
              
              <div className="mb-8">
                {isAnnual && (
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white/40 line-through">R$ 2.158,80</span>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">Economize R$ 360</span>
                  </div>
                )}
                <div className="flex items-end gap-1">
                  <span className="text-sm font-bold text-white/60 mb-1">R$</span>
                  <span className="text-4xl font-black text-white">{isAnnual ? '149' : '179'}</span>
                  <span className="text-sm font-bold text-white/60 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-white/50 block mt-1">Cobrado R$ 1.798,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-amber-400/90 pb-2 border-b border-white/10">Tudo do Pro, e mais:</div>
                <ul className="space-y-3.5">
                  {[
                    'Profissionais ilimitados',
                    'Bot de WhatsApp com IA (Agenda 24h)',
                    'Relatórios avançados de desempenho',
                    'Comissões automáticas por profissional',
                    'Suporte prioritário'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-white/70">
                      <CheckCircle2 className="h-4 w-4 text-amber-400/60 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <a
              href={isAnnual ? "https://pay.hub.la/rqw8NXaLwSvl111uEMRH" : "https://pay.hub.la/G1EIrESSFgnth0kXxCPC"}
              target="_blank"
              rel="noopener noreferrer"
              className="tap w-full py-3.5 bg-white/10 hover:bg-white/20 text-white text-sm font-bold rounded-2xl transition-all flex items-center justify-center gap-2 border border-white/10"
            >
              Assinar Premium
            </a>
          </div>

        </div>

        <div className="mt-12 text-center text-xs text-white/40 pb-12">
          <p>O processamento do pagamento é feito com 100% de segurança pela plataforma Hubla.</p>
          <p className="mt-1">Após a confirmação, seu acesso é liberado instantaneamente.</p>
        </div>

      </div>
    </div>
  );
}
