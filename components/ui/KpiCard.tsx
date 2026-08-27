'use client';

import React from 'react';
import { StatBadge } from './StatBadge';
import { Sparkline } from './charts/Sparkline';
import type { Comparison } from '@/lib/analytics';

interface KpiCardProps {
  label: string;
  value: string;
  /** ⚠️ Ignorado de propósito — mesma razão documentada em StatCard. */
  icon?: React.ReactNode;
  hint?: string;
  comparison?: Comparison;
  comparisonSuffix?: string;
  higherIsBetter?: boolean;
  spark?: number[];
  sparkColor?: string;
  /** destaca o número em vinho (dado-chave). UM por tela. */
  accent?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * KPI: rótulo em mono acima, número grande abaixo, delta com seta e cor
 * semântica, sparkline opcional. Sem ícone decorativo, sem sombra.
 *
 * Quando forem MAIS DE QUATRO KPIs na mesma tela, prefira `<IndexGrid>`:
 * ele divide uma superfície só por hairline em vez de espalhar oito cards
 * soltos, e é assim que um mostrador agrupa campos.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, hint, comparison, comparisonSuffix = 'vs mês ant.', higherIsBetter = true,
  spark, sparkColor, accent, onClick, className = '',
}) => {
  const clickable = !!onClick;
  return (
    <div
      className={`card ${clickable ? 'card-interactive cursor-pointer' : ''} p-4 sm:p-5 flex flex-col ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick!(); } : undefined}
    >
      <p className="mono-micro text-n-500">{label}</p>
      <p className={`num text-h2 font-semibold mt-2 leading-none ${accent ? 'text-wine-700' : 'text-heading'}`}>
        {value}
      </p>
      <div className="flex items-end justify-between gap-2 mt-2">
        <div className="flex flex-col gap-1 min-w-0">
          {comparison && (
            <StatBadge comparison={comparison} suffix={comparisonSuffix} higherIsBetter={higherIsBetter} />
          )}
          {hint && <p className="text-caption text-n-500 truncate">{hint}</p>}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} color={sparkColor ?? 'var(--color-wine-700)'} className="ml-auto" />
        )}
      </div>
    </div>
  );
};

export default KpiCard;
