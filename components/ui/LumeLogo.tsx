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
 * - variant="wine": aplica a logo como máscara e pinta com currentColor (fundos claros).
 */
export const LumeLogo: React.FC<LumeLogoProps> = ({ variant = 'light', className = 'h-7' }) => {
  if (variant === 'wine') {
    return (
      <span
        role="img"
        aria-label="Lume"
        className={`${ASPECT} ${className} inline-block`}
        style={{
          backgroundColor: 'currentColor',
          WebkitMaskImage: 'url(/lume-logo.png)',
          maskImage: 'url(/lume-logo.png)',
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
        }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/lume-logo.png" alt="Lume" className={`${ASPECT} ${className} w-auto object-contain`} />;
};

export default LumeLogo;
