'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Check, Lock, X } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { isDemo } from '@/lib/demo';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';
import { can, requiredPlan, CAPABILITY_LABEL, PLAN_LABEL, type Capability } from '@/lib/subscription/entitlements';

/** Prefixo da chave de persistência. A chave final é escopada por profissional
 *  (`lume_onboarding_v1:{professionalId}`) para que cada conta nova seja tratada
 *  como primeiro contato, mesmo que outra conta já tenha visto o tour no mesmo
 *  navegador.
 *
 *  O valor guardado é `'done'` (concluído/pulado) ou o ÍNDICE do passo em que
 *  ela parou — o tour tem uma volta inteira pelo menu e ninguém é obrigado a
 *  fazer tudo de uma sentada. Voltando depois, ele retoma de onde parou. */
const STORAGE_PREFIX = 'lume_onboarding_v1';
/** Evento global para reabrir o tour manualmente (ex.: botão "?" no Header). */
export const OPEN_ONBOARDING_EVENT = 'lume:open-onboarding';

/** Os capítulos são os MESMOS grupos da barra de navegação, na mesma ordem.
 *  É o que torna o tour coerente: quando ele acaba, o menu já é um mapa
 *  conhecido — "aquilo do dinheiro estava na terceira parte". */
const CHAPTERS = ['Atendimento', 'Clientes', 'Dinheiro', 'Seu negócio'] as const;

interface Step {
  /** Índice do capítulo; `null` na abertura e no encerramento. */
  chapter: number | null;
  /** Rota do módulo — o tour navega até ela antes de destacar. */
  route: string;
  /** Alvos a destacar, em ordem de preferência. Sem nenhum → cadeia padrão. */
  targets?: string[];
  /** `true` = card centralizado, sem destacar nada (abertura e fecho). */
  center?: boolean;
  /** Nome da aba, como está escrito no menu. */
  tab?: string;
  title: string;
  body: string;
  tip?: string;
  /** Recurso de plano exigido pela aba — vira um aviso quando ela não tem. */
  capability?: Capability;
}

/** Cadeia padrão de alvos: a ação principal do módulo, senão o cabeçalho do
 *  módulo, senão o título da aba na topbar (esse SEMPRE existe). É o que
 *  garante que nenhum passo caia numa tela sem nada aceso — inclusive nas
 *  abas que aparecem bloqueadas por plano. */
const DEFAULT_TARGETS = [
  '[data-tour="module-action"]',
  '[data-tour="module-header"]',
  '[data-tour="page-header"]',
];

interface Rect { top: number; left: number; width: number; height: number; }

