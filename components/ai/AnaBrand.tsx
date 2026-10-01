import React from 'react';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { ANA_SATIN } from '@/lib/ui/anaSatinData';

/**
 * A identidade visual da Ana: a estrela prateada da Lume sobre o cetim bordô
 * do ícone do app. É o mesmo par do ícone na tela de início do celular, então
 * a assistente "veste" a marca em vez de usar um ícone genérico de IA.
 *
 * O cetim é uma faixa recortada do próprio icon-maskable-512.png (a parte de
 * cima, sem a estrela), embutida no bundle (lib/ui/anaSatinData.ts) como a
 * logo. O bordô de fundo segura a cor enquanto a imagem decodifica.
 */
export const ANA_SATIN_STYLE: React.CSSProperties = {
  backgroundColor: '#5a1020',
  backgroundImage: `url(${ANA_SATIN})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
};

/** A estrela da logo (prateada, para o cetim e fundos escuros). */
export const AnaStar: React.FC<{ className?: string }> = ({ className = 'h-5' }) => (
  <LumeLogo star variant="light" className={`${className} shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]`} />
);

/** Disco de cetim com a estrela: o "rosto" da Ana na conversa. */
export const AnaAvatar: React.FC<{ className?: string }> = ({ className = 'h-12 w-12' }) => (
  <span
    aria-hidden
    className={`${className} inline-flex items-center justify-center rounded-full shadow-wine ring-1 ring-inset ring-white/10`}
    style={ANA_SATIN_STYLE}
  >
    <AnaStar className="h-[46%]" />
  </span>
);
