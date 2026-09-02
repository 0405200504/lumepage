'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { isDemo } from '@/lib/demo';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';

/** Prefixo da chave de persistência. A chave final é escopada por profissional
 *  (`lume_onboarding_v1:{professionalId}`) para que cada conta nova seja tratada
 *  como primeiro contato, mesmo que outra conta já tenha visto o tour no mesmo
 *  navegador.
 *
 *  O valor é `'done'` (concluído ou pulado) ou o ÍNDICE do passo em que ela
 *  parou — o tour dá uma volta pelo menu inteiro e ninguém é obrigado a fazer
 *  tudo de uma sentada. Voltando depois, ele retoma de onde parou. */
const STORAGE_PREFIX = 'lume_onboarding_v1';
/** Evento global para reabrir o tour manualmente (ex.: botão "?" no Header). */
export const OPEN_ONBOARDING_EVENT = 'lume:open-onboarding';

/**
 * UMA FRASE POR ABA.
 *
 * A versão anterior tinha capítulos, barra de progresso segmentada, caixas de
 * dica e aviso de plano — um cartão que precisava ser LIDO dezesseis vezes.
 * Aqui o card carrega o nome da aba, uma frase e o botão. É o suficiente para
 * dizer "isto serve para isso" e seguir; o produto ensina o resto quando ela
 * chegar na tela para valer.
 *
 * A ordem é a do menu lateral, de cima para baixo: quando o tour acaba, a
 * barra virou um mapa conhecido.
 */
interface Step {
  /** Rota da aba — o tour navega até ela antes de destacar. */
  route: string;
  /** Nome da aba, escrito como está no menu. `null` no encerramento. */
  tab: string | null;
  /** Alvos a destacar, em ordem de preferência. Sem nenhum → cadeia padrão. */
  targets?: string[];
  /** Card centralizado, sem holofote. */
  center?: boolean;
  body: string;
}

/** Cadeia padrão de alvos: a ação principal do módulo, senão o cabeçalho do
 *  módulo, senão o título da aba na topbar (esse SEMPRE existe). É o que
 *  garante que nenhum passo caia numa tela sem nada aceso. */
const DEFAULT_TARGETS = [
  '[data-tour="module-action"]',
  '[data-tour="module-header"]',
  '[data-tour="page-header"]',
];

interface Rect { top: number; left: number; width: number; height: number; }

