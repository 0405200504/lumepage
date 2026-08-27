'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

/**
 * Sobe o número de 0 até o valor final em 600ms, SÓ no primeiro render.
 * Em cada refetch o número já está na tela: reanimar faria o faturamento
 * "zerar" toda vez que a profissional puxasse para atualizar.
 */
export function useCountUp(target: number, enabled = true) {
  const [display, setDisplay] = useState(enabled ? 0 : target);
  const done = useRef(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (done.current || !enabled || reduced) {
      setDisplay(target);
      done.current = true;
      return;
    }
    done.current = true;
    const start = performance.now();
    const DUR = 600;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DUR);
      // mesma curva do --ease-out dos tokens
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, enabled, reduced]);

  return display;
}

/** Número animado já formatado (moeda, contagem, o que for). */
export const CountUp: React.FC<{
  value: number;
  format: (n: number) => string;
  className?: string;
}> = ({ value, format, className = '' }) => {
  const n = useCountUp(value);
  return <span className={`num ${className}`}>{format(n)}</span>;
};

export default CountUp;
