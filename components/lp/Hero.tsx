"use client";

import { motion } from "framer-motion";
import Button from "./Button";
import Sparkle from "./Sparkle";
import Script from "next/script";

export default function Hero() {
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="eyebrow"
          >
            <Sparkle size={13} className="animate-sparkle-pulse" />
            Para profissionais da estética
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.05 }}
            className="mt-5 font-sora text-4xl font-semibold leading-[1.08] text-grafite sm:text-5xl lg:text-[3.5rem]"
          >
            Sua cliente não quer conversar.
            <br />
            <span className="accent text-bordo">Ela quer agendar.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mt-6 max-w-xl text-base leading-relaxed text-grafite/70 sm:text-lg"
          >
            A Lume transforma o link da sua bio numa página que mostra seus
            serviços, seus preços e seus horários — e deixa a cliente agendar
            sozinha, em{" "}
            <strong className="font-semibold text-grafite">40 segundos</strong>,
            sem passar pelo seu direct. Você só recebe o aviso de horário
            marcado.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
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
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-4 max-w-md text-sm text-grafite/55"
          >
            Sem cartão de crédito. Sem fidelidade. Sua página no ar em 10
            minutos.
          </motion.p>
        </div>

        {/* coluna visual - Vturb Video */}
        <div className="order-1 lg:order-2 relative mx-auto flex w-full max-w-lg items-center justify-center lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full relative rounded-2xl overflow-hidden shadow-2xl border-4 border-offwhite bg-lp-cream"
          >
            <div
              dangerouslySetInnerHTML={{
                __html: `<vturb-smartplayer id="vid-6a275c5e135e043f2b6fc9db" style="display: block; margin: 0 auto; width: 100%; "></vturb-smartplayer>`,
              }}
            />
            <Script
              src="https://scripts.converteai.net/ea6f933a-58f6-43de-ab88-f29019a12a63/players/6a275c5e135e043f2b6fc9db/v4/player.js"
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
