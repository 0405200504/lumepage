'use client';

import React, { useId, useState } from 'react';

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
  /** Rótulo da unidade, em mono, no topo do eixo. Ex.: "R$". */
  unit?: string;
  className?: string;
}

/**
 * Gráfico com gramática de instrumento.
 *
 * Três decisões que o separam de um gráfico de dashboard genérico:
 *
 * 1. TICKS COM HIERARQUIA. O eixo X ganha traço de 6px no rótulo cheio e
 *    3px entre eles, como a marcação de uma régua. Gridline horizontal
 *    contínua só nas três referências; o resto é marcação de borda.
 * 2. TRACEJADO = PREVISTO. A série `dashed` não é "a segunda cor do
 *    gráfico": ela significa não-confirmado, e significa a mesma coisa no
 *    slot livre da agenda e na moldura do estado vazio.
 * 3. --signal MARCA O PONTO EM FOCO, e nada mais. Ele é luz de indicação:
 *    aparece em 6px sob o cursor e some. Nunca colore uma série inteira,
 *    nunca preenche uma área, nunca carrega texto.
 *
 * Os rótulos de eixo entram em mono — é a tipografia de dado.
 */
export const TechChart: React.FC<TechChartProps> = ({
  labels, series, height = 200, format = String, axisFormat, unit, className = '',
}) => {
  const fmtAxis = axisFormat ?? format;
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);

  /* Com unidade, o topo abre 12px a mais: o rótulo "R$" mora ACIMA da escala
     e sem essa folga ele cai em cima do maior valor. */
  const padL = 44, padR = 10, padB = 26;
  const padT = unit ? 24 : 12;
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

  return (
    /* overflow-hidden é a rede de segurança: nenhum rótulo de eixo pode
       vazar do card e esticar a página. */
    <div className={`relative overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Gráfico: ${series.map((s) => s.name).join(', ')}`}
        onMouseLeave={() => setHover(null)}
      >
        {/* Gridlines: três, e finas. Mais que isso vira papel quadriculado. */}
        {gridTs.map((t, i) => (
          <line
            key={i}
            x1={padL} x2={W - padR}
            y1={padT + innerH * t} y2={padT + innerH * t}
            stroke="var(--color-line)" strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Eixo Y — a régua vertical, mais forte que as gridlines. */}
        <line
          x1={padL} x2={padL} y1={padT} y2={padT + innerH}
          stroke="var(--color-line-strong)" strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        {/* TICKS do eixo X: 6px onde há rótulo, 3px no meio do intervalo. */}
        {labels.map((_, i) => (
          <line
            key={`tk${i}`}
            x1={xOf(i)} x2={xOf(i)}
            y1={padT + innerH} y2={padT + innerH + 6}
            stroke="var(--color-tick)" strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {labels.slice(0, -1).map((_, i) => (
          <line
            key={`tm${i}`}
            x1={xOf(i) + stepX / 2} x2={xOf(i) + stepX / 2}
            y1={padT + innerH} y2={padT + innerH + 3}
            stroke="var(--color-tick)" strokeWidth="1" opacity="0.7"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Séries. `dashed` = previsto. */}
        {series.map((s, si) => (
          <path
            key={si}
            d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xOf(i).toFixed(1)},${yOf(v).toFixed(1)}`).join(' ')}
            fill="none"
            stroke={s.color ?? 'var(--color-wine-700)'}
            strokeWidth="1.5"
            strokeDasharray={s.style === 'dashed' ? '4 4' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Coluna de captura + linha e ponto de foco em --signal. */}
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
              stroke="var(--color-signal)" strokeWidth="1" opacity="0.5"
              vectorEffect="non-scaling-stroke"
            />
            {series.map((s, si) => (
              <circle
                key={`p${si}${gid}`}
                cx={xOf(hover)} cy={yOf(s.values[hover] ?? 0)} r="3"
                fill="var(--color-signal)"
              />
            ))}
          </>
        )}
      </svg>

      {/* Rótulos em mono, fora do SVG: dentro dele o preserveAspectRatio
          "none" esticaria a fonte junto com o desenho. */}
      {/* A unidade fica SOZINHA acima da escala. Concatenada ao maior valor
          ("R$ 3.1k") ela estourava os 44px da calha e quebrava em duas linhas,
          encavalando no primeiro rótulo. Unidade é cabeçalho da coluna de
          números, não parte do número. */}
      {unit && (
        <span className="absolute left-0 top-0 mono-micro text-n-400 pl-1">{unit}</span>
      )}
      <div className="absolute left-0 top-0 h-full w-11 flex flex-col justify-between pointer-events-none overflow-hidden"
           style={{ paddingTop: padT - 5, paddingBottom: padB - 5 }}>
        {[max, min + span / 2, min].map((v, i) => (
          <span key={i} className="mono-micro text-n-400 pr-2 text-right block truncate">
            {fmtAxis(v)}
          </span>
        ))}
      </div>

      {/* Rótulos do eixo X posicionados na COORDENADA de cada ponto, não
          distribuídos por `justify-between`: assim o rótulo fica sob o dado a
          que pertence mesmo quando alguns são omitidos.
          E eles são omitidos: doze meses não cabem em 300px de celular. O
          `stride` mostra no máximo ~6 rótulos no mobile e ~12 no desktop —
          duas listas, porque a decisão depende da largura e não há medição
          no servidor. */}
      {[
        { cls: 'sm:hidden', stride: Math.ceil(labels.length / 6) },
        { cls: 'hidden sm:block', stride: Math.ceil(labels.length / 12) },
      ].map(({ cls, stride }) => (
        <div key={cls} className={`absolute left-0 right-0 bottom-0 h-4 pointer-events-none overflow-hidden ${cls}`}>
          {labels.map((l, i) =>
            i % stride !== 0 && i !== labels.length - 1 ? null : (
              <span
                key={i}
                className={`mono-micro absolute -translate-x-1/2 whitespace-nowrap ${
                  hover === i ? 'text-[color:var(--color-signal-ink)]' : 'text-n-400'
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
