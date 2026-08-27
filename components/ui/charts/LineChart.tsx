'use client';

import React, { useId, useMemo, useState } from 'react';

export interface LineSeries {
  name: string;
  color: string;
  values: number[];
}

interface LineChartProps {
  labels: string[];
  series: LineSeries[];
  height?: number;
  /** Formata valores no tooltip e eixo. */
  format?: (v: number) => string;
  className?: string;
}

/** Gráfico de linhas clean: poucas gridlines, tooltip elegante no hover. */
export const LineChart: React.FC<LineChartProps> = ({ labels, series, height = 220, format = String, className = '' }) => {
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const padL = 8, padR = 8, padT = 12, padB = 22;
  const W = 600; // viewBox virtual; escala via preserveAspectRatio
  const H = height;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const all = series.flatMap(s => s.values);
  const max = Math.max(1, ...all);
  const min = Math.min(0, ...all);
  const span = max - min || 1;
  const n = labels.length;
  const stepX = n > 1 ? innerW / (n - 1) : 0;

  const xOf = (i: number) => padL + i * stepX;
  const yOf = (v: number) => padT + innerH - ((v - min) / span) * innerH;

  const paths = useMemo(() => series.map(s => ({
    ...s,
    d: s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' '),
  })), [series, labels]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3 gridlines (0%, 50%, 100% do range)
  const gridYs = [0, 0.5, 1].map(t => padT + innerH * t);

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        onMouseLeave={() => setHover(null)}
        role="img"
      >
        {gridYs.map((y, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--color-line)" strokeWidth="1" strokeDasharray={i === 2 ? '0' : '3 4'} />
        ))}
        {paths.map((p, si) => (
          <g key={si}>
            <path d={p.d} fill="none" stroke={p.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        ))}
        {/* pontos no hover */}
        {hover !== null && series.map((s, si) => (
          <circle key={si} cx={xOf(hover)} cy={yOf(s.values[hover])} r="3.5" fill="var(--color-surface)" stroke={s.color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
        ))}
        {/* faixas invisíveis de hover */}
        {labels.map((_, i) => (
          <rect key={i} x={xOf(i) - stepX / 2} y={0} width={stepX || innerW} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
        {hover !== null && (
          <line x1={xOf(hover)} x2={xOf(hover)} y1={padT} y2={padT + innerH} stroke="var(--color-n-600)" strokeWidth="1" strokeDasharray="3 3" />
        )}
      </svg>

      {/* labels do eixo X */}
      <div className="flex justify-between mt-1 px-1">
        {labels.map((l, i) => (
          <span key={i} className={`text-caption font-semibold ${hover === i ? 'text-ink' : 'text-n-600'}`}>{l}</span>
        ))}
      </div>

      {/* tooltip */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-xl border border-n-200 bg-surface shadow-md px-3 py-2 text-caption"
          style={{ left: `${(xOf(hover) / W) * 100}%`, top: 4, transform: 'translateX(-50%)' }}
        >
          <p className="font-bold text-ink mb-1">{labels[hover]}</p>
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
              <span className="text-n-600">{s.name}:</span>
              <span className="font-bold text-ink">{format(s.values[hover])}</span>
            </div>
          ))}
        </div>
      )}

      {/* legenda */}
      {series.length > 1 && (
        <div className="flex items-center justify-center gap-4 mt-2">
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              <span className="text-caption font-semibold text-n-600">{s.name}</span>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">{gid}</span>
    </div>
  );
};

export default LineChart;
