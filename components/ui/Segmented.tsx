'use client';

import React from 'react';

export interface SegmentItem<T extends string> {
  key: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  items: SegmentItem<T>[];
  value: T;
  onChange: (key: T) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

/**
 * Segmented control RETANGULAR — os quatro botões de visão da agenda, os
 * filtros de status, as abas curtas.
 *
 * O que saiu: o trilho de raio 12 com o item ativo virando uma pílula de
 * fundo preenchido e sombra própria. Um seletor de instrumento não desliza
 * uma cápsula: ele acende o segmento e marca a base. Aqui o ativo ganha
 * fundo wine-50, texto vinho e um traço de 2px embaixo — e os segmentos
 * são divididos por hairline, encostados um no outro, como as posições de
 * uma chave seletora.
 *
 * O rótulo entra em mono caixa alta: é rótulo de controle, não frase.
 */
export function Segmented<T extends string>({
  items, value, onChange, ariaLabel, className = '',
}: SegmentedProps<T>) {
  return (
    <div className={`segmented ${className}`} role="tablist" aria-label={ariaLabel}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className="transition-ui focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
          >
            {it.icon && <span className="shrink-0">{it.icon}</span>}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
