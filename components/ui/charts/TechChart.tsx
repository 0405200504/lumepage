'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

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
  /**
   * Formato COMPACTO do eixo Y. A calha tem 44px: "R$ 6.000,00" não cabe e
   * vazava para fora do card, esticando a página inteira no celular.
   * Sem este parâmetro cai em `format`, então gráficos de números curtos
   * continuam funcionando sem mudança.
   */
  axisFormat?: (v: number) => string;
  /** Rótulo da unidade, no topo do eixo. Ex.: "R$". */
  unit?: string;
  className?: string;
}

/**
 * O gráfico do produto — rodada 5.
 *
 * Novidades sobre a versão anterior:
 *
 * 1. ANIMAÇÃO DE ENTRADA. A curva "se desenha" da esquerda para a direita
 *    com `stroke-dashoffset` animado via CSS. A área "sobe" com `clip-path`.
 *    Tudo dispara uma vez na montagem e respeita `prefers-reduced-motion`.
 *
 * 2. TOOLTIP MULTI-SÉRIE. Antes só mostrava o valor da série principal.
 *    Agora mostra TODAS as séries com suas cores e nomes — numa pílula
 *    expandida com layout stack que não corta informação.
 *
 * 3. TOUCH SUPPORT. `onTouchMove` para celular, não só `onMouseEnter`.
 *
 * 4. PONTO COM PULSO SUTIL. O circle de hover tem uma animação de escala
 *    contida — o dado "respira" no foco.
 *
 * 5. GRADIENTE ENRIQUECIDO. A área principal tem um gradiente mais
 *    sofisticado de 3 stops com transição mais suave.
 */

/** Catmull-Rom → Bézier cúbica. */
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

/** Estima o comprimento de um path SVG para animar stroke-dashoffset. */
function estimatePathLength(pts: readonly (readonly [number, number])[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i][0] - pts[i - 1][0];
    const dy = pts[i][1] - pts[i - 1][1];
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return Math.ceil(len * 1.2); // margem para curvas
}

export const TechChart: React.FC<TechChartProps> = ({
  labels, series, height = 220, format = String, axisFormat, unit, className = '',
}) => {
  const fmtAxis = axisFormat ?? format;
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const padL = 44, padR = 10, padB = 26;
  const padT = unit ? 46 : 38;
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

  // Estimar comprimento para animação
  const pathLengths = series.map(s => {
    const pts = s.values.map((v, i) => [xOf(i), yOf(v)] as const);
    return estimatePathLength(pts);
  });

  // Touch support para mobile
  const handleTouch = useCallback((e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const touch = e.touches[0];
    const rect = svgRef.current.getBoundingClientRect();
    const relX = touch.clientX - rect.left;
    const ratio = relX / rect.width;
    const idx = Math.round(ratio * (n - 1));
    if (idx >= 0 && idx < n) setHover(idx);
  }, [n]);

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
              <stop offset="0%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0.22" />
              <stop offset="50%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0.08" />
              <stop offset="100%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines */}
        {gridTs.map((t, i) => (
          <line
            key={i}
            x1={padL} x2={W - padR}
            y1={padT + innerH * t} y2={padT + innerH * t}
            stroke="var(--color-line)" strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Área sob a série principal — com animação de entrada */}
        {main && main.style !== 'dashed' && main.values.length > 1 && (
          <path
            d={`${smoothPath(main.values.map((v, i) => [xOf(i), yOf(v)] as const))} L${xOf(main.values.length - 1)},${padT + innerH} L${xOf(0)},${padT + innerH} Z`}
            fill={`url(#${gid}-fill-0)`}
            className="chart-area-in"
          />
        )}

        {/* Séries com animação de desenho */}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => [xOf(i), yOf(v)] as const);
          const pLen = pathLengths[si];
          return (
            <path
              key={si}
              d={smoothPath(pts)}
              fill="none"
              stroke={s.color ?? 'var(--color-wine-700)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.style === 'dashed' ? '5 6' : undefined}
              vectorEffect="non-scaling-stroke"
              className={s.style !== 'dashed' ? 'chart-draw-in' : undefined}
              style={s.style !== 'dashed' ? { '--chart-len': pLen } as React.CSSProperties : undefined}
            />
          );
        })}

        {/* Coluna de captura + foco */}
        {labels.map((_, i) => (
          <rect
            key={`hit${i}`}
            x={xOf(i) - stepX / 2} y={padT}
            width={Math.max(stepX, 1)} height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}
        {hover !== null && (
          <>
            <line
              x1={xOf(hover)} x2={xOf(hover)} y1={padT} y2={padT + innerH}
              stroke="var(--color-line-strong)" strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              style={{ opacity: 0.6 }}
            />
            {series.map((s, si) => (
              <circle
                key={`p${si}${gid}`}
                cx={xOf(hover)} cy={yOf(s.values[hover] ?? 0)} r="4"
                fill={s.color ?? 'var(--color-wine-700)'}
                stroke="var(--color-surface)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
                style={{
                  animation: 'chart-point-pulse 2s ease-in-out infinite',
                  transformOrigin: `${xOf(hover)}px ${yOf(s.values[hover] ?? 0)}px`,
                }}
              />
            ))}
          </>
        )}
      </svg>

      {/* TOOLTIP MULTI-SÉRIE — mostra TODAS as séries */}
      {hover !== null && series.length > 0 && (
        <div
          className="absolute -translate-x-1/2 pointer-events-none z-10
            px-3 py-2 rounded-2xl bg-ink-surface text-white
            shadow-[var(--shadow-md)] whitespace-nowrap"
          style={{
            left: `${Math.min(88, Math.max(12, (xOf(hover) / W) * 100))}%`,
            top: '2px',
          }}
        >
          {/* Rótulo do eixo X */}
          <span className="block text-micro font-medium text-n-400 mb-1">
            {labels[hover]}
          </span>
          {/* Valores de cada série */}
          {series.map((s, si) => (
            <div key={si} className="flex items-center gap-2 text-caption font-bold tabular-nums">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ background: s.color ?? 'var(--color-wine-300)' }}
              />
              <span className="text-n-300 font-medium text-micro">{s.name}</span>
              <span className="ml-auto pl-2">{format(s.values[hover] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Rótulos de eixo Y */}
      {unit && (
        <span className="absolute left-0 top-1.5 text-micro font-semibold text-n-400 pl-1">{unit}</span>
      )}
      <div className="absolute left-0 top-0 h-full w-11 flex flex-col justify-between pointer-events-none overflow-hidden"
           style={{ paddingTop: padT - 6, paddingBottom: padB - 6 }}>
        {[max, min + span / 2, min].map((v, i) => (
          <span key={i} className="text-micro font-medium tabular-nums text-n-400 pr-2 text-right block truncate">
            {fmtAxis(v)}
          </span>
        ))}
      </div>

      {/* Rótulos do eixo X */}
      {[
        { cls: 'sm:hidden', stride: Math.ceil(labels.length / 6) },
        { cls: 'hidden sm:block', stride: Math.ceil(labels.length / 12) },
      ].map(({ cls, stride }) => (
        <div key={cls} className={`absolute left-0 right-0 bottom-0 h-4 pointer-events-none overflow-hidden ${cls}`}>
          {labels.map((l, i) =>
            i % stride !== 0 && i !== labels.length - 1 ? null : (
              <span
                key={i}
                className={`text-micro font-medium absolute -translate-x-1/2 whitespace-nowrap transition-colors ${
                  hover === i ? 'text-heading' : 'text-n-400'
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
