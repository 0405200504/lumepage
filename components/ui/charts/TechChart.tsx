'use client';

import React, { useCallback, useId, useRef, useState } from 'react';

export interface TechSeries {
  name: string;
  values: number[];
  /** `dashed` = PREVISTO / não confirmado. Sólido = realizado. */
  style?: 'solid' | 'dashed';
  color?: string;
}

interface TechChartProps {
  labels: string[];
  series: TechSeries[];
  height?: number;
  format?: (v: number) => string;
  axisFormat?: (v: number) => string;
  unit?: string;
  className?: string;
}

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

function estimatePathLength(pts: readonly (readonly [number, number])[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.ceil(len * 1.2);
}

/**
 * TechChart Futurista: Telemetria financeira com visual clean, scanner vertical e nós luminosos.
 */
export const TechChart: React.FC<TechChartProps> = ({
  labels, series, height = 220, format = String, axisFormat, unit, className = '',
}) => {
  const fmtAxis = axisFormat ?? format;
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const padL = 44, padR = 12, padB = 26;
  const padT = unit ? 44 : 36;
  const W = 600;
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = series.flatMap((s) => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const n = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const xOf = (i: number) => padL + i * stepX;
  const yOf = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const gridTs = [0, 0.5, 1];
  const main = series[0];

  const pathLengths = series.map(s => {
    const pts = s.values.map((v, i) => [xOf(i), yOf(v)] as const);
    return estimatePathLength(pts);
  });

  const handleTouch = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const relX = touch.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (relX - (padL / W) * rect.width) / ((innerW / W) * rect.width)));
    const idx = Math.round(ratio * (n - 1));
    if (idx >= 0 && idx < n) setHover(idx);
  }, [n, innerW, padL, W]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Gráfico: ${series.map((s) => s.name).join(', ')}`}
        onMouseLeave={() => setHover(null)}
        onTouchMove={handleTouch}
        onTouchEnd={() => setHover(null)}
      >
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${gid}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0.25" />
              <stop offset="60%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0.06" />
              <stop offset="100%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0" />
            </linearGradient>
          ))}

          {/* Scanner laser vertical */}
          <linearGradient id={`${gid}-laser`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-wine-700)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--color-wine-500)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </linearGradient>

          <filter id={`${gid}-node-glow`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Linhas de Grade de Precisão */}
        {gridTs.map((t, i) => (
          <line
            key={i}
            x1={padL} x2={W - padR}
            y1={padT + innerH * t} y2={padT + innerH * t}
            stroke="var(--color-line)" strokeWidth="1"
            strokeDasharray={i === 1 ? '3 4' : undefined}
            vectorEffect="non-scaling-stroke"
            opacity={0.7}
          />
        ))}

        {/* Área sob a série principal com gradiente suave */}
        {main && main.style !== 'dashed' && main.values.length > 1 && (
          <path
            d={`${smoothPath(main.values.map((v, i) => [xOf(i), yOf(v)] as const))} L${xOf(main.values.length - 1)},${padT + innerH} L${xOf(0)},${padT + innerH} Z`}
            fill={`url(#${gid}-fill-0)`}
            className="chart-area-in"
          />
        )}

        {/* Séries com interpolação suave */}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [xOf(i), yOf(v)] as const);
          const pLen = pathLengths[si];
          return (
            <path
              key={si}
              d={smoothPath(pts)}
              fill="none"
              stroke={s.color ?? 'var(--color-wine-700)'}
              strokeWidth={s.style === 'dashed' ? '2' : '2.5'}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.style === 'dashed' ? '4 5' : undefined}
              vectorEffect="non-scaling-stroke"
              className={s.style !== 'dashed' ? 'chart-draw-in' : undefined}
              style={s.style !== 'dashed' ? { '--chart-len': pLen } as React.CSSProperties : undefined}
            />
          );
        })}

        {/* Coluna de captura para interação touch/mouse */}
        {labels.map((_, i) => (
          <rect
            key={`hit${i}`}
            x={xOf(i) - stepX / 2} y={padT}
            width={Math.max(stepX, 1)} height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Scanner Laser Vertical + Nós no Hover */}
        {hover !== null && (
          <>
            <line
              x1={xOf(hover)} x2={xOf(hover)} y1={padT} y2={padT + innerH}
              stroke={`url(#${gid}-laser)`} strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
            {series.map((s, si) => (
              <circle
                key={`p${si}${gid}`}
                cx={xOf(hover)} cy={yOf(s.values[hover] ?? 0)} r="4.5"
                fill="#ffffff"
                stroke={s.color ?? 'var(--color-wine-700)'}
                strokeWidth="2.5"
                filter={`url(#${gid}-node-glow)`}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}
      </svg>

      {/* Tooltip Glass Holográfico */}
      {hover !== null && series.length > 0 && (
        <div
          className="absolute -translate-x-1/2 pointer-events-none z-20
            px-3 py-2 rounded-2xl bg-n-950/90 backdrop-blur-md text-white border border-white/10
            shadow-[0_8px_24px_rgba(0,0,0,0.25)] whitespace-nowrap animate-fade-in"
          style={{
            left: `${Math.min(88, Math.max(12, (xOf(hover) / W) * 100))}%`,
            top: '2px',
          }}
        >
          <span className="block text-micro font-bold text-n-400 uppercase tracking-wider mb-1">
            {labels[hover]}
          </span>
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-2 text-caption font-bold tabular-nums">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0 shadow-sm"
                style={{ background: s.color ?? 'var(--color-wine-400)' }}
              />
              <span className="text-n-300 font-medium text-micro">{s.name}:</span>
              <span className="ml-auto pl-2 text-white">{format(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rótulos do Eixo Y */}
      {unit && (
        <span className="absolute left-0 top-1 text-micro font-bold text-n-400 pl-1">{unit}</span>
      )}
      <div className="absolute left-0 top-0 h-full w-11 flex flex-col justify-between pointer-events-none overflow-hidden"
           style={{ paddingTop: padT - 6, paddingBottom: padB - 6 }}>
        {[max, min + span / 2, min].map((v, i) => (
          <span key={i} className="text-micro font-medium tabular-nums text-n-400 pr-2 text-right block truncate">
            {fmtAxis(v)}
          </span>
        ))}
      </div>

      {/* Rótulos do Eixo X */}
      {[
        { cls: 'sm:hidden', stride: Math.ceil(labels.length / 6) },
        { cls: 'hidden sm:block', stride: Math.ceil(labels.length / 12) },
      ].map(({ cls, stride }) => (
        <div key={cls} className={`absolute left-0 right-0 bottom-0 h-4 pointer-events-none overflow-hidden ${cls}`}>
          {labels.map((l, i) =>
            i % stride !== 0 && i !== labels.length - 1 ? null : (
              <span
                key={i}
                className={`text-micro font-semibold absolute -translate-x-1/2 whitespace-nowrap transition-colors ${
                  hover === i ? 'text-heading font-bold' : 'text-n-400'
                }`}
                style={{ left: `${(xOf(i) / W) * 100}%` }}
              >
                {l}
              </span>
            ),
          )}
        </div>
      ))}
    </div>
  );
};

export default TechChart;
