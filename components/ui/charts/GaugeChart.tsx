'use client';

import React, { useId } from 'react';

interface GaugeChartProps {
  /** Valor percentual de 0 a 100 (ou mais) */
  value: number;
  /** Rótulo principal no centro */
  label?: string;
  /** Subtítulo descritivo */
  sublabel?: string;
  /** Valor formatado no centro (ex: R$ 12.500) */
  centerValue?: string;
  /** Cor do arco ativo (padrão: gradiente vinho da marca) */
  color?: string;
  /** Tamanho em pixels (largura/altura) */
  size?: number;
  /** Espessura do arco */
  strokeWidth?: number;
  className?: string;
}

/**
 * Gráfico Gauge Circular Futurista (Arco de 240 graus).
 * Inspirado em interfaces de telemetria moderna (Linear / Apple Health / Fintech HUD).
 */
export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  label,
  sublabel,
  centerValue,
  color = 'var(--color-wine-700)',
  size = 180,
  strokeWidth = 14,
  className = '',
}) => {
  const gid = useId();
  const clamped = Math.max(0, Math.min(100, value));
  
  // Raio e centro
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  
  // Arco de 240 graus (-210° a 30°)
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle; // 240 graus
  
  const arcLength = (totalAngle / 360) * (2 * Math.PI * radius);
  const filledLength = (clamped / 100) * arcLength;
  
  // Coordenadas para o ponto brilhante na ponta do arco
  const currentAngle = startAngle + (clamped / 100) * totalAngle;
  const currentRad = (currentAngle * Math.PI) / 180;
  const needleX = center + radius * Math.cos(currentRad);
  const needleY = center + radius * Math.sin(currentRad);

  // SVG path para arco de 240°
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, startA: number, endA: number) => {
    const start = polarToCartesian(x, y, r, endA);
    const end = polarToCartesian(x, y, r, startA);
    const largeArcFlag = endA - startA <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const trackPath = describeArc(center, center, radius, startAngle, endAngle);

  return (
    <div className={`relative flex flex-col items-center justify-center ${className}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <defs>
          <linearGradient id={`${gid}-gradient`} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-wine-500)" />
            <stop offset="70%" stopColor="var(--color-wine-700)" />
            <stop offset="100%" stopColor="#c66e84" />
          </linearGradient>
          
          <filter id={`${gid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Track de Fundo translúcido */}
        <path
          d={trackPath}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Marcações de Ticks discretas */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const a = startAngle + pct * totalAngle;
          const rad = (a * Math.PI) / 180;
          const innerR = radius - strokeWidth / 2 - 4;
          const outerR = radius - strokeWidth / 2 - 8;
          const x1 = center + innerR * Math.cos(rad);
          const y1 = center + innerR * Math.sin(rad);
          const x2 = center + outerR * Math.cos(rad);
          const y2 = center + outerR * Math.sin(rad);
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--color-line-strong)"
              strokeWidth="1.5"
              strokeLinecap="round"
              opacity={0.6}
            />
          );
        })}

        {/* Arco de Progresso Preenchido com Gradiente */}
        {clamped > 0 && (
          <path
            d={trackPath}
            fill="none"
            stroke={`url(#${gid}-gradient)`}
            strokeWidth={strokeWidth}
            strokeDasharray={`${filledLength} ${arcLength}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        )}

        {/* Ponto Luminoso na ponta do arco */}
        {clamped > 2 && (
          <circle
            cx={needleX}
            cy={needleY}
            r={strokeWidth / 2 - 1}
            fill="#ffffff"
            stroke="var(--color-wine-700)"
            strokeWidth="2.5"
            filter={`url(#${gid}-glow)`}
            className="transition-all duration-700 ease-out"
          />
        )}
      </svg>

      {/* Conteúdo Central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none pt-2">
        {centerValue ? (
          <>
            <span className="text-h2 font-bold text-heading num tracking-tight leading-none">
              {centerValue}
            </span>
            <span className="text-micro font-bold text-wine-700 mt-1 bg-wine-50 px-2 py-0.5 rounded-full">
              {clamped}% {label}
            </span>
          </>
        ) : (
          <>
            <span className="text-display font-bold text-heading num tracking-tight leading-none">
              {clamped}%
            </span>
            {label && (
              <span className="text-caption font-semibold text-n-500 mt-1 uppercase tracking-wider">
                {label}
              </span>
            )}
          </>
        )}
        {sublabel && (
          <span className="text-micro text-n-400 mt-0.5 max-w-[120px] truncate">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default GaugeChart;
