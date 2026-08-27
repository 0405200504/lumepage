import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  /** Padding interno. 20px no mobile, 24px no desktop (escala base 4). */
  pad?: string;
  /** Cartão clicável: sobe 2px e escurece a borda — só onde existe mouse. */
  interactive?: boolean;
  /** Superfície vinho com grão. UM por tela, no máximo. */
  hero?: boolean;
}

/**
 * Cartão padrão: raio `surface` (16px), borda n-200 e sombra sm.
 * Repouso é borda leve + sombra leve; nunca as duas fortes juntas.
 *
 * Regra de aninhamento: com padding 20/24 e raio externo 16, o filho
 * interno usa `rounded-chip` (8px) — nunca repete o 16 do pai.
 */
export const Card: React.FC<CardProps> = ({
  as = 'div',
  pad = 'p-5 sm:p-6',
  interactive,
  hero,
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={[
        hero ? 'surface-wine text-white rounded-hero overflow-hidden relative' : 'card',
        interactive ? 'card-interactive cursor-pointer' : '',
        pad,
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