interface OnboardingTourProps {
  firstName?: string;
  professionalId?: string;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function buildSteps(firstName?: string): Step[] {
  return [
    {
      route: '/dashboard',
      tab: 'Início',
      targets: ['[data-tour="home-hero"]'],
      body: firstName
        ? `Oi, ${firstName}! Em um minuto eu passo por cada aba. Esta é a Início: seu faturamento e o seu dia.`
        : 'Em um minuto eu passo por cada aba. Esta é a Início: seu faturamento e o seu dia.',
    },
    {
      route: '/dashboard/agenda',
      tab: 'Agenda',
      targets: ['[data-tour="quick-add"]'],
      body: 'Toque no “+” para encaixar um horário. Para remarcar, arraste o card.',
    },
    {
      route: '/dashboard/appointments',
      tab: 'Agendamentos',
      body: 'A lista do que foi marcado — confirme, finalize ou registre falta.',
    },
    {
      route: '/dashboard/waitlist',
      tab: 'Lista de espera',
      body: 'Sem horário livre, a cliente entra na fila e você chama quando abrir.',
    },
    {
      route: '/dashboard/tasks',
      tab: 'Tarefas e notas',
      body: 'Anote o que não pode esquecer. Com data, a tarefa aparece na Agenda.',
    },
    {
      route: '/dashboard/clients',
      tab: 'Contatos',
      body: 'O histórico de cada cliente: quanto gastou e há quanto tempo sumiu.',
    },
    {
      route: '/dashboard/anamnese',
      tab: 'Fichas de anamnese',
      body: 'Monte a ficha, mande o link e receba tudo respondido em PDF.',
    },
    {
      route: '/dashboard/whatsapp/conversas',
      tab: 'WhatsApp',
      body: 'Leia e responda suas conversas sem sair do Lume.',
    },
    {
      route: '/dashboard/whatsapp',
      tab: 'Mensagens automáticas',
      body: 'Conecte seu número e o Lume manda confirmação, lembrete e retorno sozinho.',
    },
    ...(AI_ATTENDANCE_ENABLED
      ? [{
        route: '/dashboard/pending',
        tab: 'Atendimento IA',
        body: 'As conversas que a assistente não resolveu sozinha esperam por você aqui.',
      } satisfies Step]
      : []),
    {
      route: '/dashboard/finance',
      tab: 'Financeiro',
      body: 'O que entrou, o que saiu e quanto sobrou no mês.',
    },
    {
      route: '/dashboard/sales',
      tab: 'Vendas',
      body: 'Quais serviços mais vendem e quem mais gasta com você.',
    },
    {
      route: '/dashboard/site',
      tab: 'Minha Página',
      body: 'Seu site e seu link na bio, com o agendamento já embutido.',
    },
    {
      route: '/dashboard/services',
      tab: 'Serviços',
      body: 'Cadastre preço e duração. É esta lista que a cliente vê ao agendar.',
    },
    {
      route: '/dashboard/availability',
      tab: 'Disponibilidade',
      body: 'Os dias e as horas em que você atende — e o intervalo de almoço.',
    },
    {
      route: '/dashboard/blocks',
      tab: 'Bloqueios',
      body: 'Feche um dia ou algumas horas para folga e imprevisto.',
    },
    {
      route: '/dashboard/settings',
      tab: 'Configurações',
      body: 'Seus dados, as regras de agendamento e as cores da sua marca.',
    },
    {
      route: '/dashboard',
      tab: null,
      center: true,
      body: 'É isso. Comece cadastrando seus serviços — sem eles ninguém consegue agendar. Para rever o tour, toque no “?” lá em cima.',
    },
  ];
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ firstName, professionalId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = `${STORAGE_PREFIX}:${professionalId || 'anon'}`;

  const steps = useMemo(() => buildSteps(firstName), [firstName]);
  const total = steps.length;
  /** O contador conta ABAS, não passos: o encerramento não é uma parada. */
  const tabs = useMemo(() => steps.filter((s) => s.tab !== null).length, [steps]);

  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [readyFor, setReadyFor] = useState(-1);
  const cardRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState({ w: 320, h: 180 });
  const [compact, setCompact] = useState(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const ready = readyFor === index;

  // ── Abertura / persistência ───────────────────────────────────────────────
  /** Já concluiu (ou pulou) alguma vez? Então nada volta a chave para um
   *  índice — senão rever o tour pelo "?" faria ele abrir sozinho de novo no
   *  próximo login. */
  const doneRef = useRef(false);

  const persist = useCallback((value: string) => {
    // Na conta demo NÃO persiste: o tour precisa reaparecer para o próximo
    // visitante que entrar com a conta de exemplo.
    if (isDemo(professionalId)) return;
    try { localStorage.setItem(storageKey, value); } catch { /* modo privativo */ }
  }, [storageKey, professionalId]);

  const finish = useCallback(() => {
    doneRef.current = true;
    persist('done');
    setVisible(false);
  }, [persist]);

  useEffect(() => {
    if (isDemo(professionalId)) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    let saved = 'done';
    try { saved = localStorage.getItem(storageKey) ?? ''; } catch { /* ignore */ }
    if (saved === 'done') { doneRef.current = true; return; }
    const resumeAt = Number(saved);
    const t = setTimeout(() => {
      if (Number.isFinite(resumeAt) && resumeAt > 0 && resumeAt < total) setIndex(resumeAt);
      setVisible(true);
    }, 600);
    return () => clearTimeout(t);
  }, [storageKey, professionalId, total]);

  // Reabrir manualmente (botão "?" da topbar): retoma de onde parou; quem já
  // fez o tour inteiro recomeça do começo, que é o que "rever" quer dizer.
  useEffect(() => {
    const open = () => {
      if (doneRef.current) setIndex(0);
      setVisible(true);
    };
    window.addEventListener(OPEN_ONBOARDING_EVENT, open);
    return () => window.removeEventListener(OPEN_ONBOARDING_EVENT, open);
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (isLast) { doneRef.current = true; persist('done'); return; }
    if (doneRef.current) return;
    persist(String(index));
  }, [visible, index, isLast, persist]);

  // Telas estreitas: o card ancora no rodapé em vez de perseguir o alvo.
  useEffect(() => {
    const check = () => setCompact(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Navegação até a rota do passo ─────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    if (step.route && pathname !== step.route) router.push(step.route);
  }, [visible, index, step.route, pathname, router]);

  // Deixa as próximas telas prontas antes de ela clicar em "Próximo": é o que
  // faz a troca de passo parecer instantânea em vez de carregar.
  useEffect(() => {
    if (!visible) return;
    for (const next of steps.slice(index + 1, index + 3)) {
      try { router.prefetch(next.route); } catch { /* rota já em cache */ }
    }
  }, [visible, index, steps, router]);

  // ── Localiza e mede o alvo ────────────────────────────────────────────────
  // Só começa DEPOIS que a rota do passo já é a rota atual: o alvo padrão
  // (`page-header`) mora na casca, que não remonta, e sem essa espera o
  // holofote acendia no título da tela anterior.
  useEffect(() => {
    if (!visible) return;
    if (step.route && pathname !== step.route) return;

    let cancelled = false;
    const selectors = step.center ? [] : (step.targets ?? DEFAULT_TARGETS);
    const started = Date.now();

    const find = (): Element | null => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && (el as HTMLElement).offsetParent !== null) return el;
      }
      return null;
    };

    // Mede em rajada por ~600ms: a troca de rota anima (fade + 6px de subida)
    // e a primeira medida sairia deslocada.
    const track = (el: Element) => {
      const from = Date.now();
      const tick = () => {
        if (cancelled) return;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        setReadyFor(index);
        if (Date.now() - from < 600) requestAnimationFrame(tick);
      };
      tick();
    };

    if (!selectors.length) {
      const t = setTimeout(() => {
        if (cancelled) return;
        setRect(null);
        setReadyFor(index);
      }, 120);
      return () => { cancelled = true; clearTimeout(t); };
    }

    const poll = window.setInterval(() => {
      if (cancelled) return;
      const el = find();
      if (el) {
        window.clearInterval(poll);
        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        track(el);
      } else if (Date.now() - started > 1400) {
        // Módulo lento ou tela de upgrade: card centralizado, sem holofote.
        window.clearInterval(poll);
        setRect(null);
        setReadyFor(index);
      }
    }, 80);

    return () => { cancelled = true; window.clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, pathname]);

  // Acompanha rolagem e redimensionamento.
  useEffect(() => {
    if (!visible || !ready || step.center) return;
    const selectors = step.targets ?? DEFAULT_TARGETS;
    const update = () => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        return;
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, ready, index]);

  // Tamanho do card — entra no cálculo da posição.
  useEffect(() => {
    if (!visible) return;
    const el = cardRef.current;
    if (!el) return;
    const measure = () => setCard({ w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visible]);

  // ── Posição do card ───────────────────────────────────────────────────────
  const pos = useMemo(() => {
    if (typeof window === 'undefined') return { top: 0, left: 0, arrow: null as 'top' | 'bottom' | null, arrowLeft: 0 };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const { w, h } = card;

    // Celular: o card mora no rodapé. Perseguir o alvo numa tela de 375px
    // empurra o cartão para fora da área do polegar a cada passo.
    if (compact) {
      return { top: Math.max(16, vh - h - 20), left: Math.max(12, (vw - w) / 2), arrow: null, arrowLeft: 0 };
    }
    if (!rect || step.center) {
      return { top: Math.max(16, (vh - h) / 2), left: Math.max(16, (vw - w) / 2), arrow: null, arrowLeft: 0 };
    }

    const margin = 14;
    const centerX = rect.left + rect.width / 2;
    const left = clamp(centerX - w / 2, 16, Math.max(16, vw - w - 16));
    let top: number;
    let arrow: 'top' | 'bottom';
    if (rect.top + rect.height + margin + h <= vh - 16) {
      top = rect.top + rect.height + margin; arrow = 'top';
    } else if (rect.top - margin - h >= 16) {
      top = rect.top - margin - h; arrow = 'bottom';
    } else {
      top = clamp(rect.top + rect.height + margin, 16, Math.max(16, vh - h - 16)); arrow = 'top';
    }
    return { top, left, arrow, arrowLeft: clamp(centerX - left, 22, Math.max(22, w - 22)) };
  }, [rect, card, compact, step.center]);

  // ── Teclado ───────────────────────────────────────────────────────────────
  const go = useCallback((i: number) => setIndex(clamp(i, 0, total - 1)), [total]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish();
      if (e.key === 'ArrowRight' && !isLast) go(index + 1);
      if (e.key === 'ArrowLeft' && index > 0) go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, isLast, index, go, finish]);

  if (!visible) return null;

  const goServices = () => { finish(); router.push('/dashboard/services'); };

  // O holofote existe SEMPRE — o escurecimento da tela é o próprio box-shadow
  // dele. Sem alvo, ele encolhe para um ponto no centro (a tela fica toda
  // escura) em vez de o overlay aparecer e sumir a cada passo.
  const hole: Rect = rect && !step.center
    ? rect
    : { top: window.innerHeight / 2, left: window.innerWidth / 2, width: 0, height: 0 };
  const spotlit = !!rect && !step.center;

  return (
    <Portal>
      {/* Captura os cliques do app sem pintar nada: quem escurece é o holofote. */}
      <div className="fixed inset-0 z-[85]" onClick={(e) => e.stopPropagation()} aria-hidden />

      <div
        className="fixed z-[86] rounded-2xl pointer-events-none"
        style={{
          top: hole.top - 6,
          left: hole.left - 6,
          width: hole.width + 12,
          height: hole.height + 12,
          boxShadow: `0 0 0 9999px rgba(26,14,18,${spotlit ? 0.6 : 0.55})`,
          outline: spotlit ? '2px solid rgba(255,255,255,0.85)' : '2px solid transparent',
          outlineOffset: -2,
          transition: 'top .42s cubic-bezier(.22,.61,.36,1), left .42s cubic-bezier(.22,.61,.36,1), width .42s cubic-bezier(.22,.61,.36,1), height .42s cubic-bezier(.22,.61,.36,1), outline-color .3s linear',
        }}
        aria-hidden
      />

      {/* O card: nome da aba, uma frase, o botão. Nada mais. */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial — ${step.tab ?? 'fim'}`}
        className="fixed z-[88] w-[min(330px,calc(100vw-24px))] bg-surface rounded-hero shadow-[var(--shadow-lg)]"
        style={{
          top: pos.top,
          left: pos.left,
          transition: 'top .42s cubic-bezier(.22,.61,.36,1), left .42s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {pos.arrow && spotlit && (
          <span
            className={`absolute h-3 w-3 rotate-45 bg-surface ${pos.arrow === 'top' ? '-top-[6px]' : '-bottom-[6px]'}`}
            style={{ left: pos.arrowLeft - 6 }}
            aria-hidden
          />
        )}

        <div className="p-4">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-body-sm font-semibold text-heading">
              {step.tab ?? 'Tudo pronto'}
            </p>
            {step.tab && (
              <span className="mono-micro shrink-0 text-n-400 tabular-nums">{index + 1}/{tabs}</span>
            )}
            <button
              type="button"
              onClick={finish}
              aria-label="Sair do tutorial"
              className="-mr-1 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-n-400 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* A `key` faz a frase entrar com fade a cada passo. */}
          <p key={index} className="animate-fade-up mt-1.5 text-label leading-relaxed text-n-600">
            {step.body}
          </p>

          <div className="mt-3.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={isFirst}
              aria-label="Passo anterior"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-n-500 hover:bg-n-100 hover:text-heading disabled:opacity-0 disabled:pointer-events-none transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex-1" />
            {isLast ? (
              <button
                type="button"
                onClick={goServices}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-wine-700 text-white text-caption font-semibold hover:bg-wine-800 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              >
                Cadastrar serviços <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-wine-700 text-white text-caption font-semibold hover:bg-wine-800 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              >
                Próximo <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default OnboardingTour;
