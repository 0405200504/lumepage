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
  /** 'tabs' = pílula com fundo bordô no ativo; 'pills' = mais compacto. */
  size?: 'sm' | 'md';
  className?: string;
}

/** Navegação por abas / segmentação padronizada (substitui os tab bars ad-hoc). */
export function Segmented<T extends string>({ items, value, onChange, size = 'md', className = '' }: SegmentedProps<T>) {
  const padY = size === 'sm' ? 'py-2' : 'py-2.5';
  return (
    <div className={`flex items-center gap-1 bg-surface border border-line rounded-xl p-1 shadow-soft overflow-x-auto scrollbar-none ${className}`} role="tablist">
      {items.map((it) => {
        const active = it.key === value;
        return (
          <button
            key={it.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.key)}
            className={`flex items-center gap-2 px-3.5 ${padY} rounded-lg text-caption font-semibold whitespace-nowrap transition-ui ${
              active
                ? 'bg-[color:var(--color-accent-soft)] text-wine-700 shadow-soft ring-1 ring-[color:var(--color-accent-soft-border)]'
                : 'text-n-600 hover:bg-surface-2 hover:text-ink'
            }`}
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
