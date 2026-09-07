"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type AnimationPlaybackControls,
} from "framer-motion";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import {
  crossFade,
  nearestSnapPoint,
  project,
  rubberband,
  spring,
  VelocityTracker,
} from "@/lib/lp/motion";

const testimonials = [
  { id: 1, src: "/depoimentos/1.png" },
  { id: 2, src: "/depoimentos/2.png" },
  { id: 3, src: "/depoimentos/3.png" },
  { id: 4, src: "/depoimentos/4.png" },
  { id: 5, src: "/depoimentos/5.png" },
  { id: 6, src: "/depoimentos/6.png" },
];

/** Passado desse deslocamento, o gesto é arrasto e não clique (hysteresis). */
const LIMIAR_ARRASTO = 10;

type Story = (typeof testimonials)[number];

export default function Testimonials() {
  const calmo = useReducedMotion();
  const [aberto, setAberto] = useState<Story | null>(null);

  return (
    <section className="bg-lp-cream py-20 sm:py-28 overflow-hidden">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Depoimentos</SectionLabel>
            <h2 className="mt-4 text-3xl font-semibold text-grafite sm:text-4xl">
              Quem trocou o direct{" "}
              <span className="accent text-bordo">pelo link.</span>
            </h2>
            <p className="mt-5 text-grafite/70">
              Arraste para ver o que mudou na rotina de quem parou de responder
              preço e horário no direct. Toque para ampliar.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 -mx-5 px-5 sm:-mx-8 sm:px-8">
          <Reveal delay={0.1}>
            <Trilho aoAbrir={setAberto} />
          </Reveal>
        </div>
      </div>

      <Lightbox story={aberto} aoFechar={() => setAberto(null)} calmo={!!calmo} />
    </section>
  );
}

/**
 * Trilho horizontal.
 *
 * No toque, quem manda é a rolagem nativa: o iOS já é a implementação de
 * referência de inércia e resistência de borda, e trocá-la por JS só piora.
 * No mouse não existe inércia nenhuma — então o arrasto é implementado aqui,
 * com as três peças que a skill descreve:
 *
 *   1:1        — o conteúdo fica colado no ponteiro enquanto ele se move;
 *   projeção   — ao soltar, o destino é calculado por decaimento exponencial
 *                da velocidade, e o encaixe escolhido é o mais próximo desse
 *                destino projetado (não do ponto onde a mão parou);
 *   borda mole — passar do fim resiste progressivamente e volta com mola.
 */
