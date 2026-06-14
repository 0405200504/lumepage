import React from 'react';

interface LumeLogoProps {
  /** 'light' = logo creme (para fundos bordô/escuros) · 'wine' = logo bordô (para fundos claros) */
  variant?: 'light' | 'wine';
  /** controle de TAMANHO pela altura (ex: "h-7"); a largura é proporcional automaticamente */
  className?: string;
}

// Proporção real do arquivo (1125 x 398)
const ASPECT = 'aspect-[1125/398]';

/**
 * Wordmark oficial da Lume (PNG transparente, em dois tons).
 * Renderizado como <img> simples — sem máscara/filtro/currentColor — para
 * aparecer de forma confiável em qualquer navegador/PWA.
 * - variant="light": arte creme (fundos escuros/bordô).
 * - variant="wine":  arte bordô (fundos claros).
 */
export const LumeLogo: React.FC<LumeLogoProps> = ({ variant = 'light', className = 'h-7' }) => {
  const src = variant === 'wine' ? '/lume-logo-wine.png' : '/lume-logo.png';
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Lume" className={`${ASPECT} ${className} w-auto object-contain`} />;
};

export default LumeLogo;
