'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, LogOut } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { logoutAction } from '@/app/actions/professional';

interface Plan {
  key: 'start' | 'pro' | 'premium';
  name: string;
  description: string;
  featured?: boolean;
  featuresLabel: string;
  features: string[];
  monthly: { price: string; href: string };
  annual: { price: string; href: string; oldYear: string; save: string; avista: string };
}

const PLANS: Plan[] = [
  {
    key: 'start',
    name: 'START',
    description: 'Sua vitrine profissional começa aqui. Pare de agendar no papel.',
    featuresLabel: 'Incluso',
    features: [
      '1 profissional',
      'Página pública (link para Instagram)',
      'Agenda com horários automáticos',
      'Serviços ilimitados',
      'Lista de clientes e contatos',
      'Lembretes por WhatsApp',
      'Financeiro básico',
    ],
    monthly: { price: '49', href: 'https://pay.hub.la/W0OcCJoqELUskNPEhbdL' },
    annual: { price: '39', href: 'https://pay.hub.la/AgzZbpcOki2gtS9voVrq', oldYear: 'R$ 598,80', save: '−R$ 120', avista: '392,68' },
  },
  {
    key: 'pro',
    name: 'PRO',
    description: 'Para quem vive de agenda cheia e quer automatizar tudo.',
    featured: true,
    featuresLabel: 'Tudo do Start +',
    features: [
      'Até 3 profissionais na agenda',
      'Lista de espera automática',
      'Bloqueios de horários e folgas',
      'Módulo de Vendas',
      'Financeiro completo',
      'Central de Conversas',
      'Notificações via WhatsApp',
    ],
    monthly: { price: '99', href: 'https://pay.hub.la/Ijgtp0VTZ3QXmyCvAPKe' },
    annual: { price: '79', href: 'https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok', oldYear: 'R$ 1.198,80', save: '−R$ 240', avista: '786,37' },
  },
  {
    key: 'premium',
    name: 'PREMIUM',
    description: 'Gestão completa para estúdios e clínicas escalarem.',
    featuresLabel: 'Tudo do Pro +',
    features: [
      'Profissionais ilimitados',
      'Bot de WhatsApp com IA (24h)',
      'Relatórios avançados',
      'Comissões automáticas',
      'Suporte prioritário',
    ],
    monthly: { price: '179', href: 'https://pay.hub.la/G1EIrESSFgnth0kXxCPC' },
    annual: { price: '149', href: 'https://pay.hub.la/rqw8NXaLwSvl111uEMRH', oldYear: 'R$ 2.158,80', save: '−R$ 360', avista: '1.475,30' },
  },
];

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
      className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto px-4 py-10 select-none backdrop-blur-2xl"
      style={{ background: 'rgba(244,240,241,0.6)' }}
    >
      {/* Brilho vinho ambiente (suave, tema claro) */}
      <div className="pointer-events-none absolute top-[-15%] left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full blur-[130px] opacity-40"
        style={{ background: 'radial-gradient(circle, rgba(140,36,56,0.18) 0%, transparent 70%)' }} />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, rgba(80,11,24,0.14) 0%, transparent 70%)' }} />

      {/* Sair */}
      <button onClick={handleLogout}
        className="tap absolute top-5 right-5 z-20 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-wine-700/60 hover:text-wine-700 transition-colors px-3 py-1.5 rounded-full border border-wine-700/10 bg-white/70 hover:bg-white"
      >
        <LogOut className="h-3 w-3" />
        <span>Sair</span>
      </button>

      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center">

        {/* Título */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm sm:text-base font-black uppercase tracking-wide"
          style={{ background: 'linear-gradient(135deg, #8c2438 0%, #500b18 100%)', boxShadow: '0 12px 32px rgba(80,11,24,0.35)' }}
        >
          Seu teste grátis acabou
        </div>

        <h1 className="mt-6 text-center text-3xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05]"
          style={{
            backgroundImage: 'linear-gradient(90deg, #3a0811 0%, #8c2438 48%, #500b18 76%, #8c2438 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          Assine a Lume e<br className="hidden sm:block" /> continue crescendo
        </h1>

        <p className="mt-4 text-center text-sm text-ink/50 max-w-lg leading-relaxed">
          Escolha o plano ideal para o seu momento e desbloqueie todo o potencial da plataforma.
        </p>

        {/* Toggle Mensal/Anual */}
        <div className="relative mt-8 mb-10 inline-flex p-1 rounded-full bg-white shadow-md border border-wine-100">
          <button onClick={() => setIsAnnual(false)}
            className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors duration-300 ${!isAnnual ? 'text-white' : 'text-wine-700/50 hover:text-wine-700/80'}`}
          >
            Mensal
          </button>
          <button onClick={() => setIsAnnual(true)}
            className={`relative z-10 px-7 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors duration-300 flex items-center gap-2 ${isAnnual ? 'text-white' : 'text-wine-700/50 hover:text-wine-700/80'}`}
          >
            Anual
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full transition-colors duration-300 ${isAnnual ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-600'}`}>
              −20%
            </span>
          </button>
          <div className="absolute top-1 bottom-1 rounded-full transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{
              left: isAnnual ? '50%' : '4px',
              right: isAnnual ? '4px' : '50%',
              background: 'linear-gradient(135deg, #8c2438 0%, #500b18 100%)',
              boxShadow: '0 6px 18px rgba(80,11,24,0.3)',
            }}
          />
        </div>

        {/* Planos */}
        <div className="grid w-full grid-cols-1 md:grid-cols-3 gap-5 items-center">
          {PLANS.map((plan) => {
            const p = isAnnual ? plan.annual : plan.monthly;
            const featured = plan.featured;
            return (
              <div
                key={plan.key}
                className={
                  featured
                    ? 'relative flex flex-col rounded-[2rem] p-8 text-white shadow-2xl md:-translate-y-4 md:z-10 ring-1 ring-wine-400/40'
                    : 'relative flex flex-col rounded-[1.75rem] p-7 bg-white text-ink border border-wine-100 shadow-xl md:my-2'
                }
                style={
                  featured
                    ? { background: 'linear-gradient(150deg, #b02f49 0%, #8c2438 42%, #4a0a16 100%)' }
                    : undefined
                }
              >
                {featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3.5 py-1 rounded-full bg-white text-wine-700 text-[9px] font-black uppercase tracking-[0.2em] shadow-md">
                      Mais popular
                    </span>
                  </div>
                )}

                {/* Nome */}
                <div className={featured ? 'mt-2 mb-5' : 'mb-5'}>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.3em] mb-1 ${featured ? 'text-white/60' : 'text-ink/30'}`}>lume</p>
                  <h3 className={`text-3xl font-black tracking-tight ${featured ? 'text-white' : 'text-wine-700'}`}>{plan.name}</h3>
                </div>

                <p className={`text-[12px] mb-6 leading-relaxed ${featured ? 'text-white/70' : 'text-ink/45'}`}>{plan.description}</p>

                {/* Preço */}
                <div className="mb-7">
                  {isAnnual && plan.annual.oldYear && (
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[10px] font-medium line-through ${featured ? 'text-white/40' : 'text-ink/25'}`}>{plan.annual.oldYear}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${featured ? 'bg-white/15 text-white' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>{plan.annual.save}</span>
                    </div>
                  )}
                  <div className="flex items-baseline gap-0.5">
                    <span className={`text-sm font-medium ${featured ? 'text-white/60' : 'text-ink/40'}`}>R$</span>
                    <span className={`font-black tabular-nums ${featured ? 'text-6xl text-white' : 'text-5xl text-ink'}`}>{p.price}</span>
                    <span className={`text-sm font-medium ${featured ? 'text-white/60' : 'text-ink/40'}`}>,90<span className="text-[10px]">/mês</span></span>
                  </div>
                  {isAnnual && (
                    <span className={`text-[10px] block mt-1 ${featured ? 'text-white/50' : 'text-ink/30'}`}>12x no cartão · ou R$ {plan.annual.avista} à vista</span>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-3 mb-8">
                  <div className={`text-[9px] font-bold uppercase tracking-[0.2em] pb-2 border-b ${featured ? 'text-white/60 border-white/15' : 'text-ink/45 border-wine-100'}`}>{plan.featuresLabel}</div>
                  {plan.features.map((feat, i) => (
                    <div key={i} className={`flex items-start gap-2.5 text-[12px] ${featured ? 'text-white/80' : 'text-ink/55'}`}>
                      <Check className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${featured ? 'text-white' : 'text-wine-500'}`} />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={
                    featured
                      ? 'tap mt-auto w-full py-3.5 rounded-xl bg-white text-wine-700 text-[13px] font-black text-center shadow-lg hover:shadow-xl transition-all'
                      : 'tap mt-auto w-full py-3.5 rounded-xl text-white text-[13px] font-bold text-center shadow-md hover:shadow-lg transition-all'
                  }
                  style={featured ? undefined : { background: 'linear-gradient(135deg, #8c2438 0%, #500b18 100%)' }}
                >
                  Assinar {plan.name.charAt(0) + plan.name.slice(1).toLowerCase()}
                </a>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center text-[10px] text-ink/30 pb-6 tracking-wide">
          <p>Pagamento processado com 100% de segurança pela Hubla.</p>
          <p className="mt-0.5">Acesso liberado instantaneamente após confirmação.</p>
        </div>
      </div>
    </div>
  );
}