function Trilho({ aoAbrir }: { aoAbrir: (s: Story) => void }) {
  const railRef = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const moveu = useRef(false);
  const inicio = useRef({ x: 0, scroll: 0 });
  const tracker = useRef(new VelocityTracker());
  const anim = useRef<AnimationPlaybackControls | null>(null);

  /** Deslocamento visual quando o gesto passa do fim do trilho. */
  const overshoot = useMotionValue(0);

  const pontosDeEncaixe = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return [0];
    return Array.from(rail.children).map((c) => (c as HTMLElement).offsetLeft);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const rail = railRef.current;
    if (!rail) return;

    // Interrompe a inércia em voo a partir do valor ATUAL na tela — é o que
    // permite agarrar o trilho no meio do arremesso e mandar pro outro lado.
    anim.current?.stop();
    anim.current = null;

    arrastando.current = true;
    moveu.current = false;
    inicio.current = { x: e.clientX, scroll: rail.scrollLeft };
    tracker.current.reset();
    tracker.current.add(rail.scrollLeft);
    // A captura NÃO acontece aqui. Capturar no toque redireciona o `click`
    // seguinte pro trilho, e aí nenhum cartão abre mais. Ela entra só quando
    // o gesto vira arrasto de fato — que é quando ela serve pra alguma coisa.
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastando.current) return;
    const rail = railRef.current;
    if (!rail) return;

    // Antes do limiar ainda não há captura, e o botão pode ter sido solto fora
    // do trilho — sem isto o gesto continuaria "vivo" com a mão já livre.
    if (e.buttons === 0) {
      arrastando.current = false;
      return;
    }

    const dx = e.clientX - inicio.current.x;

    // Histerese: antes do limiar o gesto ainda pode ser um clique. Passou,
    // é arrasto — e só então o trilho toma o ponteiro pra si, pra continuar
    // recebendo os eventos mesmo se a mão sair da área dele.
    if (!moveu.current) {
      if (Math.abs(dx) <= LIMIAR_ARRASTO) return;
      moveu.current = true;
      rail.setPointerCapture(e.pointerId);
      rail.dataset.arrastando = "true";
    }

    const max = rail.scrollWidth - rail.clientWidth;
    const alvo = inicio.current.scroll - dx;

    if (alvo < 0) {
      rail.scrollLeft = 0;
      overshoot.set(rubberband(-alvo, rail.clientWidth));
    } else if (alvo > max) {
      rail.scrollLeft = max;
      overshoot.set(-rubberband(alvo - max, rail.clientWidth));
    } else {
      rail.scrollLeft = alvo;
      overshoot.set(0);
    }
    tracker.current.add(rail.scrollLeft - overshoot.get());
  };

  const finalizar = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!arrastando.current) return;
    const rail = railRef.current;
    if (!rail) return;

    arrastando.current = false;
    if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);

    // Nunca virou arrasto: era um clique, e o cartão cuida dele.
    if (!moveu.current) return;

    // Passou da borda: só volta. Não faz sentido projetar pra fora do trilho.
    if (overshoot.get() !== 0) {
      animate(overshoot, 0, spring.momentum)
        .finished.then(() => delete rail.dataset.arrastando)
        .catch(() => {});
      return;
    }

    const v = tracker.current.velocity; // px/s do CONTEÚDO rolando
    const destino = rail.scrollLeft + project(v);
    const alvo = Math.max(
      0,
      Math.min(rail.scrollWidth - rail.clientWidth, nearestSnapPoint(destino, pontosDeEncaixe()))
    );

    // A animação sai do valor que está na tela e recebe a velocidade da
    // soltura: não existe emenda visível entre arrastar e animar.
    anim.current = animate(rail.scrollLeft, alvo, {
      ...spring.momentum,
      velocity: v,
      onUpdate: (valor) => {
        rail.scrollLeft = valor;
      },
    });
    // Interromper o voo rejeita a promessa — e interromper é o comportamento
    // esperado aqui, não um erro.
    anim.current.finished
      .then(() => delete rail.dataset.arrastando)
      .catch(() => {});
  };

  return (
    <motion.div
      ref={railRef}
      layoutScroll
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finalizar}
      onPointerCancel={finalizar}
      style={{ x: overshoot }}
      className="lp-rail flex w-full gap-5 overflow-x-auto pb-8 pt-4 no-scrollbar"
    >
      {testimonials.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            // Arrastar não abre. Sem isso, todo flick termina num lightbox.
            if (moveu.current) return;
            aoAbrir(t);
          }}
          className="lp-story relative w-[280px] shrink-0 overflow-hidden rounded-2xl shadow-lp-card sm:w-[320px]"
          aria-label={`Ampliar depoimento ${t.id}`}
        >
          <motion.span layoutId={`story-${t.id}`} className="block">
            <Image
              src={t.src}
              alt={`Depoimento ${t.id}`}
              width={337}
              height={600}
              className="h-auto w-full object-cover"
              draggable={false}
              loading="lazy"
            />
          </motion.span>
        </button>
      ))}
    </motion.div>
  );
}

/**
 * Ampliação do depoimento.
 *
 * O story CRESCE do cartão que foi tocado e volta pra ele — a imagem é o mesmo
 * objeto o tempo todo, então a origem espacial fica óbvia e a saída percorre o
 * caminho de entrada ao contrário.
 *
 * Fechar por arrasto usa o SINAL DA VELOCIDADE, não a posição: um empurrão
 * curto e rápido fecha, um arrasto longo que voltou no fim não fecha.
 */
function Lightbox({
  story,
  aoFechar,
  calmo,
}: {
  story: Story | null;
  aoFechar: () => void;
  calmo: boolean;
}) {
  const y = useMotionValue(0);
  // Escurecimento contínuo DURANTE o gesto: o fundo clareia conforme a mão
  // afasta o story, então dá pra ver o que vai acontecer antes de soltar.
  const scrim = useTransform(y, [-320, 0, 320], [0, 1, 0]);

  return (
    <AnimatePresence onExitComplete={() => y.set(0)}>
      {story && (
        <motion.div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            style={calmo ? undefined : { opacity: scrim }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={crossFade}
            onClick={aoFechar}
          />

          <button
            onClick={aoFechar}
            className="lp-icon-btn absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full text-white sm:right-8 sm:top-8"
            aria-label="Fechar"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          <motion.div
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 sm:p-8"
            style={calmo ? undefined : { y }}
            drag={calmo ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.55}
            onDragEnd={(_, info) => {
              const rapido = Math.abs(info.velocity.y) > 450;
              const longe = Math.abs(info.offset.y) > 140;
              if (rapido || longe) aoFechar();
            }}
          >
            <motion.div
              layoutId={calmo ? undefined : `story-${story.id}`}
              initial={calmo ? { opacity: 0 } : undefined}
              animate={calmo ? { opacity: 1 } : undefined}
              exit={calmo ? { opacity: 0 } : undefined}
              transition={calmo ? crossFade : spring.ui}
              className="pointer-events-auto relative h-[85vh] w-full max-w-[500px] cursor-grab overflow-hidden rounded-2xl bg-black active:cursor-grabbing"
            >
              <Image
                src={story.src}
                alt="Depoimento ampliado"
                fill
                className="object-contain"
                draggable={false}
                priority
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
