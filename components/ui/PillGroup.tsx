'use client';

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface PillItem<T extends string> {
  key: T;
  label: string;
  /** Ícone lucide 20px. O rótulo pode se esconder em tela estreita; o ícone não. */
  icon?: React.ReactNode;
  /** Esconde o rótulo abaixo de sm — só faz sentido junto com `icon`. */
  labelHiddenOnMobile?: boolean;
}

interface PillGroupProps<T extends string> {
  items: PillItem<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Rótulo do grupo para leitores de tela. */
  ariaLabel?: string;
  className?: string;
}

/**
 * Filtro de período (Hoje · Semana · Mês · Ano).
 *
 * O indicador DESLIZA entre os itens (layout animation) em vez de trocar de
 * estilo instantaneamente — é o detalhe que separa o filtro do produto do
 * filtro do template. No mobile o trilho rola na horizontal com snap.
 */
export function PillGroup<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  className = '',
}: PillGroupProps<T>) {
  const reduced = useReducedMotion();
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`inline-flex items-center gap-1 bg-n-100 rounded-control p-1 overflow-x-auto scrollbar-none snap-x ${className}`}
    >
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={`relative snap-start shrink-0 h-9 px-3.5 rounded-chip text-caption font-semibold whitespace-nowrap transition-ui
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600
              ${active ? 'text-heading' : 'text-n-500 hover:text-heading'}`}
          >
            {active && (
              <motion.span
                layoutId={`pill-${ariaLabel ?? 'group'}`}
                className="absolute inset-0 bg-surface rounded-chip shadow-xs"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              {it.icon}
              <span className={it.labelHiddenOnMobile ? 'hidden sm:inline' : undefined}>{it.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default PillGroup;
