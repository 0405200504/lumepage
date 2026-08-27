'use client';

import React, { useState } from 'react';

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

/**
 * Barras horizontais modernizadas — rodada 5.
 *
 * Novidades:
 * 1. ANIMAÇÃO DE ENTRADA. Barras "crescem" da esquerda com delay
 *    escalonado por índice (60ms entre cada).
 * 2. GRADIENTE. Barra com gradiente sutil do tom sólido para um
 *    tom mais claro na ponta direita.
 * 3. HOVER SOFISTICADO. Barra em hover ganha glow sutil e o
 *    container inteiro recebe destaque.
 * 4. TRACK VISÍVEL. Fundo arredondado atrás da barra preenchida.
 */
export const BarChart: React.FC<BarChartProps> = ({
  data, format = String, onBarClick, barColor = 'var(--color-wine-600)', className = '', emptyLabel = 'Sem dados.',
}) => {
  const max = Math.max(1, ...data.map(d => d.value));
  const [hovered, setHovered] = useState<number | null>(null);

  if (!data.length) return <p className="text-caption text-n-600 py-4 text-center">{emptyLabel}</p>;

  return (
    <div className={`space-y-3 ${className}`}>
      {data.map((d, i) => {
        const w = Math.max(2, (d.value / max) * 100);
        const clickable = !!onBarClick;
        const isActive = hovered === i;
        const color = d.color ?? barColor;
        return (
          <div
            key={d.key ?? d.label}
            className={`group rounded-xl p-2.5 -mx-2.5 transition-all duration-150 ${
              clickable ? 'cursor-pointer' : ''
            } ${isActive ? 'bg-surface-2' : ''}`}
            onClick={clickable ? () => onBarClick!(d, i) : undefined}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onBarClick!(d, i); } : undefined}
          >
            <div className="flex justify-between items-baseline text-caption mb-1.5">
              <span className={`font-semibold truncate pr-2 transition-colors ${
                isActive ? 'text-heading' : 'text-ink'
              }`}>{d.label}</span>
              <span className={`font-bold shrink-0 num transition-all duration-150 ${
                isActive ? 'text-heading scale-105' : 'text-ink'
              }`}>
                {format(d.value)}{d.hint && <span className="text-n-600 font-semibold ml-1">{d.hint}</span>}
              </span>
            </div>
            {/* Track + barra com gradiente e animação */}
            <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden relative">
              <div
                className="h-full rounded-full chart-bar-in relative overflow-hidden"
                style={{
                  width: `${w}%`,
                  '--bar-i': i,
                  background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                  boxShadow: isActive ? `0 0 12px ${color}30` : 'none',
                  transition: 'box-shadow 0.2s ease-out',
                } as React.CSSProperties}
              >
                {/* Brilho sutil na barra */}
                <div
                  className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)`,
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarChart;
