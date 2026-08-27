import React from 'react';

/**
 * A monoespaçada é o que comunica "instrumento" mais rápido do que
 * qualquer outra alavanca — e a regra de uso é estreita:
 *
 *   ENTRA em mono: rótulo micro, horário, duração, data, ID, delta
 *   percentual, cabeçalho de tabela, rótulo de eixo, unidade, contagem.
 *
 *   NÃO entra: nome de pessoa, título, texto corrido e DINHEIRO.
 *   R$ em monoespaçada vira cupom fiscal; valor monetário fica em sans
 *   com `num` (tabular-nums), que já resolve o tremor dos dígitos.
 */

/** Rótulo micro: 10px, caixa alta, tracking 0.1em. O elemento mais barato
 *  do sistema e o que mais muda a temperatura da tela. */
export const MonoLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: 'span' | 'p' | 'div' | 'dt';
}> = ({ children, className = '', as = 'span' }) => {
  const Tag = as as React.ElementType;
  return <Tag className={`mono-micro text-n-500 ${className}`}>{children}</Tag>;
};

/** Dado tabular: horário, duração, ID, contagem. Herda a cor de quem chama. */
export const MonoValue: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <span className={`mono ${className}`}>{children}</span>
);

/**
 * A trilha de contexto do header de página:
 *   AGENDA · QUI 27 AGO · 5 AGENDAMENTOS
 * Os separadores são desenhados aqui para que nenhuma tela precise
 * lembrar de digitar o "·" com os espaços certos.
 */
export const MonoTrail: React.FC<{
  items: (string | number | null | undefined)[];
  className?: string;
}> = ({ items, className = '' }) => {
  const parts = items.filter((i) => i !== null && i !== undefined && i !== '');
  if (parts.length === 0) return null;
  return (
    <p className={`mono-micro text-n-500 ${className}`}>
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
