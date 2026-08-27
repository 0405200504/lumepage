import React from 'react';

/**
 * O que sobrou da "camada monoespaçada".
 *
 * A rodada anterior tinha uma família inteira (JetBrains Mono) reservada
 * para dado — horário, duração, ID, delta, cabeçalho de tabela. A ideia
 * era comunicar precisão; o efeito real foi uma tela onde o nome da
 * cliente, o horário e o valor tinham três esqueletos de letra diferentes.
 *
 * A precisão que a mono entregava de graça era UMA coisa: dígito de
 * largura fixa, para o número não tremer a cada atualização. Isso a
 * tipografia única entrega com `tabular-nums`. O resto era estética —
 * e a estética que ela trouxe foi a de terminal.
 *
 * Os componentes daqui continuam com os mesmos nomes porque metade das
 * telas os importa. O que mudou é o desenho: rótulo em 12px cinza-médio,
 * caixa normal, sem tracking largo.
 */

/** Rótulo de apoio: 12px, peso médio, cinza. Sem caixa alta. */
export const MonoLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'p' | 'div' | 'dt';
}> = ({ children, className = '', as = 'span' }) => {
  const Tag = as as React.ElementType;
  return <Tag className={`text-caption font-medium text-n-500 ${className}`}>{children}</Tag>;
};

/** Dado tabular: horário, duração, ID, contagem. Herda a cor de quem chama. */
export const MonoValue: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <span className={`num ${className}`}>{children}</span>
);

/**
 * Trilha de contexto do header de página:
 *   Agenda · qui, 27 ago · 5 agendamentos
 *
 * Era caixa alta com tracking de 0.1em — lia como cabeçalho de log. Agora
 * é uma linha de contexto normal, no tamanho de legenda. Os separadores
 * são desenhados aqui para que nenhuma tela precise lembrar do "·" com os
 * espaços certos.
 */
export const MonoTrail: React.FC<{
  items: (string | number | null | undefined)[];
  className?: string;
}> = ({ items, className = '' }) => {
  const parts = items.filter((i) => i !== null && i !== undefined && i !== '');
  if (parts.length === 0) return null;
  return (
    <p className={`text-caption font-medium text-n-500 ${className}`}>
      {parts.map((p, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-n-300 mx-1.5" aria-hidden>·</span>}
          {p}
        </React.Fragment>
      ))}
    </p>
  );
};

export default MonoLabel;
