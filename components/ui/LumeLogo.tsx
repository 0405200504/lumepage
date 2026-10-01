import React from 'react';
import { LUME_LOGO_LIGHT, LUME_LOGO_WINE, LUME_STAR_LIGHT, LUME_STAR_WINE } from '@/lib/ui/lumeLogoData';

interface LumeLogoProps {
  /** 'light' = logo branca (para fundos bordô/escuros) · 'wine' = logo bordô (para fundos claros) */
  variant?: 'light' | 'wine';
  /** só a estrela, sem o "lume" — para espaços estreitos (barra lateral recolhida) */
  star?: boolean;
  /** controle de TAMANHO pela altura (ex: "h-7"); a largura é proporcional automaticamente.
   *  A estrela é mais alta que as letras: o "lume" ocupa ~60% dessa altura. */
  className?: string;
}

// Proporção real dos arquivos (673 x 227 · estrela 242 x 227)
const ASPECT = 'aspect-[673/227]';
const STAR_ASPECT = 'aspect-[242/227]';

/**
 * Logo oficial da Lume: a estrela + "lume".
 * A imagem é EMBUTIDA no bundle (data URI) — não depende de arquivo externo,
 * cache do PWA nem service worker — então aparece de forma 100% confiável.
 * - variant="light": arte branca, estrela prateada (fundos escuros/bordô).
 * - variant="wine":  arte bordô (fundos claros).
 */
export const LumeLogo: React.FC<LumeLogoProps> = ({ variant = 'light', star = false, className = 'h-7' }) => {
  const src = star
    ? (variant === 'wine' ? LUME_STAR_WINE : LUME_STAR_LIGHT)
    : (variant === 'wine' ? LUME_LOGO_WINE : LUME_LOGO_LIGHT);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="Lume" className={`${star ? STAR_ASPECT : ASPECT} ${className} w-auto object-contain`} />;
};

export default LumeLogo;
