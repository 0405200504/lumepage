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
  /** Rótulo da unidade, no topo do eixo. Ex.: "R$". */
  unit?: string;
  className?: string;
}

/**
 * O gráfico do produto.
 *
 * Ele tinha gramática de instrumento de medição: eixo Y desenhado como
 * régua, ticks de 6px e 3px alternados na base, linha de 1,5px e o ponto de
 * foco num vermelho de sinalização. Lia como osciloscópio.
 *
 * O que as referências fazem, e o que ele faz agora:
 *
 * 1. CURVA MACIA. A linha é interpolada (Catmull-Rom convertida em Bézier)
 *    e desenhada com 2,5px de ponta arredondada. Série de dinheiro no mês
 *    não é sinal digital: a curva suave é honesta com o dado e é metade do
 *    que faz o gráfico parecer caro.
 * 2. ÁREA SOB A LINHA. Um gradiente da cor da série até transparente, a
 *    14% de opacidade. Dá corpo ao gráfico sem inventar uma segunda cor.
 * 3. PÍLULA DE VALOR NO HOVER. O número aparece numa pílula escura, no topo
 *    do quadro e alinhada ao ponto — em vez de obrigar a pessoa a ler o
 *    eixo e interpolar de cabeça. É o detalhe mais copiado dos painéis de
 *    2026 porque é o que realmente serve.
 * 4. SEM RÉGUA E SEM TICK. Sobraram três gridlines quase invisíveis. A
 *    marcação de 3px na base não media nada — era enfeite fingindo rigor.
 *
 * `dashed` continua significando PREVISTO / não confirmado, e significa a
 * mesma coisa no slot livre da agenda.
 */

/** Catmull-Rom → Bézier cúbica. Tensão 1 (padrão) dá a curva "de dashboard":
 *  acompanha os pontos sem inventar picos entre eles. */
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

export const TechChart: React.FC<TechChartProps> = ({
  labels, series, height = 220, format = String, axisFormat, unit, className = '',
}) => {
  const fmtAxis = axisFormat ?? format;
  const gid = useId();
  const [hover, setHover] = useState<number | null>(null);

  /* padT reserva a faixa do topo onde moram a pílula de valor e o rótulo de
     unidade. Com unidade ela abre mais 8px: o "R$" fica ACIMA da escala e
     sem essa folga cai em cima do maior valor. */
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

  return (
    /* `overflow-hidden` fica: os rótulos do eixo X são absolutos e centrados
       na coordenada do ponto, então o primeiro e o último sempre sobram meia
       palavra para fora do quadro. Sem o corte, essa sobra entra na área
       rolável do documento e o card ganha rolagem horizontal à toa. É por
       causa dele que a pílula de valor mora DENTRO do quadro (na faixa do
       `padT`) em vez de flutuar acima da borda. */
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
        <defs>
          {series.map((s, si) => (
            <linearGradient key={si} id={`${gid}-fill-${si}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0.14" />
              <stop offset="100%" stopColor={s.color ?? 'var(--color-wine-700)'} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* Gridlines: três, e quase invisíveis. Elas orientam a altura; não
            desenham grade. */}
        {gridTs.map((t, i) => (
          <line
            key={i}
            x1={padL} x2={W - padR}
            y1={padT + innerH * t} y2={padT + innerH * t}
            stroke="var(--color-line)" strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Área sob a série — só a principal ganha preenchimento. Duas áreas
            sobrepostas viram mancha e nenhuma das duas se lê. */}
        {main && main.style !== 'dashed' && main.values.length > 1 && (
          <path
            d={`${smoothPath(main.values.map((v, i) => [xOf(i), yOf(v)] as const))} L${xOf(main.values.length - 1)},${padT + innerH} L${xOf(0)},${padT + innerH} Z`}
            fill={`url(#${gid}-fill-0)`}
          />
        )}

        {/* Séries. `dashed` = previsto. */}
        {series.map((s, si) => (
          <path
            key={si}
            d={smoothPath(s.values.map((v, i) => [xOf(i), yOf(v)] as const))}
            fill="none"
            stroke={s.color ?? 'var(--color-wine-700)'}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.style === 'dashed' ? '5 6' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Coluna de captura + foco. */}
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
            />
            {series.map((s, si) => (
              /* Miolo da cor da série com anel branco de 2px: o ponto
                 "descola" da linha e do fundo em qualquer tom. */
              <circle
                key={`p${si}${gid}`}
                cx={xOf(hover)} cy={yOf(s.values[hover] ?? 0)} r="4"
                fill={s.color ?? 'var(--color-wine-700)'}
                stroke="var(--color-surface)"
                strokeWidth="2.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </>
        )}
      </svg>

      {/* PÍLULA DE VALOR — HTML, não SVG: dentro do SVG com
          `preserveAspectRatio="none"` o texto seria esticado junto com o
          desenho.
          Ela segue o ponto no eixo X e mora DENTRO do quadro, na faixa que
          `padT` reservou no topo. A posição é presa entre 8% e 92% para que
          nas pontas ela não seja cortada pelo `overflow-hidden`. */}
      {hover !== null && main && (
        <div
          className="absolute top-1 -translate-x-1/2 pointer-events-none z-10
            px-2.5 h-7 inline-flex items-center rounded-full bg-ink-surface text-white
            text-caption font-bold tabular-nums whitespace-nowrap shadow-[var(--shadow-md)]"
          style={{ left: `${Math.min(92, Math.max(8, (xOf(hover) / W) * 100))}%` }}
        >
          {format(main.values[hover] ?? 0)}
        </div>
      )}

      {/* Rótulos de eixo, fora do SVG pelo mesmo motivo da pílula.
          A unidade fica SOZINHA acima da escala: concatenada ao maior valor
          ("R$ 3.1k") ela estourava os 44px da calha e quebrava em duas
          linhas, encavalando no primeiro rótulo. */}
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
