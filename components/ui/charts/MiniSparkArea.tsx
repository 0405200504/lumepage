'use client';

import React, { useId } from 'react';

interface MiniSparkAreaProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  tone?: 'wine' | 'emerald' | 'amber' | 'rose';
  className?: string;
}

/** Catmull-Rom para curva ultra suave */
function smoothPoints(data: number[], w: number, h: number): { line: string; area: string; lastPt: [number, number] } {
  if (data.length < 2) return { line: '', area: '', lastPt: [0, 0] };
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const stepX = w / (data.length - 1);
  const padT = 4;
  const padB = 4;
  const innerH = h - padT - padB;

  const pts = data.map((v, i) => {
    const x = i * stepX;
    const y = padT + innerH - ((v - min) / span) * innerH;
    return [x, y] as const;
  });

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
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[0 + 1].toFixed(1)}`;
  }

  const lastPt: [number, number] = [pts[pts.length - 1][0], pts[pts.length - 1][1]];
  const area = `${d} L${w},${h} L0,${h} Z`;

  return { line: d, area, lastPt };
}

/**
 * Mini Gráfico de Onda com Efeito Neon / Holográfico
 * Usado dentro de cards de métricas para dar dinamismo futurista e clean.
 */
export const MiniSparkArea: React.FC<MiniSparkAreaProps> = ({
  data,
  width = 120,
  height = 40,
  tone = 'wine',
  className = '',
}) => {
  const gid = useId();

  if (!data || data.length < 2) return null;

  const { line, area, lastPt } = smoothPoints(data, width, height);

  const colors = {
    wine: { stroke: 'var(--color-wine-700)', fill: 'var(--color-wine-500)', glow: '#6B1525' },
    emerald: { stroke: '#10b981', fill: '#059669', glow: '#10b981' },
    amber: { stroke: '#f59e0b', fill: '#d97706', glow: '#f59e0b' },
    rose: { stroke: '#f43f5e', fill: '#e11d48', glow: '#f43f5e' },
  }[tone];

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={`${gid}-gradient`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.fill} stopOpacity="0.28" />
            <stop offset="100%" stopColor={colors.fill} stopOpacity="0" />
          </linearGradient>

          <filter id={`${gid}-point-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Área preenchida */}
        <path d={area} fill={`url(#${gid}-gradient)`} />

        {/* Linha da onda suave */}
        <path
          d={line}
          fill="none"
          stroke={colors.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Ponto de foco final brilhante */}
        <circle
          cx={lastPt[0]}
          cy={lastPt[1]}
          r="3"
          fill="#ffffff"
          stroke={colors.stroke}
          strokeWidth="2"
          filter={`url(#${gid}-point-glow)`}
        />
      </svg>
    </div>
  );
};

export default MiniSparkArea;
