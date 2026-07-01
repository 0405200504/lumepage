'use client';

import React from 'react';
import { StatBadge } from './StatBadge';
import { Sparkline } from './charts/Sparkline';
import type { Comparison } from '@/lib/analytics';

interface KpiCardProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  hint?: string;
  comparison?: Comparison;
  comparisonSuffix?: string;
  higherIsBetter?: boolean;
  spark?: number[];
  sparkColor?: string;
  /** destaca o número em bordô (dado-chave). */
  accent?: boolean;
  onClick?: () => void;
  className?: string;
}

/** Cartão de KPI minimalista: label uppercase discreto, número grande,
 *  selo de tendência opcional e sparkline opcional. */
export const KpiCard: React.FC<KpiCardProps> = ({
  label, value, icon, hint, comparison, comparisonSuffix = 'vs mês ant.', higherIsBetter = true,
  spark, sparkColor, accent, onClick, className = '',
}) => {
  const clickable = !!onClick;
  return (
    <div
      className={`card-elevated p-4 sm:p-5 flex flex-col ${clickable ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick!(); } : undefined}
    >
      <div className="flex items-center justify-between mb-2.5">
        {icon && (
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-br from-wine-700/8 to-wine-500/5 ring-1 ring-wine-700/10 text-forest">{icon}</span>
        )}
        {comparison && <StatBadge comparison={comparison} suffix={comparisonSuffix} higherIsBetter={higherIsBetter} />}
      </div>
      <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">{label}</p>
      <p className={`text-xl sm:text-2xl font-semibold mt-0.5 tracking-tight tabular-nums ${accent ? 'text-gradient-wine' : 'text-heading'}`}>{value}</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        {hint && <p className="text-[10px] text-gray-450 font-medium">{hint}</p>}
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor ?? 'var(--color-wine-500)'} className="ml-auto" />}
      </div>
    </div>
  );
};

export default KpiCard;
