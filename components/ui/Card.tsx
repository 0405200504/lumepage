import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  /** Padding interno. 16px no mobile, 20px no desktop (escala base 4). */
  pad?: string;
  /** Cartão clicável: a borda escurece. Não levita, não ganha sombra. */
  interactive?: boolean;
  /** Superfície vinho com grão. UM por tela, no máximo. Leva chanfro. */
  hero?: boolean;
  /** Sem borda fechada: quatro cantos em L. A moldura de "área de medição". */
  bracket?: boolean;
  /** Canto inferior direito cortado a 45°. Só em destaque e estado ativo. */
  chamfer?: boolean;
}

/**
 * Cartão padrão: raio 10, hairline n-200, ZERO sombra.
 *
 * A sombra saiu de propósito. Ela era o que dava o ar de "adesivo colado
 * na tela" e, somada ao raio de 24px e aos neutros quentes, produzia o
 * resultado que o diagnóstico chamou de "premium suave e genérico".
 * Num instrumento a superfície é plana; o que a delimita é o traço de 1px,
 * e a elevação se faz ESCURECENDO esse traço.
 *
 * Regra de aninhamento: com padding 16/20 e raio externo 10, o filho
 * interno usa `rounded-badge` (4px) — nunca repete o 10 do pai.
 */
export const Card: React.FC<CardProps> = ({
  as = 'div',
  pad = 'p-4 sm:p-5',
  interactive,
  hero,
  bracket,
  chamfer,
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={[
        hero ? 'surface-wine text-white rounded-hero overflow-hidden relative' : bracket ? 'bg-surface' : 'card',
        bracket ? 'brackets' : '',
        chamfer ? 'chamfer' : '',
        interactive ? 'card-interactive cursor-pointer' : '',
        pad,
        className,
      ].filter(Boolean).join(' ')}
      data-corners={bracket ? '4' : undefined}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
