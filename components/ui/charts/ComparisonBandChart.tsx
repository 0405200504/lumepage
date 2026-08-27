'use client';

import React, { useId } from 'react';

export interface ComparisonPoint {
  label: string;
  current: number;
  previous: number;
}

interface ComparisonBandChartProps {
  data: ComparisonPoint[];
  format?: (v: number) => string;
  badgeLabel?: string;
  currentYearLabel?: string;
  previousYearLabel?: string;
  height?: number;
  className?: string;
}

/** Catmull-Rom para Bézier suave */
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
 * Gráfico Comparativo com Corredor Listrado (estilo referência "Comparison of Revenue").
 * Exibe a área entre o período atual e o anterior preenchida com hachuras diagonais e badge flutuante.
 */
export const ComparisonBandChart: React.FC<ComparisonBandChartProps> = ({
  data,
  format = String,
  badgeLabel = '+18%',
  currentYearLabel = '2025',
  previousYearLabel = '2024',
  height = 180,
  className = '',
}) => {
  const gid = useId();

  if (!data || data.length < 2) return null;

  const W = 500;
  const H = height;
  const padL = 12, padR = 12, padT = 24, padB = 24;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const allVals = data.flatMap(d => [d.current, d.previous]);
  const max = Math.max(1, ...allVals);
  const min = Math.min(0, ...allVals);
  const span = max - min || 1;
  const stepX = innerW / (data.length - 1);

  const curPts = data.map((d, i) => [padL + i * stepX, padT + innerH - ((d.current - min) / span) * innerH] as const);
  const prevPts = data.map((d, i) => [padL + i * stepX, padT + innerH - ((d.previous - min) / span) * innerH] as const);

  const curPath = smoothPath(curPts);
  const prevPath = smoothPath(prevPts);

  // Path do corredor entre as duas linhas (volta pelo prevPts invertido)
  const reversedPrev = [...prevPts].reverse();
  const bandPath = `${curPath} L${reversedPrev[0][0]},${reversedPrev[0][1]} ${smoothPath(reversedPrev).replace(/^M[^ ]+/, 'L')} Z`;

  // Ponto central do gráfico para posicionar a tag flutuante
  const midIdx = Math.floor(data.length / 2);
  const midX = padL + midIdx * stepX;
  const midY = (curPts[midIdx][1] + prevPts[midIdx][1]) / 2;

  return (
    <div className={`relative flex flex-col justify-between ${className}`} style={{ height }}>
      <svg width="100%" height={height} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          {/* Padrão listrado diagonal entre as curvas */}
          <pattern
            id={`${gid}-band-stripes`}
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--color-wine-700)" strokeWidth="1.5" opacity="0.35" />
          </pattern>

          <filter id={`${gid}-tag-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(107, 21, 37, 0.2)" />
          </filter>
        </defs>

        {/* Linha de grid central */}
        <line x1={padL} x2={W - padR} y1={padT + innerH / 2} y2={padT + innerH / 2} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 3" opacity={0.6} />

        {/* Faixa/Corredor listrado entre as duas curvas */}
        <path d={bandPath} fill={`url(#${gid}-band-stripes)`} className="transition-all duration-500" />

        {/* Linha do Período Anterior (dashed) */}
        <path
          d={prevPath}
          fill="none"
          stroke="var(--color-n-400)"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />

        {/* Linha do Período Atual (sólida) */}
        <path
          d={curPath}
          fill="none"
          stroke="var(--color-wine-700)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {/* Pontos nas extremidades */}
        {curPts.map((p, i) => (
          <circle key={`cur-${i}`} cx={p[0]} cy={p[1]} r="3" fill="var(--color-wine-700)" />
        ))}
        {prevPts.map((p, i) => (
          <circle key={`prev-${i}`} cx={p[0]} cy={p[1]} r="2.5" fill="var(--color-n-400)" />
        ))}

        {/* Tag Central Flutuante com Porcentagem de Variação */}
        {badgeLabel && (
          <g transform={`translate(${midX - 28}, ${midY - 12})`}>
            <rect
              width="56"
              height="24"
              rx="12"
              fill="var(--color-wine-700)"
              filter={`url(#${gid}-tag-glow)`}
            />
            <text
              x="28"
              y="16"
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="bold"
              fontFamily="var(--font-sans)"
              className="select-none num"
            >
              {badgeLabel}
            </text>
          </g>
        )}
      </svg>

      {/* Rótulos dos meses/dias na base */}
      <div className="flex justify-between items-center text-micro font-semibold text-n-400 px-2 pt-1 border-t border-line/40">
        {data.map(d => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
};

export default ComparisonBandChart;
