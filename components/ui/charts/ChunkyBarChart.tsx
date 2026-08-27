'use client';

import React, { useId, useState } from 'react';

export interface ChunkyBarItem {
  label: string;
  value: number;
  sublabel?: string;
  isPeak?: boolean;
  highlight?: boolean;
}

interface ChunkyBarChartProps {
  data: ChunkyBarItem[];
  format?: (v: number) => string;
  height?: number;
  highlightIndex?: number;
  className?: string;
}

/**
 * Gráfico de Barras Chunky Futurista (estilo referência CRM & Analytics).
 * Barras arredondadas grossas, barra destacada com padrão listrado diagonal e tag flutuante iluminada.
 */
export const ChunkyBarChart: React.FC<ChunkyBarChartProps> = ({
  data,
  format = String,
  height = 190,
  highlightIndex,
  className = '',
}) => {
  const gid = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const max = Math.max(1, ...data.map(d => d.value));
  
  // Se nenhum highlightIndex foi passado, destaca automaticamente o maior valor
  const peakIdx = highlightIndex !== undefined 
    ? highlightIndex 
    : data.reduce((maxI, d, i, arr) => d.value > arr[maxI].value ? i : maxI, 0);

  const activeIdx = hoveredIdx !== null ? hoveredIdx : peakIdx;

  return (
    <div className={`relative flex flex-col justify-end ${className}`} style={{ minHeight: height }}>
      <svg width="100%" height={height} className="overflow-visible">
        <defs>
          {/* Padrão listrado diagonal para a barra em destaque */}
          <pattern
            id={`${gid}-stripes`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="8" stroke="var(--color-wine-700)" strokeWidth="3" opacity="0.45" />
          </pattern>

          {/* Sombra suave para a tag flutuante */}
          <filter id={`${gid}-tag-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="rgba(107, 21, 37, 0.25)" />
          </filter>
        </defs>

        {/* Renderização das Barras */}
        {data.map((item, i) => {
          const isHighlighted = i === activeIdx;
          const barHeightPct = Math.max(8, (item.value / max) * 75); // até 75% da altura para sobrar espaço para a tag
          const xPct = (i / data.length) * 100 + (100 / data.length) / 2;
          const barWidth = Math.min(44, Math.max(24, 400 / data.length));

          return (
            <g
              key={item.label}
              className="cursor-pointer transition-all duration-300"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              {/* Barra de fundo / Barra normal */}
              <rect
                x={`${xPct}%`}
                y={`${100 - barHeightPct - 12}%`}
                width={barWidth}
                height={`${barHeightPct}%`}
                rx={barWidth / 2}
                transform={`translate(-${barWidth / 2}, 0)`}
                fill={isHighlighted ? `url(#${gid}-stripes)` : 'var(--color-surface-2)'}
                stroke={isHighlighted ? 'var(--color-wine-700)' : 'transparent'}
                strokeWidth={isHighlighted ? 1.5 : 0}
                className="transition-all duration-300"
              />

              {/* Tag Flutuante de Valor acima da barra em destaque */}
              {isHighlighted && (
                <g className="animate-fade-up">
                  {/* Pílula do valor */}
                  <rect
                    x={`${xPct}%`}
                    y={`${Math.max(2, 100 - barHeightPct - 26)}%`}
                    width={72}
                    height={26}
                    rx={13}
                    transform="translate(-36, 0)"
                    fill="var(--color-wine-700)"
                    filter={`url(#${gid}-tag-shadow)`}
                  />
                  {/* Triângulo indicador para baixo */}
                  <polygon
                    points={`${xPct},${Math.max(2, 100 - barHeightPct - 26) + 7} ${xPct - 4},${Math.max(2, 100 - barHeightPct - 26) + 4} ${xPct + 4},${Math.max(2, 100 - barHeightPct - 26) + 4}`}
                    fill="var(--color-wine-700)"
                  />
                  {/* Texto do valor */}
                  <text
                    x={`${xPct}%`}
                    y={`${Math.max(2, 100 - barHeightPct - 26) + 4.5}%`}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="var(--font-sans)"
                    className="select-none num"
                  >
                    {format(item.value)}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>

      {/* Rótulos do Eixo X na base */}
      <div className="flex justify-between items-center pt-2 border-t border-line/40 px-2">
        {data.map((item, i) => (
          <span
            key={item.label}
            className={`text-micro font-semibold transition-colors duration-200 text-center truncate ${
              i === activeIdx ? 'text-heading font-bold' : 'text-n-400'
            }`}
            style={{ width: `${100 / data.length}%` }}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChunkyBarChart;
