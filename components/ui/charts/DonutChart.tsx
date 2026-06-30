'use client';

import React, { useState } from 'react';

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

/** Donut clean com legenda. Hover destaca a fatia; clique opcional p/ drill-down. */
export const DonutChart: React.FC<DonutChartProps> = ({
  data, size = 160, thickness = 22, format = String, centerLabel, onSliceClick, className = '',
}) => {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2, cy = size / 2;

  let offset = 0;
  const arcs = data.map((d, i) => {
    const frac = total > 0 ? d.value / total : 0;
    const len = frac * c;
    const arc = { d, i, dasharray: `${len} ${c - len}`, dashoffset: -offset };
    offset += len;
    return arc;
  });

  return (
    <div className={`flex flex-col sm:flex-row items-center gap-5 ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={thickness} />
        {total > 0 && arcs.map(a => (
          <circle
            key={a.d.key ?? a.d.label}
            cx={cx} cy={cy} r={r} fill="none"
            stroke={a.d.color}
            strokeWidth={active === a.i ? thickness + 4 : thickness}
            strokeDasharray={a.dasharray}
            strokeDashoffset={a.dashoffset}
            className={onSliceClick ? 'cursor-pointer' : ''}
            onMouseEnter={() => setActive(a.i)}
            onMouseLeave={() => setActive(null)}
            onClick={onSliceClick ? () => onSliceClick(a.d, a.i) : undefined}
          />
        ))}
      </svg>
      <div className="flex-1 min-w-0 space-y-1.5 w-full">
        {centerLabel && <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">{centerLabel}</p>}
        {data.map((d, i) => (
          <div
            key={d.key ?? d.label}
            className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1 transition-colors ${active === i ? 'bg-surface-2' : ''} ${onSliceClick ? 'cursor-pointer' : ''}`}
            onMouseEnter={() => setActive(i)}
            onMouseLeave={() => setActive(null)}
            onClick={onSliceClick ? () => onSliceClick(d, i) : undefined}
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="inline-block h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: d.color }} />
              <span className="text-xs font-semibold text-ink truncate">{d.label}</span>
            </span>
            <span className="text-xs font-bold text-ink shrink-0 tabular-nums">
              {format(d.value)}
              <span className="text-gray-450 font-semibold ml-1">{total > 0 ? `${Math.round((d.value / total) * 100)}%` : '0%'}</span>
            </span>
          </div>
        ))}
        {total === 0 && <p className="text-xs text-gray-450">Sem dados no período.</p>}
      </div>
    </div>
  );
};

export default DonutChart;
