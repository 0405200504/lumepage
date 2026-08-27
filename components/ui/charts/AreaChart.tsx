'use client';

import React, { useId, useMemo, useRef, useState } from 'react';

export interface AreaPoint {
  /** Rótulo do eixo X — só alguns são impressos, o resto vive no tooltip. */
  label: string;
  value: number;
}

interface AreaChartProps {
  data: AreaPoint[];
  /** Formata o valor no tooltip (moeda, contagem…). */
  format: (n: number) => string;
  /** 'wine' = sobre superfície clara · 'onWine' = dentro do hero vinho. */
  tone?: 'wine' | 'onWine';
  height?: number;
  className?: string;
}

const VB_W = 100;
const VB_H = 40;

/**
 * Gráfico de área.
 *
 * Grade horizontal e nada mais: sem eixo Y desenhado, porque o valor já está
 * escrito em corpo grande logo acima — dois lugares dizendo o mesmo número é
 * exatamente o que esta tela veio corrigir.
 *
 * O traço usa `vector-effect: non-scaling-stroke`: o viewBox é esticado para
 * a largura do card, e sem isso a linha engrossaria junto.
 */
export const AreaChart: React.FC<AreaChartProps> = ({
  data,
  format,
  tone = 'wine',
  height = 96,
  className = '',
}) => {
  const gradId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const { line, area } = useMemo(() => {
    if (data.length < 2) return { line: '', area: '' };
    const max = Math.max(...data.map((d) => d.value), 1);
    const x = (i: number) => (i / (data.length - 1)) * VB_W;
    const y = (v: number) => VB_H - (v / max) * (VB_H - 3) - 1.5;
    const pts = data.map((d, i) => `${x(i).toFixed(2)},${y(d.value).toFixed(2)}`);
    return {
      line: `M${pts.join(' L')}`,
      area: `M0,${VB_H} L${pts.join(' L')} L${VB_W},${VB_H} Z`,
    };
  }, [data]);

  if (data.length < 2) return null;

  const stroke = tone === 'onWine' ? 'rgba(255,255,255,0.9)' : 'var(--color-wine-700)';
  const fillTop = tone === 'onWine' ? 'rgba(255,255,255,0.28)' : 'color-mix(in oklab, var(--color-wine-700) 18%, transparent)';
  const grid = tone === 'onWine' ? 'rgba(255,255,255,0.12)' : 'var(--color-n-150)';

  const onMove = (e: React.PointerEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hover !== null ? data[hover] : null;
  const hoverX = hover !== null ? (hover / (data.length - 1)) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      style={{ height }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Evolução: ${format(data[data.length - 1].value)} no fim do período`}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1="0" x2={VB_W}
            y1={VB_H * p} y2={VB_H * p}
            stroke={grid}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {hovered && (
        <>
          <span
            className="pointer-events-none absolute top-0 bottom-0 w-px"
            style={{ left: `${hoverX}%`, background: grid }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-chip bg-surface px-2.5 py-1.5 shadow-md border border-line"
            style={{ left: `${Math.min(88, Math.max(12, hoverX))}%`, top: 0 }}
          >
            <span className="block text-caption text-n-500">{hovered.label}</span>
            <span className="num block text-label font-semibold text-heading">{format(hovered.value)}</span>
          </span>
        </>
      )}
    </div>
  );
};

export default AreaChart;
