import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export interface IndexItem {
  label: string;
  /** Já formatado. Dinheiro fica em sans; contagem e duração, em mono. */
  value: React.ReactNode;
  /** `mono` para contagem/duração/ID; `money` para R$ (sans + tabular). */
  format?: 'mono' | 'money';
  hint?: string;
  delta?: { pct: number; good?: boolean };
  /** Destaca UM índice por grade — o que exige ação. */
  accent?: boolean;
  /** Abre o detalhamento do índice. Vira botão e ganha estado de hover. */
  onClick?: () => void;
}

/**
 * ARQUÉTIPO 3 · PAINEL DE ÍNDICES.
 *
 * O que isto substitui: oito cards de KPI, cada um com um iconezinho num
 * quadradinho cinza, separados por gap e sombra. O ícone não dizia nada
 * que o rótulo já não dissesse — era ruído repetido oito vezes — e o gap
 * entre cards transformava uma leitura contínua em oito leituras.
 *
 * Aqui os índices dividem UMA superfície e são separados por hairline, do
 * jeito que um mostrador divide os campos: rótulo em mono acima, número
 * grande abaixo, delta com seta e cor semântica. Sem ícone, sem sombra,
 * sem gap.
 */
export const IndexGrid: React.FC<{
  items: IndexItem[];
  /** Colunas no desktop. No mobile são sempre 2. */
  cols?: 2 | 3 | 4;
  className?: string;
}> = ({ items, cols = 4, className = '' }) => {
  const lg = cols === 2 ? 'lg:grid-cols-2' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
  return (
    /* As divisórias são desenhadas pelas bordas das CÉLULAS, com overflow
       escondido no container: assim a última coluna e a última linha não
       ficam com um traço solto para fora da moldura. */
    <div className={`card overflow-hidden ${className}`}>
      <dl className={`grid grid-cols-2 ${lg} -mr-px -mb-px`}>
        {items.map((it, i) => (
          <div
            key={i}
            onClick={it.onClick}
            role={it.onClick ? 'button' : undefined}
            tabIndex={it.onClick ? 0 : undefined}
            onKeyDown={it.onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick!(); } } : undefined}
            className={`border-r border-b border-line p-4 sm:p-5 min-w-0 transition-ui
              focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700
              ${it.onClick ? 'cursor-pointer hover:bg-n-25' : ''}`}
          >
            <dt className="mono-micro text-n-500 truncate">{it.label}</dt>
            <dd
              className={[
                'mt-2 leading-none truncate text-h2 font-semibold',
                it.format === 'mono' ? 'mono' : 'num',
                it.accent ? 'text-wine-700' : 'text-heading',
              ].join(' ')}
            >
              {it.value}
            </dd>
            <div className="mt-2 flex items-center gap-2 min-h-4">
              {it.delta && <Delta pct={it.delta.pct} good={it.delta.good} />}
              {it.hint && <span className="text-caption text-n-500 truncate">{it.hint}</span>}
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
};

/**
 * Delta: seta + número em mono, SEM retângulo de fundo. O selo pastel
 * arredondado em volta de "+12,4%" era mais pesado que o dado.
 */
export const Delta: React.FC<{ pct: number; good?: boolean; className?: string }> = ({
  pct, good, className = '',
}) => {
  if (pct === 0) {
    return (
      <span className={`inline-flex items-center gap-1 mono-micro text-n-500 ${className}`}>
        <Minus className="h-3 w-3" aria-hidden /> 0%
      </span>
    );
  }
  const up = pct > 0;
  const isGood = good ?? up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 mono-micro ${
        isGood ? 'text-success' : 'text-danger'
      } ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? '+' : '−'}{Math.abs(pct).toFixed(1)}%
    </span>
  );
};

export default IndexGrid;
