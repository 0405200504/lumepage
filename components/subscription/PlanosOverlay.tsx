'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LogOut, Sparkles } from 'lucide-react';
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center px-4 py-8 select-none overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, #0a0a0f 0%, #12121a 30%, #0d0d15 60%, #0a0a0f 100%)',
      }}
    >
      {/* Ambient glow orbs */}
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(140,36,56,0.6) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, rgba(99,56,140,0.5) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute top-[40%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[150px] opacity-10"
        style={{ background: 'radial-gradient(circle, rgba(140,36,56,0.4) 0%, transparent 60%)' }} />

      {/* Grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          maskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 40%, black, transparent)',
        }}
      />

      {/* Horizontal scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.03]">
        <div className="absolute inset-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.1) 3px, rgba(255,255,255,0.1) 4px)',
          }}
        />
      </div>

      <div className="max-w-5xl w-full z-10 flex flex-col">

        {/* Header */}
        <div className="flex justify-end items-center mb-4">
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-[10px] text-white/40 hover:text-white/80 transition-colors px-3 py-1.5 rounded-full border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] uppercase tracking-widest"
          >
            <LogOut className="h-3 w-3" />
            <span>Sair</span>
          </button>
        </div>

        {/* Title Section */}
        <div className="text-center mb-8 mt-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-[0.25em] mb-6 border border-wine-500/30 bg-wine-500/10 text-wine-400">
            <div className="w-1.5 h-1.5 rounded-full bg-wine-500 animate-pulse" />
            Seu teste grátis acabou
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-3 leading-[1.1]"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.6) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            ASSINE A LUME E<br />CONTINUE CRESCENDO
          </h1>
          <p className="text-[13px] text-white/40 max-w-lg mx-auto leading-relaxed font-light">
            Escolha o plano ideal para o seu momento e desbloqueie todo o potencial da plataforma.
          </p>
        </div>

        {/* Toggle Mensal/Anual */}
        <div className="flex justify-center mb-10">
          <div className="p-1 rounded-full flex items-center relative border border-white/[0.08] bg-white/[0.03]">
            <button onClick={() => setIsAnnual(false)}
              className={`relative z-10 px-6 py-2 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 ${!isAnnual ? 'text-white' : 'text-white/35 hover:text-white/60'}`}
            >
              Mensal
            </button>
            <button onClick={() => setIsAnnual(true)}
              className={`relative z-10 px-6 py-2 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-300 flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-white/35 hover:text-white/60'}`}
            >
              Anual
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full transition-all duration-300 ${isAnnual ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'}`}>
                −20%
              </span>
            </button>
            <div className="absolute top-1 bottom-1 rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
              style={{
                left: isAnnual ? 'calc(50%)' : '4px',
                width: isAnnual ? 'calc(50% - 4px)' : 'calc(50% - 4px)',
                background: 'linear-gradient(135deg, rgba(140,36,56,0.5) 0%, rgba(140,36,56,0.3) 100%)',
                border: '1px solid rgba(140,36,56,0.3)',
                boxShadow: '0 0 20px rgba(140,36,56,0.2)',
              }}
            />
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 items-stretch">

          {/* 1. START */}
          <div className="group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02] mt-2 md:mt-6 mb-2 md:mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%)' }}
          >
            <div className="h-full rounded-2xl p-7 flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(18,18,26,0.95) 0%, rgba(10,10,15,0.98) 100%)' }}
            >
              {/* Subtle top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div>
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1">lume</p>
                  <h3 className="text-2xl font-black text-white tracking-tight">Start</h3>
                </div>
                <p className="text-[11px] text-white/35 mb-6 leading-relaxed font-light">Sua vitrine profissional começa aqui. Pare de agendar no papel.</p>

                <div className="mb-7">
                  {isAnnual && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-medium text-white/25 line-through">R$ 598,80</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">−R$ 120</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-medium text-white/40">R$</span>
                    <span className="text-4xl font-black text-white tabular-nums">{isAnnual ? '39' : '49'}</span>
                    <span className="text-sm font-medium text-white/40">,90<span className="text-[10px]">/mês</span></span>
                  </div>
                  {isAnnual && <span className="text-[10px] text-white/25 block mt-1 font-light">Cobrado R$ 478,80 anualmente</span>}
                </div>

                <div className="space-y-3 mb-7">
                  <div className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] pb-2 border-b border-white/[0.06]">Incluso</div>
                  {[
                    '1 profissional',
                    'Página pública (link para Instagram)',
                    'Agenda com horários automáticos',
                    'Serviços ilimitados',
                    'Lista de clientes e contatos',
                    'Lembretes por WhatsApp',
                    'Financeiro básico'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[11px] text-white/50 font-light">
                      <Check className="h-3.5 w-3.5 text-white/20 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={isAnnual ? "https://pay.hub.la/AgzZbpcOki2gtS9voVrq" : "https://pay.hub.la/W0OcCJoqELUskNPEhbdL"}
                target="_blank"
                rel="noopener noreferrer"
                className="tap w-full py-3 bg-white/[0.06] hover:bg-white/[0.12] text-white text-[12px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/[0.08] hover:border-white/[0.15]"
              >
                Assinar Start
              </a>
            </div>
          </div>

          {/* 2. PRO (Destaque) */}
          <div className="group relative rounded-2xl p-[1px] z-10 transition-all duration-500 hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, rgba(140,36,56,0.6) 0%, rgba(140,36,56,0.15) 30%, rgba(99,56,140,0.15) 70%, rgba(140,36,56,0.5) 100%)',
            }}
          >
            <div className="h-full rounded-2xl p-7 pt-8 flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(22,12,18,0.97) 0%, rgba(12,8,14,0.99) 100%)' }}
            >
              {/* Animated top glow bar */}
              <div className="absolute top-0 left-0 right-0 h-[1px]"
                style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(140,36,56,0.8) 20%, rgba(200,60,90,0.9) 50%, rgba(140,36,56,0.8) 80%, transparent 100%)' }} />

              {/* Corner glow */}
              <div className="absolute top-0 right-0 w-40 h-40 pointer-events-none"
                style={{ background: 'radial-gradient(circle at top right, rgba(140,36,56,0.15) 0%, transparent 60%)' }} />

              {/* Badge */}
              <div className="absolute -top-0 left-1/2 -translate-x-1/2 translate-y-[-50%]">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    background: 'linear-gradient(135deg, rgba(140,36,56,0.9) 0%, rgba(180,50,70,0.9) 100%)',
                    border: '1px solid rgba(200,60,90,0.4)',
                    boxShadow: '0 0 25px rgba(140,36,56,0.4)',
                    color: '#fff',
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Mais popular
                </div>
              </div>

              <div>
                <div className="mb-5 mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-wine-400/60 mb-1">lume</p>
                  <h3 className="text-3xl font-black tracking-tight"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, rgba(200,140,160,0.9) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >Pro</h3>
                </div>
                <p className="text-[11px] text-white/45 mb-6 leading-relaxed font-light">Para quem vive de agenda cheia e quer automatizar tudo.</p>

                <div className="mb-7">
                  {isAnnual && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-medium text-white/30 line-through">R$ 1.198,80</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">−R$ 240</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-medium text-white/50">R$</span>
                    <span className="text-5xl font-black text-white tabular-nums">{isAnnual ? '79' : '99'}</span>
                    <span className="text-sm font-medium text-white/50">,90<span className="text-[10px]">/mês</span></span>
                  </div>
                  {isAnnual && <span className="text-[10px] text-white/30 block mt-1 font-light">Cobrado R$ 958,80 anualmente</span>}
                </div>

                <div className="space-y-3 mb-7">
                  <div className="text-[9px] font-bold text-wine-400/50 uppercase tracking-[0.2em] pb-2 border-b border-white/[0.08]">Tudo do Start +</div>
                  {[
                    'Até 3 profissionais na agenda',
                    'Lista de espera automática',
                    'Bloqueios de horários e folgas',
                    'Módulo de Vendas',
                    'Financeiro completo',
                    'Central de Conversas',
                    'Notificações via WhatsApp'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[11px] text-white/60 font-light">
                      <Check className="h-3.5 w-3.5 text-wine-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={isAnnual ? "https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok" : "https://pay.hub.la/Ijgtp0VTZ3QXmyCvAPKe"}
                target="_blank"
                rel="noopener noreferrer"
                className="tap w-full py-3.5 text-white text-[12px] font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(140,36,56,0.8) 0%, rgba(160,40,65,0.7) 50%, rgba(140,36,56,0.8) 100%)',
                  border: '1px solid rgba(200,60,90,0.3)',
                  boxShadow: '0 0 30px rgba(140,36,56,0.25), inset 0 1px 0 rgba(255,255,255,0.1)',
                }}
              >
                Assinar Pro
              </a>
            </div>
          </div>

          {/* 3. PREMIUM */}
          <div className="group relative rounded-2xl p-[1px] transition-all duration-500 hover:scale-[1.02] mt-2 md:mt-6 mb-2 md:mb-6"
            style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.06) 100%)' }}
          >
            <div className="h-full rounded-2xl p-7 flex flex-col justify-between relative overflow-hidden"
              style={{ background: 'linear-gradient(180deg, rgba(18,18,26,0.95) 0%, rgba(10,10,15,0.98) 100%)' }}
            >
              {/* Subtle top glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />

              <div>
                <div className="mb-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/30 mb-1">lume</p>
                  <h3 className="text-2xl font-black text-white tracking-tight">Premium</h3>
                </div>
                <p className="text-[11px] text-white/35 mb-6 leading-relaxed font-light">Gestão completa para estúdios e clínicas escalarem.</p>

                <div className="mb-7">
                  {isAnnual && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-medium text-white/25 line-through">R$ 2.158,80</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">−R$ 360</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-medium text-white/40">R$</span>
                    <span className="text-4xl font-black text-white tabular-nums">{isAnnual ? '149' : '179'}</span>
                    <span className="text-sm font-medium text-white/40">,90<span className="text-[10px]">/mês</span></span>
                  </div>
                  {isAnnual && <span className="text-[10px] text-white/25 block mt-1 font-light">Cobrado R$ 1.798,80 anualmente</span>}
                </div>

                <div className="space-y-3 mb-7">
                  <div className="text-[9px] font-bold text-white/50 uppercase tracking-[0.2em] pb-2 border-b border-white/[0.06]">Tudo do Pro +</div>
                  {[
                    'Profissionais ilimitados',
                    'Bot de WhatsApp com IA (24h)',
                    'Relatórios avançados',
                    'Comissões automáticas',
                    'Suporte prioritário'
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-[11px] text-white/50 font-light">
                      <Check className="h-3.5 w-3.5 text-white/20 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <a
                href={isAnnual ? "https://pay.hub.la/rqw8NXaLwSvl111uEMRH" : "https://pay.hub.la/G1EIrESSFgnth0kXxCPC"}
                target="_blank"
                rel="noopener noreferrer"
                className="tap w-full py-3 bg-white/[0.06] hover:bg-white/[0.12] text-white text-[12px] font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/[0.08] hover:border-white/[0.15]"
              >
                Assinar Premium
              </a>
            </div>
          </div>

        </div>

        <div className="mt-10 text-center text-[10px] text-white/20 pb-10 font-light tracking-wide">
          <p>Pagamento processado com 100% de segurança pela Hubla.</p>
          <p className="mt-0.5">Acesso liberado instantaneamente após confirmação.</p>
        </div>

      </div>

      {/* Global CSS for animations */}
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
