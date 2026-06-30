'use client';

import React from 'react';

export interface BarDatum {
  label: string;
  value: number;
  /** texto opcional à direita (ex.: contagem). */
  hint?: string;
  color?: string;
  key?: string;
}

interface BarChartProps {
  data: BarDatum[];
  format?: (v: number) => string;
  /** Habilita clique para drill-down. Recebe o item. */
  onBarClick?: (d: BarDatum, index: number) => void;
  barColor?: string;
  className?: string;
  emptyLabel?: string;
}

/** Barras horizontais clean (sem gridlines). Ideal para rankings/distribuições. */
export const BarChart: React.FC<BarChartProps> = ({
  data, format = String, onBarClick, barColor = 'var(--color-wine-600)', className = '', emptyLabel = 'Sem dados.',
}) => {
  const max = Math.max(1, ...data.map(d => d.value));
  if (!data.length) return <p className="text-xs text-gray-450 py-4 text-center">{emptyLabel}</p>;

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((d, i) => {
        const w = Math.max(2, (d.value / max) * 100);
        const clickable = !!onBarClick;
        return (
          <div
            key={d.key ?? d.label}
            className={`group ${clickable ? 'cursor-pointer' : ''}`}
            onClick={clickable ? () => onBarClick!(d, i) : undefined}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onBarClick!(d, i); } : undefined}
          >
            <div className="flex justify-between items-baseline text-[11px] mb-1">
              <span className="font-semibold text-ink truncate pr-2">{d.label}</span>
              <span className="font-bold text-ink shrink-0 tabular-nums">
                {format(d.value)}{d.hint && <span className="text-gray-450 font-semibold ml-1">{d.hint}</span>}
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all group-hover:opacity-90"
                style={{ width: `${w}%`, background: d.color ?? barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
