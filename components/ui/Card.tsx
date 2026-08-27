import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article';
  /** Padding interno. 20px no mobile, 24px no desktop. */
  pad?: string;
  /** Cartão clicável: sobe 2px e a sombra abre no hover. */
  interactive?: boolean;
  /** Superfície vinho. UM por tela, no máximo. */
  hero?: boolean;
  /** Superfície "tinta" (quase preta). O card de contraste das referências. */
  ink?: boolean;
  /** @deprecated Herdado da rodada "instrumento". Hoje devolve o card padrão. */
  bracket?: boolean;
  /** @deprecated Herdado da rodada "instrumento". Hoje devolve o card padrão. */
  chamfer?: boolean;
}

/**
 * Cartão padrão: branco, raio 20, sombra difusa e SEM borda.
 *
 * O hairline de 1px saiu de propósito. Ele era o detalhe que fazia a tela
 * parecer planilha: quinze retângulos contornados, todos com o mesmo peso,
 * nenhum com hierarquia. Com fundo cinza e card branco, quem delimita é a
 * diferença de luz — e ela delimita sem somar traço à tela.
 *
 * O padding subiu de 16/20 para 20/24: nas referências o ar dentro do card
 * é metade do que comunica "caro".
 *
 * Regra de aninhamento: com raio externo 20, o filho interno usa
 * `rounded-chip` (12px) — nunca repete o raio do pai.
 *
 * `bracket` e `chamfer` continuam na assinatura porque dezenas de telas os
 * passam. Não fazem mais nada: a geometria chanfrada e os cantos em L foram
 * aposentados junto com a direção "instrumento técnico".
 */
export const Card: React.FC<CardProps> = ({
  as = 'div',
  pad = 'p-5 sm:p-6',
  interactive,
  hero,
  ink,
  // Aceitos e descartados: são as props da direção "instrumento técnico".
  // Ficam na assinatura para que as telas que ainda as passam continuem
  // compilando — e ficam FORA de `rest` para não vazarem como atributo
  // desconhecido no DOM.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bracket: _bracket,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  chamfer: _chamfer,
  className = '',
  children,
  ...rest
}) => {
  const Tag = as as React.ElementType;
  const surface = hero
    ? 'surface-wine text-white rounded-hero overflow-hidden relative shadow-[var(--shadow-md)]'
    : ink
      ? 'surface-ink overflow-hidden relative'
      : 'card';

  return (
    <Tag
      className={[
        surface,
        interactive ? 'card-interactive cursor-pointer' : '',
        pad,
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
};

export default Card;
