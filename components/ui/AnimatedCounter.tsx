'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  /** Valor alvo em centavos ou unidades inteiras. */
  value: number;
  /** Função de formatação (ex.: brl). */
  format: (v: number) => string;
  /** Duração da animação em ms. */
  duration?: number;
  className?: string;
}

/**
 * Counter animado: interpola de 0 ao valor alvo com easing.
 *
 * Usa requestAnimationFrame puro em vez de framer-motion para
 * manter o bundle leve — a animação é simples o bastante.
 * Respeita `prefers-reduced-motion` mostrando o valor final direto.
 */
export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value, format, duration = 800, className = '',
}) => {
  const [display, setDisplay] = useState(format(0));
  const prevValue = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Respeita prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setDisplay(format(value));
      prevValue.current = value;
      return;
    }

    const from = prevValue.current;
    const to = value;
    const diff = to - from;
    if (diff === 0) return;

    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + diff * eased);
      setDisplay(format(current));

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValue.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, format, duration]);

  return <span className={className}>{display}</span>;
};

export default AnimatedCounter;
