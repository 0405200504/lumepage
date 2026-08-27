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
 * KPI: rótulo pequeno, número grande, pílula de variação e sparkline.
 *
 * A sparkline foi para a linha de baixo, alinhada à direita e do tamanho
 * de um selo — nas referências ela é ilustração de apoio, nunca disputa
 * com o número. O rótulo é 12px em cinza: ele existe para ser lido UMA
 * vez, na primeira visita à tela.
 *
 * Quando forem MAIS DE QUATRO KPIs na mesma tela, prefira `<IndexGrid>`:
 * ele divide uma superfície só em vez de espalhar oito cards soltos.
 */
export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, hint, comparison, comparisonSuffix = 'vs mês ant.', higherIsBetter = true,
  spark, sparkColor, accent, onClick, className = '',
}) => {
  const clickable = !!onClick;
  return (
    <div
      className={`card ${clickable ? 'card-interactive cursor-pointer' : ''} p-5 sm:p-6 flex flex-col ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick!(); } : undefined}
    >
      <p className="text-caption font-medium text-n-500 leading-snug">{label}</p>
      <p className={`num text-h1 font-bold mt-3.5 leading-none ${accent ? 'text-wine-700' : 'text-heading'}`}>
        {value}
      </p>
      <div className="flex items-end justify-between gap-3 mt-3.5">
        <div className="flex flex-col gap-1.5 min-w-0">
          {comparison && (
            <StatBadge comparison={comparison} suffix={comparisonSuffix} higherIsBetter={higherIsBetter} />
          )}
          {hint && <p className="text-caption text-n-500 truncate">{hint}</p>}
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} color={sparkColor ?? 'var(--color-wine-700)'} className="ml-auto shrink-0" />
        )}
      </div>
    </div>
  );
};

export default KpiCard;
