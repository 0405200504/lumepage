import React from 'react';

/**
 * As duas molduras da linguagem técnica: o CHANFRO e os BRACKETS.
 * Nenhuma das duas é decoração — cada uma tem um trabalho.
 */

/**
 * CHANFRO — a assinatura do produto.
 *
 * Um canto cortado a 45°, sempre no inferior direito, em quatro lugares e
 * só neles: card hero, item ativo/selecionado, selo de status e botão
 * primário. É um detalhe de 10px que assina a interface inteira sem custar
 * uma cor, um ícone ou um pixel de altura.
 *
 * ⚠️ `clip-path` corta a borda de 1px JUNTO. Num elemento de fundo chapado
 * (botão primário, selo) isso não importa — não há borda a preservar, e
 * `<Chamfer>` resolve com uma classe. Num elemento com hairline, use
 * `<ChamferFrame>` abaixo, que desenha a linha como superfície.
 */
export const Chamfer: React.FC<{
  children: React.ReactNode;
  /** `s` = corte de 6px (selo, chip). Padrão = 10px (card, botão). */
  size?: 's' | 'md';
  className?: string;
  as?: 'div' | 'span';
}> = ({ children, size = 'md', className = '', as = 'div' }) => {
  const Tag = as as React.ElementType;
  return (
    <Tag className={`${size === 's' ? 'chamfer-s' : 'chamfer'} ${className}`}>
      {children}
    </Tag>
  );
};

/**
 * Chanfro COM hairline preservada.
 *
 * O truque: a moldura é um retângulo da cor da linha, chanfrado, com 1px
 * de padding; o conteúdo é um filho da cor da superfície, chanfrado 1px
 * menor. O que sobra do pai nos 1px de padding é a hairline — e ela
 * acompanha o corte do canto, que é justamente o que um `border` + 
 * `clip-path` não consegue fazer.
 */
export const ChamferFrame: React.FC<{
  children: React.ReactNode;
  /** Estado ativo: a moldura vira vinho e o miolo, wine-50. */
  active?: boolean;
  className?: string;
  innerClassName?: string;
}> = ({ children, active, className = '', innerClassName = '' }) => (
  <div className={`chamfer-frame ${className}`} data-active={active ? 'true' : undefined}>
    <div className={`chamfer-inner ${innerClassName}`}>{children}</div>
  </div>
);

/**
 * CORNER BRACKETS — a marca visual de "área de medição".
 *
 * Cartão de destaque não leva borda completa: leva quatro cantos em L de
 * 12px. A diferença de leitura é grande — a borda fechada diz "caixa", o
 * bracket diz "visor". Serve para destacar sem acrescentar peso: é a
 * alternativa à sombra que acabamos de aposentar.
 */
export const Bracket: React.FC<{
  children: React.ReactNode;
  /** 2 cantos (superior-esquerdo e inferior-direito) ou os 4. */
  corners?: 2 | 4;
  className?: string;
}> = ({ children, corners = 4, className = '' }) => (
  <div className={`brackets ${className}`} data-corners={corners === 4 ? '4' : undefined}>
    {children}
  </div>
);

export default Chamfer;