interface OnboardingTourProps {
  firstName?: string;
  slug?: string;
  professionalId?: string;
  /** Plano da conta e se ele é aplicado — só para avisar o que está travado. */
  plan?: string | null;
  enforcePlan?: boolean;
}

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function buildSteps(firstName?: string, slug?: string): Step[] {
  const publicUrl = `lume.app/agendar/${slug || 'sua-marca'}`;

  return [
    // ── Abertura ────────────────────────────────────────────────────────────
    {
      chapter: null,
      route: '/dashboard',
      center: true,
      title: firstName ? `Oi, ${firstName}! Vamos dar uma volta?` : 'Vamos dar uma volta?',
      body: 'Em uns 2 minutos eu te mostro cada área do Lume, na ordem do menu. Pode sair quando quiser — o “?” lá em cima traz o tour de volta de onde você parou.',
    },

    // ── 1 · Atendimento ─────────────────────────────────────────────────────
    {
      chapter: 0,
      route: '/dashboard',
      tab: 'Início',
      targets: ['[data-tour="home-hero"]'],
      title: 'Seu dia inteiro numa tela',
      body: 'Faturamento do período, atendimentos de hoje e o que precisa de atenção. É a tela que abre quando você entra.',
    },
    {
      chapter: 0,
      route: '/dashboard/agenda',
      tab: 'Agenda',
      targets: ['[data-tour="quick-add"]'],
      title: 'A agenda por dia, semana e mês',
      body: 'Use o “+” para encaixar um horário na hora. Para remarcar, arraste o card para o novo horário — a cliente é avisada.',
    },
    {
      chapter: 0,
      route: '/dashboard/appointments',
      tab: 'Agendamentos',
      title: 'A lista de tudo que foi marcado',
      body: 'Confirme, finalize, registre falta ou cancele. Cada linha tem também o atalho para chamar a cliente no WhatsApp.',
    },
    {
      chapter: 0,
      route: '/dashboard/waitlist',
      tab: 'Lista de espera',
      capability: 'waitlist',
      title: 'Ninguém fica sem resposta',
      body: 'Quando não tem horário, a cliente entra na fila. Abriu um buraco na agenda, você já sabe quem chamar primeiro.',
    },
    {
      chapter: 0,
      route: '/dashboard/tasks',
      tab: 'Tarefas e notas',
      title: 'O que você não pode esquecer',
      body: 'Recados, pendências, compras. Se a tarefa tiver data e hora, ela aparece junto dos atendimentos na sua Agenda.',
    },

    // ── 2 · Clientes ────────────────────────────────────────────────────────
    {
      chapter: 1,
      route: '/dashboard/clients',
      tab: 'Contatos',
      title: 'Sua base de clientes',
      body: 'Histórico de cada pessoa, quanto já gastou e há quanto tempo não aparece. É desta tela que sai a reativação.',
    },
    {
      chapter: 1,
      route: '/dashboard/anamnese',
      tab: 'Fichas de anamnese',
      title: 'Ficha preenchida antes de chegar',
      body: 'Monte a ficha uma vez, mande o link para a cliente responder pelo celular e receba tudo organizado em PDF.',
    },
    {
      chapter: 1,
      route: '/dashboard/whatsapp/conversas',
      tab: 'WhatsApp',
      capability: 'conversations',
      title: 'Suas conversas, dentro do Lume',
      body: 'Leia e responda o WhatsApp sem trocar de aplicativo — com a agenda e o histórico da cliente do lado.',
    },
    {
      chapter: 1,
      route: '/dashboard/whatsapp',
      tab: 'Mensagens automáticas',
      capability: 'whatsappBot',
      title: 'O Lume avisa suas clientes por você',
      body: 'Conecte seu número aqui e o sistema manda sozinho a confirmação, o lembrete da véspera e o convite de retorno.',
      tip: 'É o ajuste que mais reduz falta — e o que mais economiza o seu tempo digitando.',
    },
    ...(AI_ATTENDANCE_ENABLED
      ? [{
        chapter: 1,
        route: '/dashboard/pending',
        tab: 'Atendimento IA',
        capability: 'conversations' as Capability,
        title: 'Quando a IA chama você',
        body: 'A assistente responde as clientes sozinha e passa para você as conversas que precisam de gente. Elas ficam nesta fila.',
      } satisfies Step]
      : []),

    // ── 3 · Dinheiro ────────────────────────────────────────────────────────
    {
      chapter: 2,
      route: '/dashboard/finance',
      tab: 'Financeiro',
      title: 'Quanto entrou, quanto saiu, quanto sobrou',
      body: 'Atendimento finalizado vira entrada sozinho. Você só lança as despesas e as vendas avulsas — sem planilha.',
    },
    {
      chapter: 2,
      route: '/dashboard/sales',
      tab: 'Vendas',
      capability: 'sales',
      title: 'Quais serviços realmente pagam',
      body: 'Ranking de serviços, ticket médio e as clientes que mais gastam. É o raio-x de onde o seu faturamento nasce.',
    },

    // ── 4 · Seu negócio ─────────────────────────────────────────────────────
    {
      chapter: 3,
      route: '/dashboard/site',
      tab: 'Minha Página',
      title: 'Seu site e seu link na bio',
      body: 'Escolha um modelo, ajuste as cores e publique. A página já vem com o agendamento embutido — é o link que você põe no Instagram.',
      tip: `Seu endereço: ${publicUrl}`,
    },
    {
      chapter: 3,
      route: '/dashboard/services',
      tab: 'Serviços',
      title: 'Comece por aqui: seus serviços',
      body: 'Cadastre cada procedimento com preço e duração. É exatamente esta lista que a cliente vê na hora de escolher um horário.',
      tip: 'Sem nenhum serviço cadastrado, ninguém consegue agendar com você.',
    },
    {
      chapter: 3,
      route: '/dashboard/availability',
      tab: 'Disponibilidade',
      title: 'Os dias e horas em que você atende',
      body: 'Marque o expediente de cada dia e o intervalo de almoço. O Lume só oferece à cliente horário dentro dessa janela.',
    },
    {
      chapter: 3,
      route: '/dashboard/blocks',
      tab: 'Bloqueios',
      capability: 'blocks',
      title: 'Folga, viagem, imprevisto',
      body: 'Feche um dia inteiro ou só algumas horas. A agenda para de aceitar agendamento nesse período, sem você mexer no expediente.',
    },
    {
      chapter: 3,
      route: '/dashboard/settings',
      tab: 'Configurações',
      title: 'As regras do seu atendimento',
      body: 'Seus dados, antecedência mínima, aprovação manual, sinal de pagamento e as cores da marca que a cliente enxerga.',
    },

    // ── Encerramento ────────────────────────────────────────────────────────
    {
      chapter: null,
      route: '/dashboard',
      targets: ['[data-tour="ai-chat"]'],
      title: 'Ficou com dúvida? É só perguntar',
      body: 'A assistente abre em qualquer tela — no computador, pelo botão “Assistente”; no celular, pelo menu. Peça um resumo do mês, tire dúvida ou peça para ela fazer por você.',
    },
    {
      chapter: null,
      route: '/dashboard',
      center: true,
      title: 'Pronto! Agora é com você 🎉',
      body: 'Para receber o primeiro agendamento faltam três coisas: cadastrar seus serviços, definir seus horários e compartilhar seu link.',
      tip: 'Vamos pelo começo — eu te levo aos Serviços.',
    },
  ];
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  firstName, slug, professionalId, plan, enforcePlan,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const storageKey = `${STORAGE_PREFIX}:${professionalId || 'anon'}`;

  const steps = useMemo(() => buildSteps(firstName, slug), [firstName, slug]);
  const total = steps.length;

  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [ready, setReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const [card, setCard] = useState({ w: 360, h: 280 });
  const [compact, setCompact] = useState(false);

  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Aba travada pelo plano: o passo continua existindo (ela precisa saber que
  // a área existe), mas o card diz que está no plano de cima em vez de deixar
  // a tela de upgrade aparecer sem explicação.
  const lockedBy = step.capability && enforcePlan && !can(plan, step.capability)
    ? step.capability
    : null;

  const chapterSteps = useMemo(
    () => CHAPTERS.map((_, c) => steps.filter((s) => s.chapter === c).length),
    [steps],
  );
  const posInChapter = step.chapter === null
    ? 0
    : steps.slice(0, index + 1).filter((s) => s.chapter === step.chapter).length;
  /** Abertura e encerramento não têm capítulo: na abertura a barra está
   *  vazia, no encerramento ela está cheia. */
  const afterAllChapters = step.chapter === null && steps.slice(0, index).some((s) => s.chapter !== null);

  // ── Abertura / persistência ───────────────────────────────────────────────
  /** Já concluiu (ou pulou) alguma vez? Então nada mais volta a chave para um
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

  // Deixa as próximas telas prontas antes de a pessoa clicar em "Próximo":
  // é o que faz a troca de passo parecer instantânea em vez de carregar.
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
        setReady(true);
        if (Date.now() - from < 600) requestAnimationFrame(tick);
      };
      tick();
    };

    if (!selectors.length) {
      const t = setTimeout(() => {
        if (cancelled) return;
        setRect(null);
        setReady(true);
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
        setReady(true);
      }
    }, 80);

    return () => { cancelled = true; window.clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index, pathname]);

  // Passo novo: esconde o conteúdo do card enquanto o alvo é localizado, mas
  // o holofote e o card CONTINUAM na tela, indo do alvo antigo para o novo.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(false);
  }, [index]);

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

    const margin = 16;
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
    return { top, left, arrow, arrowLeft: clamp(centerX - left, 24, Math.max(24, w - 24)) };
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
  const jumpToChapter = (c: number) => {
    const i = steps.findIndex((s) => s.chapter === c);
    if (i >= 0) go(i);
  };

  // O holofote existe SEMPRE — o escurecimento da tela é o próprio box-shadow
  // dele. Sem alvo, ele encolhe para um ponto no centro (a tela fica toda
  // escura) em vez de o overlay aparecer e sumir a cada passo.
  const hole: Rect = rect && !step.center
    ? rect
    : { top: typeof window !== 'undefined' ? window.innerHeight / 2 : 0, left: typeof window !== 'undefined' ? window.innerWidth / 2 : 0, width: 0, height: 0 };
  const spotlit = !!rect && !step.center;

  const chapterLabel = step.chapter !== null ? CHAPTERS[step.chapter] : null;

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

      {/* Card do passo */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial — passo ${index + 1} de ${total}`}
        className="fixed z-[88] w-[min(380px,calc(100vw-24px))] bg-surface rounded-hero shadow-[var(--shadow-lg)] overflow-hidden"
        style={{
          top: pos.top,
          left: pos.left,
          transition: 'top .42s cubic-bezier(.22,.61,.36,1), left .42s cubic-bezier(.22,.61,.36,1)',
        }}
      >
        {pos.arrow && spotlit && (
          <span
            className={`absolute h-3.5 w-3.5 rotate-45 bg-surface ${pos.arrow === 'top' ? '-top-[7px]' : '-bottom-[7px]'}`}
            style={{ left: pos.arrowLeft - 7 }}
            aria-hidden
          />
        )}

        <div className="p-5">
          {/* Linha de contexto: onde estamos na volta pelo menu. */}
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-caption font-semibold text-n-500">
              {chapterLabel ? (
                <>
                  <span className="text-wine-700">{chapterLabel}</span>
                  <span className="text-n-300"> · </span>
                  {step.tab}
                  <span className="text-n-400"> {posInChapter}/{chapterSteps[step.chapter!]}</span>
                </>
              ) : (
                <span className="text-wine-700">Tutorial do Lume</span>
              )}
            </p>
            <button
              type="button"
              onClick={finish}
              aria-label="Sair do tutorial"
              className="icon-chip h-9 w-9 shrink-0 text-n-500 hover:text-heading focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Progresso por capítulo — clicável para pular direto para uma parte. */}
          <div className="mt-3 flex items-center gap-1.5">
            {CHAPTERS.map((label, c) => {
              const done = step.chapter === null
                ? (afterAllChapters ? 1 : 0)
                : step.chapter > c ? 1 : step.chapter < c ? 0 : posInChapter / chapterSteps[c];
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => jumpToChapter(c)}
                  title={label}
                  aria-label={`Ir para a parte ${label}`}
                  className="group flex-1 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 rounded-full"
                >
                  <span className="block h-1 rounded-full bg-n-200 overflow-hidden group-hover:bg-n-300 transition-ui">
                    <span
                      className="block h-full rounded-full bg-wine-700"
                      style={{ width: `${Math.round(done * 100)}%`, transition: 'width .42s cubic-bezier(.22,.61,.36,1)' }}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo. A `key` faz o texto entrar com fade a cada passo — sem
              ela o card troca de assunto de um frame para o outro. */}
          <div key={index} className="animate-fade-up">
            <h2 className="mt-2 text-h3 font-semibold leading-tight tracking-tight text-heading">{step.title}</h2>
            <p className="mt-2 text-label leading-relaxed text-n-600">{step.body}</p>

            {lockedBy && (
              <div className="mt-3 flex items-start gap-2 rounded-chip bg-surface-2 px-3 py-2">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-n-500" aria-hidden />
                <p className="text-caption text-n-600">
                  <b className="text-heading">{CAPABILITY_LABEL[lockedBy]}</b> entra a partir do plano{' '}
                  {PLAN_LABEL[requiredPlan(lockedBy)]}.
                </p>
              </div>
            )}

            {step.tip && !lockedBy && (
              <div className="mt-3 rounded-chip bg-accent-soft border border-accent-soft-border px-3.5 py-2.5">
                <p className="text-caption font-semibold text-wine-700 break-words">{step.tip}</p>
              </div>
            )}
          </div>

          {/* Navegação */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => go(index - 1)}
              disabled={isFirst}
              className="inline-flex items-center gap-1.5 h-11 px-3 rounded-full text-body-sm font-semibold text-n-600 hover:bg-n-100 hover:text-heading disabled:opacity-0 disabled:pointer-events-none transition-ui"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar
            </button>
            <div className="flex-1" />
            {isLast ? (
              <button
                type="button"
                onClick={goServices}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-wine-700 text-white text-body-sm font-semibold shadow-[var(--shadow-wine)] hover:bg-wine-800 transition-ui"
              >
                <Check className="h-4 w-4" aria-hidden /> Cadastrar meus serviços
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-wine-700 text-white text-body-sm font-semibold shadow-[var(--shadow-wine)] hover:bg-wine-800 transition-ui"
              >
                {isFirst ? 'Começar' : 'Próximo'} <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default OnboardingTour;
