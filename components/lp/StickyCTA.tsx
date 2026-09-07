"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CTA_LINK } from "@/lib/lp/site";
import { crossFade, spring } from "@/lib/lp/motion";

/**
 * CTA fixo no rodapé do celular.
 *
 * Duas coisas mudaram em relação à versão anterior:
 *
 * - Ele MATERIALIZA em vez de só deslizar: desfoque, escala e opacidade
 *   animam juntos, então a superfície chega como vidro se formando, não como
 *   um retângulo empurrado. Some pelo mesmo caminho por onde entrou.
 * - A mola tem um repique mínimo (damping 0.8) porque a rolagem do usuário é
 *   que traz o elemento — existe inércia na origem do movimento.
 */
export default function StickyCTA() {
  const calmo = useReducedMotion();
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisivel(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          className="lp-sticky-cta fixed inset-x-0 bottom-0 z-40 p-3 sm:hidden"
          initial={calmo ? { opacity: 0 } : { y: "100%", opacity: 0, filter: "blur(12px)" }}
          animate={calmo ? { opacity: 1 } : { y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={calmo ? { opacity: 0 } : { y: "100%", opacity: 0, filter: "blur(12px)" }}
          transition={calmo ? crossFade : spring.sheet}
        >
          <a
            href={CTA_LINK}
            className="btn-press flex w-full flex-col items-center justify-center rounded-full bg-bordo py-2.5 text-sm font-semibold text-offwhite shadow-lp-glow"
          >
            <span>Testar 7 dias grátis</span>
            <span className="mt-0.5 text-[0.625rem] font-medium text-offwhite/70">
              Sem cartão · Sem fidelidade
            </span>
          </a>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
