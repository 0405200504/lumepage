import React from 'react';

/**
 * Ranking em barras horizontais.
 *
 * Substitui o gráfico de colunas em "faturamento por profissional": com uma conta
 * respondendo por 99% do total, o de colunas virava um bloco vinho gigante ao lado
 * de sete linhas rasas — impossível de ler e sem nome ao lado do valor. Na horizontal
 * cada linha tem rótulo, valor e participação, e a comparação continua honesta
 * porque a escala é a mesma para todos.
 */

export interface RankedItem {
  id: string;
  label: string;
  value: number;
  /** Participação no total, em %. Opcional. */
  sharePct?: number;
  href?: string;
  /** Linha em destaque (ex.: concentração acima de 50%). */
  alert?: boolean;
}

export function RankedBars({ items, format, emptyText = 'Sem movimento no período.' }: {
  items: RankedItem[];
  format: (value: number) => string;
  emptyText?: string;
}) {
  if (items.length === 0) {
    return <p className="py-8 text-center text-caption text-muted">{emptyText}</p>;
  }

  const max = Math.max(1, ...items.map(i => i.value));

  return (
    <ul className="space-y-1.5">
      {items.map(item => (
        <li key={item.id} className="group">
          <div className="flex items-baseline gap-2 text-caption">
            <span className="font-semibold text-ink truncate min-w-0 flex-1" title={item.label}>{item.label}</span>
            {item.sharePct !== undefined && (
              <span className={`num text-caption ${item.alert ? 'text-danger font-bold' : 'text-muted'}`}>
                {item.sharePct.toFixed(0)}%
              </span>
            )}
            <span className="num font-bold text-ink w-24 text-right">{format(item.value)}</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-surface-2 overflow-hidden" aria-hidden>
            <div
              className="h-full rounded-full transition-opacity group-hover:opacity-80"
              style={{
                width: `${Math.max(1, (item.value / max) * 100)}%`,
                background: item.alert ? 'var(--color-bad)' : 'var(--color-accent)',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default RankedBars;
