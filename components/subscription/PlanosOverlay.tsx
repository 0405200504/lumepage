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
          <div className="inline-flex items-center justify-center px-6 py-2 bg-wine-900 text-white rounded-md text-[10px] font-black uppercase tracking-widest mb-6 shadow-lg">
            <span>Seu teste grátis acabou</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4 uppercase">
            Assine <span className="text-wine-500">a Lume</span> e continue crescendo
          </h1>
          <p className="text-sm text-white/80 max-w-2xl mx-auto leading-relaxed">
            Não perca os agendamentos, o histórico de clientes e o painel financeiro.
            Escolha o plano que faz mais sentido para o seu momento e desbloqueie o acesso total.
          </p>
        </div>

        {/* Toggle Mensal/Anual */}
        <div className="flex justify-center mb-12">
          <div className="bg-[#e5e5e5] p-1.5 rounded-full flex items-center shadow-inner relative w-[280px] h-[48px]">
            <button
              onClick={() => setIsAnnual(false)}
              className={`relative z-10 flex-1 h-full rounded-full text-[11px] font-black uppercase transition-colors ${!isAnnual ? 'text-white' : 'text-wine-900 hover:text-wine-700'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`relative z-10 flex-1 h-full rounded-full text-[11px] font-black uppercase transition-colors ${isAnnual ? 'text-white' : 'text-wine-900 hover:text-wine-700'}`}
            >
              Anual
            </button>
            {/* Pill Background animado */}
            <div 
              className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full transition-all duration-300 ease-out bg-wine-900 shadow-md"
              style={{ 
                left: isAnnual ? 'calc(50% + 3px)' : '6px',
              }} 
            />
          </div>
        </div>

        {/* Grid de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          
          {/* 1. START */}
          <div className="bg-[#e5e5e5] p-8 rounded-[1.5rem] flex flex-col justify-between transition-transform hover:scale-105 relative shadow-xl mt-4 md:mt-8 mb-4 md:mb-8">
            <div>
              <div className="flex items-center justify-center mb-6">
                <h3 className="text-2xl text-wine-900"><span className="font-light">lume</span> <span className="font-black">START</span></h3>
              </div>
              <p className="text-xs text-wine-900/60 mb-6 min-h-[40px] text-center">Sua vitrine profissional começa aqui. Pare de agendar no papel.</p>
              
              <div className="mb-8 text-center">
                {isAnnual && (
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-wine-900/40 line-through">R$ 598,80</span>
                    <span className="text-[10px] font-bold text-wine-900 bg-wine-900/10 px-2 py-0.5 rounded-full">Economize R$ 120</span>
                  </div>
                )}
                <div className="flex items-end justify-center gap-1">
                  <span className="text-sm font-bold text-wine-900/60 mb-1">R$</span>
                  <span className="text-4xl font-black text-wine-900">{isAnnual ? '39' : '49'}</span>
                  <span className="text-sm font-bold text-wine-900/60 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-wine-900/50 block mt-1">Cobrado R$ 478,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-wine-900/90 pb-2 border-b border-wine-900/10 text-center">O que está incluso:</div>
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
                    <li key={i} className="flex items-start gap-2.5 text-xs text-wine-900/80">
                      <CheckCircle2 className="h-4 w-4 text-wine-900 shrink-0 mt-0.5" />
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
              className="tap w-full py-3.5 bg-wine-900 hover:bg-wine-950 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
            >
              Assinar Start
            </a>
          </div>

          {/* 2. PRO (Destaque) */}
          <div className="bg-wine-800 p-8 pt-12 rounded-[1.5rem] flex flex-col justify-between shadow-2xl relative z-10">
            
            <div>
              <div className="flex items-center justify-center mb-6">
                <h3 className="text-2xl text-white"><span className="font-light">lume</span> <span className="font-black">PRO</span></h3>
              </div>
              <p className="text-xs text-white/80 mb-6 min-h-[40px] text-center">Para quem vive de agenda cheia e quer automatizar tudo.</p>
              
              <div className="mb-8 text-center">
                {isAnnual && (
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-white/60 line-through">R$ 1.198,80</span>
                    <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">Economize R$ 240</span>
                  </div>
                )}
                <div className="flex items-end justify-center gap-1">
                  <span className="text-sm font-bold text-white/80 mb-1">R$</span>
                  <span className="text-4xl font-black text-white">{isAnnual ? '79' : '99'}</span>
                  <span className="text-sm font-bold text-white/80 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-white/60 block mt-1">Cobrado R$ 958,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-white pb-2 border-b border-white/20 text-center">Tudo do Start, e mais:</div>
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
                      <CheckCircle2 className="h-4 w-4 text-white shrink-0 mt-0.5" />
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
              className="tap w-full py-3.5 bg-[#e5e5e5] hover:bg-white text-wine-900 text-sm font-black rounded-xl transition-all shadow-xl flex items-center justify-center gap-2"
            >
              Assinar Pro
            </a>
          </div>

          {/* 3. PREMIUM */}
          <div className="bg-[#e5e5e5] p-8 rounded-[1.5rem] flex flex-col justify-between transition-transform hover:scale-105 relative shadow-xl mt-4 md:mt-8 mb-4 md:mb-8">
            <div>
              <div className="flex items-center justify-center mb-6">
                <h3 className="text-2xl text-wine-900"><span className="font-light">lume</span> <span className="font-black">PREMIUM</span></h3>
              </div>
              <p className="text-xs text-wine-900/60 mb-6 min-h-[40px] text-center">Gestão completa para estúdios e clínicas escalarem.</p>
              
              <div className="mb-8 text-center">
                {isAnnual && (
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-wine-900/40 line-through">R$ 2.158,80</span>
                    <span className="text-[10px] font-bold text-wine-900 bg-wine-900/10 px-2 py-0.5 rounded-full">Economize R$ 360</span>
                  </div>
                )}
                <div className="flex items-end justify-center gap-1">
                  <span className="text-sm font-bold text-wine-900/60 mb-1">R$</span>
                  <span className="text-4xl font-black text-wine-900">{isAnnual ? '149' : '179'}</span>
                  <span className="text-sm font-bold text-wine-900/60 mb-1">,90/mês</span>
                </div>
                {isAnnual && <span className="text-xs text-wine-900/50 block mt-1">Cobrado R$ 1.798,80 anualmente</span>}
              </div>

              <div className="space-y-4 mb-8">
                <div className="text-xs font-bold text-wine-900/90 pb-2 border-b border-wine-900/10 text-center">Tudo do Pro, e mais:</div>
                <ul className="space-y-3.5">
                  {[
                    'Profissionais ilimitados',
                    'Bot de WhatsApp com IA (Agenda 24h)',
                    'Relatórios avançados de desempenho',
                    'Comissões automáticas por profissional',
                    'Suporte prioritário'
                  ].map((feat, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-wine-900/80">
                      <CheckCircle2 className="h-4 w-4 text-wine-900 shrink-0 mt-0.5" />
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
              className="tap w-full py-3.5 bg-wine-900 hover:bg-wine-950 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
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
