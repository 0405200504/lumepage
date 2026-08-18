'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';

/** useLayoutEffect no navegador, useEffect no servidor (evita o aviso de SSR). */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Entrada suave ao rolar — ~30 linhas com IntersectionObserver, sem biblioteca
 * de animação. A página pública é o cartão de visitas da profissional e abre
 * quase sempre no 4G do celular: cada KB de JS que não entra é ganho real.
 *
 * Duas decisões que valem a pena explicar:
 *
 *  1. A classe entra direto no elemento, não via estado do React. Isso é
 *     sincronizar o DOM com o React (o caso legítimo de um efeito) e evita um
 *     re-render por bloco que aparece na tela.
 *
 *  2. O bloco só é ESCONDIDO pelo próprio JS (`is-armed`), antes da pintura.
 *     Assim, se o JS falhar ou demorar, a página aparece inteira em vez de
 *     ficar em branco — a animação é enfeite, nunca requisito para ler.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'li' | 'header' | 'figure';
}) {
  const ref = useRef<HTMLElement | null>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // Esconde só agora, antes da pintura: sem JS, nada fica escondido.
    el.classList.add('is-armed');

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { el.classList.add('is-in'); io.disconnect(); }
      },
      { rootMargin: '0px 0px -60px 0px', threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.RefObject<never>}
      className={`lume-reveal${className ? ` ${className}` : ''}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** CSS do Reveal — cada template injeta junto com o seu próprio. */
export const REVEAL_CSS = `
.lume-reveal.is-armed { opacity: 0; transform: translateY(22px); transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1); }
.lume-reveal.is-armed.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .lume-reveal.is-armed { opacity: 1; transform: none; transition: none; } }
`;
