import React from 'react';
import { LUME_LOGO_LIGHT, LUME_LOGO_WINE } from '@/lib/ui/lumeLogoData';

interface LumeLogoProps {
  /** 'light' = logo creme (para fundos bordô/escuros) · 'wine' = logo bordô (para fundos claros) */
  variant?: 'light' | 'wine';
  /** controle de TAMANHO pela altura (ex: "h-7"); a largura é proporcional automaticamente */
  className?: string;
}

// Proporção real do arquivo (1125 x 398)
const ASPECT = 'aspect-[1125/398]';

/**
 * Wordmark oficial da Lume.
 * A imagem é EMBUTIDA no bundle (data URI) — não depende de arquivo externo,
 * cache do PWA nem service worker — então aparece de forma 100% confiável.
 * - variant="light": arte creme (fundos escuros/bordô).
 * - variant="wine":  arte bordô (fundos claros).
 */
export const LumeLogo: React.FC<LumeLogoProps> = ({ variant = 'light', className = 'h-7' }) => {
  const src = variant === 'wine' ? LUME_LOGO_WINE : LUME_LOGO_LIGHT;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Lume" className={`${ASPECT} ${className} w-auto object-contain`} />;
};

export default LumeLogo;
