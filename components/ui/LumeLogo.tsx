import React from 'react';

interface LumeLogoProps {
  /** 'light' = logo creme (para fundos bordô/escuros) · 'wine' = recolorida (usa currentColor) para fundos claros */
  variant?: 'light' | 'wine';
  /** controle de TAMANHO pela altura (ex: "h-7"); a largura é proporcional automaticamente */
  className?: string;
}

// Proporção real do arquivo (1125 x 398)
const ASPECT = 'aspect-[1125/398]';

/**
 * Wordmark oficial da Lume. Sempre proporcional.
 * - variant="light": usa a arte creme diretamente (fundos escuros/bordô).
 * - variant="wine": recolore a arte com currentColor via filtro SVG (fundos claros).
 *   Usamos filtro SVG (e não CSS mask) por ser mais confiável em PWA/Safari.
 */
export const LumeLogo: React.FC<LumeLogoProps> = ({ variant = 'light', className = 'h-7' }) => {
  if (variant === 'wine') {
    return (
      <svg
        viewBox="0 0 1125 398"
        className={`${className} w-auto`}
        role="img"
        aria-label="Lume"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="lume-wine-tint" x="0" y="0" width="100%" height="100%">
            <feFlood floodColor="currentColor" result="c" />
            <feComposite in="c" in2="SourceAlpha" operator="in" />
          </filter>
        </defs>
        <image href="/lume-logo.png" x="0" y="0" width="1125" height="398" filter="url(#lume-wine-tint)" />
      </svg>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/lume-logo.png" alt="Lume" className={`${ASPECT} ${className} w-auto object-contain`} />;
};

export default LumeLogo;
