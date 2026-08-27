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

const VB_W = 600;
const VB_H = 200;

/** Catmull-Rom → Bézier cúbica suave. */
function smoothPath(pts: readonly (readonly [number, number])[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M${pts[0][0]},${pts[0][1]} L${pts[1][0]},${pts[1][1]}`;

  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

/**
 * Gráfico de área moderno — curva Catmull-Rom suave, animação de entrada e suporte a touch.
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

  const padT = 16;
  const padB = 8;
  const innerH = VB_H - padT - padB;

  const { linePath, areaPath, pts } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '', pts: [] };
    const max = Math.max(...data.map((d) => d.value), 1);
    const stepX = VB_W / (data.length - 1);
    const points = data.map((d, i) => {
      const x = i * stepX;
      const y = padT + innerH - (d.value / max) * innerH;
      return [x, y] as const;
    });

    const smoothLine = smoothPath(points);
    const smoothArea = `${smoothLine} L${VB_W},${VB_H} L0,${VB_H} Z`;

    return {
      linePath: smoothLine,
      areaPath: smoothArea,
      pts: points,
    };
  }, [data, innerH, padT]);

  if (data.length < 2) return null;

  const stroke = tone === 'onWine' ? 'rgba(255,255,255,0.95)' : 'var(--color-wine-700)';
  const fillTop = tone === 'onWine' ? 'rgba(255,255,255,0.32)' : 'color-mix(in oklab, var(--color-wine-700) 24%, transparent)';
  const fillMid = tone === 'onWine' ? 'rgba(255,255,255,0.10)' : 'color-mix(in oklab, var(--color-wine-700) 08%, transparent)';
  const grid = tone === 'onWine' ? 'rgba(255,255,255,0.12)' : 'var(--color-n-150)';

  const onMove = (e: React.PointerEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const onTouch = (e: React.TouchEvent) => {
    const box = wrapRef.current?.getBoundingClientRect();
    if (!box) return;
    const touch = e.touches[0];
    const ratio = Math.min(1, Math.max(0, (touch.clientX - box.left) / box.width));
    setHover(Math.round(ratio * (data.length - 1)));
  };

  const hovered = hover !== null ? data[hover] : null;
  const hoverX = hover !== null ? (hover / (data.length - 1)) * 100 : 0;
  const hoverPt = hover !== null && pts[hover] ? pts[hover] : null;

  return (
    <div
      ref={wrapRef}
      className={`relative ${className}`}
      style={{ height }}
      onPointerMove={onMove}
      onPointerLeave={() => setHover(null)}
      onTouchMove={onTouch}
      onTouchEnd={() => setHover(null)}
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
            <stop offset="60%" stopColor={fillMid} />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>

        {/* Linhas de guia horizontais discretas */}
        {[0.2, 0.5, 0.8].map((p) => (
          <line
            key={p}
            x1="0"
            x2={VB_W}
            y1={padT + innerH * p}
            y2={padT + innerH * p}
            stroke={grid}
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Área preenchida animada */}
        <path d={areaPath} fill={`url(#${gradId})`} className="chart-area-in" />

        {/* Linha suave animada */}
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className="chart-draw-in"
          style={{ '--chart-len': 1200 } as React.CSSProperties}
        />

        {/* Ponto e linha de foco no hover */}
        {hoverPt && (
          <>
            <line
              x1={hoverPt[0]}
              x2={hoverPt[0]}
              y1={padT}
              y2={VB_H}
              stroke={stroke}
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              opacity={0.6}
            />
            <circle
              cx={hoverPt[0]}
              cy={hoverPt[1]}
              r="5"
              fill={tone === 'onWine' ? '#ffffff' : 'var(--color-wine-700)'}
              stroke={tone === 'onWine' ? 'var(--color-wine-900)' : '#ffffff'}
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>

      {/* Tooltip flutuante */}
      {hovered && (
        <div
          className={`pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-2xl px-3 py-1.5 shadow-md ${
            tone === 'onWine'
              ? 'bg-white text-wine-950 shadow-lg'
              : 'bg-ink-surface text-white border border-line'
          }`}
          style={{
            left: `${Math.min(88, Math.max(12, hoverX))}%`,
            top: '-6px',
          }}
        >
          <span className={`block text-micro font-medium ${tone === 'onWine' ? 'text-n-600' : 'text-n-400'}`}>
            {hovered.label}
          </span>
          <span className="num block text-caption font-bold">{format(hovered.value)}</span>
        </div>
      )}
    </div>
  );
};

export default AreaChart;
