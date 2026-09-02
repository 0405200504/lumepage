'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sparkles, X, ArrowLeft, ArrowRight, Check,
} from 'lucide-react';
import { Portal } from '../ui/Portal';
import { isDemo } from '@/lib/demo';

/** Prefixo da chave de persistência. A chave final é escopada por profissional
 *  (`lume_onboarding_v1:{professionalId}`) para que cada conta nova seja tratada
 *  como primeiro contato, mesmo que outra conta já tenha visto o tour no mesmo
 *  navegador. Versionada para permitir reexibir num futuro redesenho (subir _v2). */
const STORAGE_PREFIX = 'lume_onboarding_v1';
/** Evento global para reabrir o tour manualmente (ex.: botão "?" no Header). */
export const OPEN_ONBOARDING_EVENT = 'lume:open-onboarding';

interface Step {
  /** Rota do módulo — o tour navega até ela antes de destacar. */
  route: string;
  /** Seletor do elemento a destacar. Ausente = card centralizado, sem seta. */
  selector?: string;
  eyebrow: string;
  title: string;
  body: string;
  tip?: string;
}

interface Rect { top: number; left: number; width: number; height: number; }

interface OnboardingTourProps {
  firstName?: string;
  slug?: string;
  professionalId?: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ firstName, slug, professionalId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = `${STORAGE_PREFIX}:${professionalId || 'anon'}`;

  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: 'top' | 'bottom' | null; arrowLeft: number } | null>(null);

  const publicUrl = `agendar/${slug || 'sua-marca'}`;

  const steps: Step[] = [
    {
      route: '/dashboard',
      selector: '[data-tour="home-hero"]',
      eyebrow: 'Passo 1 · Início',
      title: firstName ? `Oi, ${firstName}! Seja muito bem-vinda ✨` : 'Seja muito bem-vinda ✨',
      body: 'Esta é a sua central: veja seu faturamento, atendimentos do dia e atalhos rápidos. Vamos te mostrar os principais recursos.',
    },
    {
      route: '/dashboard/site',
      selector: '[data-tour="page-header"]',
      eyebrow: 'Passo 2 · Minha Página',
      title: 'Sua Página na Bio com Assistente por Nicho',
      body: 'Crie seu site profissional em minutos com fotos, serviços e textos prontos. Suas clientes agendam diretamente pelo celular.',
      tip: 'Use o Assistente Rápido ou clique direto nos textos e fotos para personalizar!',
    },
    {
      route: '/dashboard/services',
      selector: '[data-tour="quick-add"]',
      eyebrow: 'Passo 3 · Serviços',
      title: 'Cadastre o que você faz',
      body: 'Toque no botão “+” para cadastrar cada procedimento com nome, preço e duração. A cliente escolhe o serviço na sua página.',
      tip: 'Com pelo menos 1 serviço cadastrado, sua agenda já fica pronta para receber clientes.',
    },
    {
      route: '/dashboard/availability',
      selector: '[data-tour="page-header"]',
      eyebrow: 'Passo 4 · Horários',
      title: 'Defina seus dias e horários de atendimento',
      body: 'Marque os dias em que você atende e o intervalo de almoço. O sistema só libera horários dentro dessa janela.',
    },
    {
      route: '/dashboard/agenda',
      selector: '[data-tour="quick-add"]',
      eyebrow: 'Passo 5 · Agenda',
      title: 'Tudo organizado num só lugar',
      body: 'Visualize sua grade por dia, semana ou mês. Encaixe horários rapidamente e arraste marcações para reagendar.',
    },
    {
      route: '/dashboard/clients',
      selector: '[data-tour="quick-add"]',
      eyebrow: 'Passo 6 · Clientes',
      title: 'Histórico e fidelização',
      body: 'Acompanhe quantas vezes cada cliente veio, datas de retorno e reative quem não aparece há algum tempo.',
    },
    {
      route: '/dashboard/finance',
      selector: '[data-tour="page-header"]',
      eyebrow: 'Passo 7 · Financeiro',
      title: 'Controle de faturamento sem planilhas',
      body: 'Entradas, saídas, lucro e saldo do mês calculados automaticamente a cada atendimento concluído.',
    },
    {
      route: '/dashboard/whatsapp',
      selector: '[data-tour="page-header"]',
      eyebrow: 'Passo 8 · WhatsApp & IA',
      title: 'Júlia: sua assistente virtual 24h',
      body: 'Lembretes automáticos para reduzir faltas e atendimento inteligente que tira dúvidas e agenda por você.',
    },
    {
      route: '/dashboard',
      eyebrow: 'Tudo pronto 🎉',
      title: 'Pronta para começar?',
      body: 'O melhor primeiro passo é personalizar sua Página e cadastrar seus serviços. Você pode rever este guia a qualquer momento no botão “?” no topo.',
    },
  ];

  const total = steps.length;
  const isLast = index === total - 1;
  const step = steps[index];

  const finish = useCallback(() => {
    // Na conta demo, NÃO persiste — assim o tour reaparece toda vez que alguém entra.
    if (!isDemo(professionalId)) {
      try { localStorage.setItem(storageKey, 'done'); } catch { /* ignore */ }
    }
    setVisible(false);
  }, [storageKey, professionalId]);

  // Primeiro contato: só abre automaticamente se a chave ainda não existe.
  // Conta demo: SEMPRE abre (ignora localStorage).
  useEffect(() => {
    if (isDemo(professionalId)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    let seen = 'done';
    try { seen = localStorage.getItem(storageKey) || ''; } catch { /* ignore */ }
    if (seen !== 'done') {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, [storageKey, professionalId]);

  // Permite reabrir o tour manualmente a qualquer momento.
  useEffect(() => {
    const open = () => { setIndex(0); setVisible(true); };
    window.addEventListener(OPEN_ONBOARDING_EVENT, open);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, open);
  }, []);

  // A cada passo: navega até a rota do módulo e procura o alvo a destacar.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // Reset síncrono ao trocar de passo: esconde o card anterior enquanto o novo
    // alvo é localizado. Intencional (sincroniza com rota/DOM externos).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
    setRect(null);

    if (step.route && pathname !== step.route) {
      router.push(step.route);
    }

    // Sem seletor → card centralizado (sem spotlight).
    if (!step.selector) {
      const t = setTimeout(() => { if (!cancelled) setReady(true); }, 250);
      return () => { cancelled = true; clearTimeout(t); };
    }

    const started = Date.now();
    const measure = (el: Element) => {
      el.scrollIntoView({ block: 'center', inline: 'nearest' });
      window.setTimeout(() => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReady(true);
      }, 180);
    };

    const poll = window.setInterval(() => {
      if (cancelled) return;
      const el = document.querySelector(step.selector!);
      if (el) {
        window.clearInterval(poll);
        measure(el);
      } else if (Date.now() - started > 4500) {
        // Alvo não apareceu (ex.: módulo lento) → cai pro card centralizado.
        window.clearInterval(poll);
        setReady(true);
      }
    }, 90);

    return () => { cancelled = true; window.clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index]);

  // Reposiciona o alvo/spotlight quando a tela rola ou muda de tamanho.
  useEffect(() => {
    if (!visible || !ready || !step.selector) return;
    const update = () => {
      const el = document.querySelector(step.selector!);
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ready, index]);

  // Calcula a posição do card (e da seta) a partir do alvo.
  useEffect(() => {
    if (!ready) return;
    const card = cardRef.current;
    if (!card) return;
    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    if (!rect) {
      setPos({ top: Math.max(16, (vh - ch) / 2), left: Math.max(16, (vw - cw) / 2), arrow: null, arrowLeft: 0 });
      return;
    }

    const margin = 14;
    const centerX = rect.left + rect.width / 2;
    const left = clamp(centerX - cw / 2, 16, vw - cw - 16);
    let top: number;
    let arrow: 'top' | 'bottom';
    if (rect.top + rect.height + margin + ch <= vh - 16) {
      top = rect.top + rect.height + margin; arrow = 'top';
    } else if (rect.top - margin - ch >= 16) {
      top = rect.top - margin - ch; arrow = 'bottom';
    } else {
      top = clamp(rect.top + rect.height + margin, 16, vh - ch - 16); arrow = 'top';
    }
    setPos({ top, left, arrow, arrowLeft: clamp(centerX - left, 24, cw - 24) });
  }, [rect, ready, index]);

  // Teclado: ESC pula o tour; setas navegam.
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

  const goServices = () => { finish(); router.push('/dashboard/services'); };
  const hasSpotlight = ready && !!rect;

  return (
    <Portal>
      {/* Bloqueia interação com o app. Sem alvo, ele mesmo escurece a tela;
          com spotlight, o escurecimento vem do box-shadow do buraco. */}
      <div
        className={`fixed inset-0 z-[85] ${hasSpotlight ? '' : 'bg-wine-950/45 backdrop-blur-[2px]'}`}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight — buraco iluminado sobre o alvo. */}
      {hasSpotlight && rect && (
        <div
          className="fixed z-[86] rounded-2xl ring-2 ring-white/80 pointer-events-none transition-ui duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(26,14,18,0.62)',
          }}
        />
      )}

      {/* Enquanto navega/procura o alvo, uma pílula discreta evita tela vazia. */}
      {!ready && (
        <div className="fixed left-1/2 top-1/2 z-[87] -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded-full bg-surface px-4 py-2 shadow-2xl">
          <span className="h-4 w-4 rounded-full border-2 border-wine-700 border-t-transparent animate-spin" />
          <span className="text-caption font-bold text-ink">Abrindo módulo…</span>
        </div>
      )}

      {/* Card do passo */}
      <div
        ref={cardRef}
        className="fixed z-[88] w-[min(360px,calc(100vw-32px))] bg-surface rounded-3xl shadow-2xl border border-n-200 animate-fade-up"
        style={{
          top: pos?.top ?? -9999,
          left: pos?.left ?? -9999,
          visibility: ready && pos ? 'visible' : 'hidden',
        }}
      >
        {/* Seta apontando para o alvo */}
        {pos?.arrow && (
          <span
            className={`absolute h-3.5 w-3.5 rotate-45 bg-surface border-n-200 ${
              pos.arrow === 'top' ? '-top-[7px] border-l border-t' : '-bottom-[7px] border-r border-b'
            }`}
            style={{ left: pos.arrowLeft - 7 }}
          />
        )}

        <div className="p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-caption font-semibold uppercase tracking-[0.16em] text-wine-700">
              <Sparkles className="h-3 w-3" /> {step.eyebrow}
            </span>
            <button
              type="button"
              onClick={finish}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-caption font-bold text-n-600 hover:text-ink hover:bg-n-150 transition-ui"
            >
              Pular <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <h2 className="mt-3 text-h3 font-semibold leading-tight tracking-tight text-ink">{step.title}</h2>
          <p className="mt-2 text-label leading-relaxed text-ink/75">{step.body}</p>

          {step.tip && (
            <div className="mt-3 rounded-2xl bg-accent-soft border border-accent-soft-border px-3.5 py-2.5">
              <p className="text-caption font-semibold text-wine-700 break-words">{step.tip}</p>
            </div>
          )}

          {/* Progresso — clicável pra pular direto pra um passo */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir para o passo ${i + 1}`}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-ui ${
                  i === index ? 'w-5 bg-wine-700' : 'w-1.5 bg-n-300 hover:bg-n-600'
                }`}
              />
            ))}
          </div>

          {/* Navegação */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(i - 1, 0))}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl text-label font-bold text-ink/70 hover:bg-n-150 disabled:opacity-0 disabled:pointer-events-none transition-ui"
            >
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex-1" />
            {!isLast ? (
              <button
                type="button"
                onClick={() => setIndex((i) => Math.min(i + 1, total - 1))}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-wine-700 text-white text-label font-bold shadow-soft hover:bg-wine-800 transition-ui"
              >
                Próximo <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={goServices}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-wine-700 text-white text-label font-bold shadow-soft hover:bg-wine-800 transition-ui"
              >
                <Check className="h-4 w-4" /> Cadastrar serviços
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default OnboardingTour;
