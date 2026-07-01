import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  /** padding interno (default p-5) */
  pad?: string;
  interactive?: boolean;
}

/** Cartão sóbrio: borda 1px sutil + sombra leve + raio moderado (via .card no globals). */
export const Card: React.FC<CardProps> = ({ as = 'div', pad = 'p-5', interactive, className = '', children, ...rest }) => {
  const Tag = as as React.ElementType;
  return (
    <Tag
      className={`card ${pad} ${interactive ? 'transition-all-custom hover:shadow-lg hover:-translate-y-0.5 hover:border-[color:var(--color-accent-soft-border)] cursor-pointer' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
