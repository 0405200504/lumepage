import React from 'react';

/**
 * Gráfico de barras do admin — server component, SVG puro, sem dependência.
 *
 * Corrige o que havia antes: sem eixo, sem grade, sem tooltip, com degradê decorativo
 * e metade da largura ocupada por meses zerados. Aqui: grade horizontal sutil, eixo Y
 * com rótulo formatado, tooltip nativo por barra, cor sólida da marca e a opção de
 * colapsar a sequência de meses vazios do começo da série.
 */

export interface BarPoint {
  label: string;
  value: number;
  /** Texto do tooltip; se ausente, usa `${label}: ${format(value)}`. */
  hint?: string;
}

interface Props {
  points: BarPoint[];
  /** Formata eixo e tooltip (ex.: brl). */
  format?: (value: number) => string;
  height?: number;
  /** Descarta os meses zerados do início da série. */
  trimLeadingZeros?: boolean;
  caption?: string;
}

export function BarChart({ points, format = v => String(v), height = 160, trimLeadingZeros = true, caption }: Props) {
  let data = points;
  if (trimLeadingZeros) {
    const firstNonZero = data.findIndex(p => p.value > 0);
    // Mantém pelo menos 3 colunas para o gráfico não virar uma barra solta.
    if (firstNonZero > 0) data = data.slice(Math.min(firstNonZero, Math.max(0, data.length - 3)));
  }

  const max = Math.max(1, ...data.map(p => p.value));
  const ticks = [max, max / 2, 0];

  if (data.every(p => p.value === 0)) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-10" style={{ minHeight: height }}>
        <p className="text-xs font-semibold text-muted">Sem movimento no período</p>
        <p className="text-[11px] text-faint mt-0.5">Quando houver dados, o gráfico aparece aqui.</p>
      </div>
    );
  }

  return (
    <figure className="w-full">
      <div className="flex gap-2" style={{ height }}>
        {/* Eixo Y */}
        <div className="flex flex-col justify-between text-[10px] text-faint tabular-nums shrink-0 pb-4">
          {ticks.map((t, i) => <span key={i}>{format(t)}</span>)}
        </div>

        <div className="relative flex-1 min-w-0">
          {/* Grade */}
          <div className="absolute inset-0 bottom-4 flex flex-col justify-between pointer-events-none" aria-hidden>
            {ticks.map((_, i) => <span key={i} className="block border-t border-line" />)}
          </div>

          <ul className="relative flex items-end gap-1.5 h-full pb-4">
            {data.map((p, i) => (
              <li key={i} className="flex-1 min-w-0 flex flex-col justify-end h-full group" title={p.hint ?? `${p.label}: ${format(p.value)}`}>
                {/* O valor exato aparece no hover — não é decoração, é a informação
                    que o eixo aproxima. */}
                <span className="block text-[10px] text-center tabular-nums text-ink font-semibold opacity-0 group-hover:opacity-100 transition-opacity truncate">
                  {format(p.value)}
                </span>
                <span
                  className="w-full rounded-t bg-accent transition-opacity group-hover:opacity-80"
                  style={{ height: `${Math.max(2, (p.value / max) * 100)}%`, opacity: p.value ? 1 : 0.18 }}
                  aria-hidden
                />
              </li>
            ))}
          </ul>

          {/* Eixo X */}
          <ul className="absolute bottom-0 left-0 right-0 flex gap-1.5">
            {data.map((p, i) => (
              <li key={i} className="flex-1 min-w-0 text-center text-[10px] text-muted truncate">{p.label}</li>
            ))}
          </ul>
        </div>
      </div>
      {caption && <figcaption className="mt-2 text-[11px] text-muted">{caption}</figcaption>}
    </figure>
  );
}

export default BarChart;
