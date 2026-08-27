import React from 'react';

/**
 * O quadradinho atrás do ícone. Existem DUAS versões e ponto final:
 * neutra (fundo n-100, ícone n-600) e de destaque (wine-50 / wine-700).
 *
 * O painel antigo tinha um chip lilás, um âmbar, um esmeralda e um vinho
 * lado a lado — cores que não existem na marca, uma por card. Era o erro
 * mais visível da tela. O ícone herda `currentColor`: nunca tem cor própria.
 */
export const IconChip: React.FC<{
  children: React.ReactNode;
  accent?: boolean;
  className?: string;
}> = ({ children, accent, className = '' }) => (
  <span className={`icon-chip ${className}`} data-accent={accent ? 'true' : undefined} aria-hidden>
    {children}
  </span>
);

export default IconChip;
