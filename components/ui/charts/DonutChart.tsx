'use client';

import React, { useId, useState } from 'react';
import { AnimatedCounter } from '../AnimatedCounter';

export interface DonutSlice { label: string; value: number; color: string; key?: string }

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  format?: (v: number) => string;
  centerLabel?: string;
  onSliceClick?: (s: DonutSlice, index: number) => void;
  className?: string;
}

/**
 * Donut modernizado — rodada 5.
 *
 * Novidades:
 * 1. ANIMAÇÃO DE ENTRADA. Cada fatia "gira" para dentro com delay
 *    escalonado — efeito de preenchimento sequencial.
 * 2. VALOR CENTRAL ANIMADO. O total aparece no centro do donut com
 *    counter que interpola de 0.
 * 3. GRADIENTE POR FATIA. Cada fatia recebe um linearGradient sutil
 *    que vai do tom sólido para um tom mais claro, dando profundidade.
 * 4. HOVER SOFISTICADO. Fatia ativa ganha scale via transform além
 *    do stroke mais largo, com transição suave.
 * 5. MOBILE. Donut centra-se melhor em telas pequenas.
 */
export const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 160, thickness = 22, format = String, centerLabel, onSliceClick, className = '',
}) => {
  const gid = useId();
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = frac * c;
    const arc = { d, i, dasharray: `${len} ${c - len}`, dashoffset: -offset, len };
    offset += len;
    return arc;
  });

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-5 ${className}`}>
      {/* Donut SVG */}
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <defs>
            {data.map((d, i) => (
              <linearGradient key={i} id={`${gid}-g-${i}`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={d.color} stopOpacity="1" />
                <stop offset="100%" stopColor={d.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
          </defs>

          {/* Track de fundo */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={thickness} />

          {/* Fatias animadas */}
          {total > 0 && arcs.map(a => (
            <circle
              key={a.d.key ?? a.d.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={`url(#${gid}-g-${a.i})`}
              strokeWidth={active === a.i ? thickness + 4 : thickness}
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
              className={onSliceClick ? 'cursor-pointer' : ''}
              style={{
                '--donut-circ': c,
                '--donut-offset': a.dashoffset,
                '--slice-i': a.i,
                transition: 'stroke-width 0.2s ease-out',
                transformOrigin: '50% 50%',
                transform: active === a.i ? 'scale(1.03)' : 'scale(1)',
              } as React.CSSProperties}
              onMouseEnter={() => setActive(a.i)}
              onMouseLeave={() => setActive(null)}
              onClick={onSliceClick ? () => onSliceClick(a.d, a.i) : undefined}
            />
          ))}
        </svg>

        {/* Valor central animado */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <AnimatedCounter
            value={total}
            format={format}
            className="text-label font-bold text-heading num leading-none"
          />
          {centerLabel && (
            <span className="text-micro font-medium text-n-500 mt-0.5">{centerLabel}</span>
          )}
          {!centerLabel && (
            <span className="text-micro font-medium text-n-500 mt-0.5">Total</span>
          )}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex-1 min-w-0 space-y-1 w-full">
        {data.map((d, i) => (
          <div
            key={d.key ?? d.label}
            className={`flex items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 transition-all duration-150 ${
              active === i ? 'bg-surface-2 scale-[1.01]' : ''
            } ${onSliceClick ? 'cursor-pointer' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={onSliceClick ? () => onSliceClick(d, i) : undefined}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block h-3 w-3 rounded-md shrink-0 transition-transform duration-150"
                style={{
                  background: d.color,
                  transform: active === i ? 'scale(1.2)' : 'scale(1)',
                  boxShadow: active === i ? `0 0 8px ${d.color}40` : 'none',
                }}
              />
              <span className={`text-caption font-semibold truncate transition-colors ${
                active === i ? 'text-heading' : 'text-ink'
              }`}>{d.label}</span>
            </span>
            <span className="text-caption font-bold text-ink shrink-0 num">
              {format(d.value)}
              <span className="text-n-500 font-semibold ml-1.5">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}</span>
            </span>
          </div>
        ))}
        {total === 0 && <p className="text-caption text-n-600">Sem dados no período.</p>}
      </div>
    </div>
  );
};

export default DonutChart;
