'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard, Sparkles, Clock, CalendarRange, Contact, ExternalLink,
  Bot, Wallet, Settings, PartyPopper, X, ArrowLeft, ArrowRight, Check,
  type LucideIcon,
} from 'lucide-react';
import { Portal } from '../ui/Portal';

/** Chave de persistência: enquanto não for 'done', a profissional é considerada
 *  em primeiro contato e o tour aparece automaticamente. Versionada para permitir
 *  reexibir num futuro redesenho (basta subir para _v2). */
const STORAGE_KEY = 'lume_onboarding_v1';
/** Evento global para reabrir o tour manualmente (ex.: botão "?" no Header). */
export const OPEN_ONBOARDING_EVENT = 'lume:open-onboarding';

interface Step {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  body: string;
  tip?: string;
}

interface OnboardingTourProps {
  /** Primeiro nome da profissional (personaliza a saudação). */
  firstName?: string;
  /** Slug público para montar o link de agendamento de exemplo. */
  slug?: string;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ firstName, slug }) => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  const publicUrl = `agendar/${slug || 'sua-marca'}`;

  const steps: Step[] = [
    {
      icon: Sparkles,
      eyebrow: 'Bem-vinda ao Lume',
      title: firstName ? `Oi, ${firstName}! Vamos dar um tour rápido?` : 'Vamos dar um tour rápido?',
      body: 'Em menos de 1 minuto você conhece tudo que precisa pra sua agenda rodar quase no automático. Pode pular uma etapa ou o tour inteiro quando quiser.',
    },
    {
      icon: LayoutDashboard,
      eyebrow: 'Início',
      title: 'Sua central do dia',
      body: 'Ao entrar, você vê os próximos atendimentos, as estatísticas de hoje e atalhos rápidos. É o seu ponto de partida todo dia.',
    },
    {
      icon: Sparkles,
      eyebrow: 'Serviços',
      title: 'Comece cadastrando o que você faz',
      body: 'Registre cada procedimento com preço e duração. É exatamente isso que suas clientes veem na hora de escolher um horário.',
      tip: 'Sem nenhum serviço cadastrado, ninguém consegue agendar com você. Comece por aqui.',
    },
    {
      icon: Clock,
      eyebrow: 'Disponibilidade',
      title: 'Defina seus horários de atendimento',
      body: 'Configure os dias e horas em que você atende, além do intervalo de almoço. O sistema só oferece horários dentro dessa janela.',
    },
    {
      icon: CalendarRange,
      eyebrow: 'Agenda & Agendamentos',
      title: 'Tudo o que está marcado, num lugar só',
      body: 'Veja sua agenda por dia, semana ou mês. Toque no botão “+” pra encaixar um horário na hora e arraste um card pra remarcar.',
    },
    {
      icon: Contact,
      eyebrow: 'Contatos',
      title: 'Conheça e fidelize suas clientes',
      body: 'O histórico de cada pessoa: quantas vezes veio, quanto gastou e há quanto tempo sumiu — pra você reativar quem parou de aparecer.',
    },
    {
      icon: ExternalLink,
      eyebrow: 'Link de agendamento',
      title: 'Sua vitrine que trabalha 24h',
      body: `Compartilhe seu link e a cliente marca sozinha, a qualquer hora, sem você precisar responder. É só divulgar no Instagram e no WhatsApp.`,
      tip: `Seu link: lume.app/${publicUrl}`,
    },
    {
      icon: Bot,
      eyebrow: 'Bot do WhatsApp',
      title: 'A Júlia atende por você',
      body: 'A assistente responde suas clientes no WhatsApp automaticamente, tira dúvidas e até agenda sozinha. Você personaliza o jeitinho dela falar.',
    },
    {
      icon: Wallet,
      eyebrow: 'Financeiro & Vendas',
      title: 'Saiba quanto realmente sobra',
      body: 'Acompanhe o que entrou, o que saiu e o seu lucro. Registre vendas e mantenha o controle do faturamento sem planilha.',
    },
    {
      icon: Settings,
      eyebrow: 'Configurações',
      title: 'Deixe com a sua cara',
      body: 'Ajuste seus dados, as regras de agendamento, o sinal/pagamento e as cores da sua marca — tudo aparece pras clientes.',
    },
    {
      icon: PartyPopper,
      eyebrow: 'Tudo pronto',
      title: 'É isso! Bora começar 🎉',
      body: 'O melhor primeiro passo é cadastrar seus serviços. Depois é só configurar seus horários e compartilhar seu link.',
    },
  ];

  const total = steps.length;
  const isLast = index === total - 1;

  const finish = useCallback(() => {
    try { localStorage.setItem(STORAGE_KEY, 'done'); } catch { /* ignore */ }
    setVisible(false);
  }, []);

  // Primeiro contato: só abre automaticamente se a chave ainda não existe.
  useEffect(() => {
    let seen = 'done';
    try { seen = localStorage.getItem(STORAGE_KEY) || ''; } catch { /* ignore */ }
    if (seen !== 'done') {
      const t = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(t);
    }
  }, []);

  // Permite reabrir o tour manualmente a qualquer momento.
  useEffect(() => {
    const open = () => { setIndex(0); setVisible(true); };
    window.addEventListener(OPEN_ONBOARDING_EVENT, open);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, open);
  }, []);

  // Fechar com ESC (= pular tutorial).
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' && !isLast) setIndex((i) => Math.min(i + 1, total - 1));
      if (e.key === 'ArrowLeft' && index > 0) setIndex((i) => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isLast, index, total, finish]);

  if (!visible) return null;

  const step = steps[index];
  const Icon = step.icon;

  const goServices = () => { finish(); router.push('/dashboard/services'); };

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Tutorial de boas-vindas">
        <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={finish} />

        <div className="relative w-full sm:max-w-md m-0 sm:m-4 bg-paper rounded-t-3xl sm:rounded-3xl shadow-2xl border border-gray-150 overflow-hidden animate-slide-up sm:animate-fade-up">
          {/* Cabeçalho ilustrado */}
          <div className="relative px-6 pt-6 pb-5 surface-wine text-white overflow-hidden">
            <span className="pointer-events-none absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <span className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-white/[0.07] blur-2xl" />

            <div className="relative flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">
                {step.eyebrow}
              </span>
              <button
                type="button"
                onClick={finish}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all-custom"
              >
                Pular tutorial <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="relative mt-4 flex items-center gap-4">
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-white/12 border border-white/15 flex items-center justify-center">
                <Icon className="h-7 w-7 text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-black leading-tight tracking-tight">{step.title}</h2>
                <p className="text-[11px] font-bold text-white/55 mt-1">
                  Passo {index + 1} de {total}
                </p>
              </div>
            </div>
          </div>

          {/* Corpo */}
          <div className="px-6 pt-5 pb-3">
            <p className="text-sm leading-relaxed text-ink/80">{step.body}</p>

            {step.tip && (
              <div className="mt-4 rounded-2xl bg-accent-soft border border-accent-soft-border px-4 py-3">
                <p className="text-[13px] font-semibold text-wine-700 break-words">{step.tip}</p>
              </div>
            )}
          </div>

          {/* Progresso (clicável = pular direto para uma etapa) */}
          <div className="px-6 flex items-center justify-center gap-1.5 py-3">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o passo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all-custom ${
                  i === index ? 'w-6 bg-wine-700' : 'w-1.5 bg-gray-250 hover:bg-gray-450'
                }`}
              />
            ))}
          </div>

          {/* Rodapé de navegação */}
          <div className="px-6 pb-6 pt-2 pb-safe flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl text-sm font-bold text-ink/70 hover:bg-sand disabled:opacity-0 disabled:pointer-events-none transition-all-custom"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>

            <div className="flex-1" />

            {!isLast ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-forest text-white text-sm font-bold shadow-soft hover:bg-forest-hover transition-all-custom"
              >
                {index === 0 ? 'Bora lá' : 'Próximo'} <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goServices}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-xl bg-forest text-white text-sm font-bold shadow-soft hover:bg-forest-hover transition-all-custom"
              >
                <Check className="h-4 w-4" /> Cadastrar meus serviços
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default OnboardingTour;
