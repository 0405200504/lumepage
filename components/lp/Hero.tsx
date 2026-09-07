"use client";

import { motion, useReducedMotion } from "framer-motion";
import Button from "./Button";
import Sparkle from "./Sparkle";
import Script from "next/script";
import { crossFade, spring } from "@/lib/lp/motion";

/**
 * Entrada em cascata do topo.
 *
 * Molas criticamente amortecidas (sem repique): ninguém arremessou nada aqui,
 * o conteúdo só está chegando. Repique numa manchete que apenas apareceu lê
 * como defeito, não como física. O atraso entre os blocos é pequeno de
 * propósito — a cascata orienta a leitura, não vira espetáculo.
 */
const ENTRA = 0.06;

export default function Hero() {
  const calmo = useReducedMotion();
  /** Uma mola pra tudo; muda só a espera. */
  const entra = (ordem: number) =>
    calmo
      ? { ...crossFade, delay: ordem * ENTRA }
      : { ...spring.ui, delay: ordem * ENTRA };
  const de = (y: number) => (calmo ? { opacity: 0 } : { opacity: 0, y });
  const para = calmo ? { opacity: 1 } : { opacity: 1, y: 0 };

  return (
    <section
      id="topo"
      className="relative overflow-hidden bg-offwhite pt-14 pb-16 sm:pt-16 lg:pt-20"
    >
      {/* gradiente sutil de fundo */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-24 h-96 w-96 rounded-full bg-rose/30 blur-3xl" />
        <div className="absolute -left-24 top-40 h-80 w-80 rounded-full bg-areia/20 blur-3xl" />
      </div>

      <div className="container-lume relative flex flex-col lg:grid lg:items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
        {/* coluna texto */}
        <div className="order-2 lg:order-1">
          <motion.span
            initial={de(12)}
            animate={para}
            transition={entra(0)}
            className="eyebrow"
          >
            <Sparkle size={13} className="animate-sparkle-pulse" />
            Para profissionais da estética
          </motion.span>

          {/* Corpo em clamp e entrelinhamento apertado: título grande precisa
              de linhas mais próximas, e o tracking negativo vem da escala
              tipográfica da LP (h1 = -0.036em). */}
          <motion.h1
            initial={de(20)}
            animate={para}
            transition={entra(1)}
            className="mt-5 font-sora text-[clamp(2.25rem,6vw,3.5rem)] font-semibold leading-[1.02] text-grafite"
          >
            Sua cliente não quer conversar.
            <br />
            <span className="accent text-bordo">Ela quer agendar.</span>
          </motion.h1>

          <motion.p
            initial={de(20)}
            animate={para}
            transition={entra(2)}
            className="mt-6 max-w-xl text-base leading-[1.65] text-grafite/70 sm:text-lg"
          >
            A Lume transforma o link da sua bio numa página que mostra seus
            serviços, seus preços e seus horários — e deixa a cliente agendar
            sozinha, em{" "}
            <strong className="font-semibold text-grafite">40 segundos</strong>,
            sem passar pelo seu direct. Você só recebe o aviso de horário
            marcado.
          </motion.p>

          <motion.div
            initial={de(20)}
            animate={para}
            transition={entra(3)}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <Button>Testar 7 dias grátis</Button>
            <Button href="#o-que-ela-ve" variant="ghost">
              Ver uma página de exemplo →
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={entra(4)}
            className="lp-fine mt-4 max-w-md text-sm text-grafite/55"
          >
            Sem cartão de crédito. Sem fidelidade. Sua página no ar em 10
            minutos.
          </motion.p>
        </div>

        {/* coluna visual - Vturb Video */}
        <div className="order-1 lg:order-2 relative mx-auto flex w-full max-w-lg items-center justify-center lg:max-w-none">
          {/* Superfície grande lê como mais espessa: sombra mais funda que a
              dos cartões pequenos da página. */}
          <motion.div
            initial={calmo ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 24 }}
            animate={calmo ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
            transition={entra(2)}
            className="w-full relative mx-auto max-w-[400px] rounded-[1.75rem] overflow-hidden border-4 border-offwhite bg-lp-cream shadow-[0_50px_120px_-40px_rgba(44,37,39,0.55)]"
          >
            {/* VSL vertical (9:16). O placeholder segura a proporção antes de o
                player carregar — sem ele a página pula quando o vídeo entra. */}
            <div
              dangerouslySetInnerHTML={{
                __html: `<vturb-smartplayer id="vid-6a8e06d60d360e5354bf0e39" style="display: block; margin: 0 auto; width: 100%; max-width: 400px;"><div class="vturb-player-placeholder" style="position: relative; width: 100%; padding: 177.77777777777777% 0 0; z-index: 0; background-color: black;"></div></vturb-smartplayer>`,
              }}
            />
            <Script
              src="https://scripts.converteai.net/ea6f933a-58f6-43de-ab88-f29019a12a63/players/6a8e06d60d360e5354bf0e39/v4/player.js"
              strategy="afterInteractive"
            />
          </motion.div>
        </div>
      </div>

      {/* linha fina decorativa */}
      <div className="container-lume mt-16">
        <div className="hairline" />
      </div>
    </section>
  );
}
