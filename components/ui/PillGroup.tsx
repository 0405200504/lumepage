'use client';

import React from 'react';

export interface PillItem<T extends string> {
  key: T;
  label: string;
  /** Ícone lucide 14/18. O rótulo pode se esconder em tela estreita; o ícone não. */
  icon?: React.ReactNode;
  /** Esconde o rótulo abaixo de sm — só faz sentido junto com `icon`. */
  labelHiddenOnMobile?: boolean;
}

interface PillGroupProps<T extends string> {
  items: PillItem<T>[];
  value: T;
  onChange: (key: T) => void;
  ariaLabel?: string;
  className?: string;
}

/**
 * Filtro de período (Hoje · Semana · Mês · Ano).
 *
 * Deixou de ser "pill group" no desenho — o nome sobrou porque muitas telas
 * o importam assim. O trilho arredondado com o indicador deslizante em
 * mola saiu por dois motivos: `rounded-full` passou a valer só para avatar
 * e ponto de status, e a mola (spring) contradiz a curva seca do sistema.
 *
 * O que ficou: o mesmo comportamento de abas, agora sobre o segmented
 * control retangular, com rolagem horizontal e snap no mobile.
 */
export function PillGroup<T extends string>({
  items, value, onChange, ariaLabel, className = '',
}: PillGroupProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`segmented max-w-full overflow-x-auto scrollbar-none snap-x ${className}`}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className="snap-start shrink-0 transition-ui focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
          >
            {it.icon}
            <span className={it.labelHiddenOnMobile ? 'hidden sm:inline' : undefined}>
              {it.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PillGroup;
