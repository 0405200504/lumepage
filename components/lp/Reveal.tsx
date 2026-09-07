"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { crossFade, spring } from "@/lib/lp/motion";

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

/**
 * Entrada ao aparecer na viewport.
 *
 * Mola criticamente amortecida (bounce 0) em vez de curva de duração fixa:
 * nada aqui foi arremessado pelo usuário, então nada deve repicar. A mola
 * também é interrompível — quem rola rápido e volta não vê a animação
 * "terminar sozinha" antes de reagir.
 *
 * Quem pede menos movimento recebe fusão de opacidade, sem deslocamento.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: RevealProps) {
  const calmo = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={calmo ? { opacity: 0 } : { opacity: 0, y }}
      whileInView={calmo ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={calmo ? { ...crossFade, delay } : { ...spring.ui, delay }}
    >
      {children}
    </motion.div>
  );
}
