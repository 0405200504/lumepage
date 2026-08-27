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
      className={`card ${clickable ? 'card-interactive cursor-pointer' : ''} p-5 sm:p-6 flex flex-col ${className}`}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter') onClick!(); } : undefined}
    >
      <div className="flex items-center justify-between mb-2.5">
        {icon && (
          <span className="icon-chip" data-accent={accent ? 'true' : undefined} aria-hidden>{icon}</span>
        )}
        {comparison && <StatBadge comparison={comparison} suffix={comparisonSuffix} higherIsBetter={higherIsBetter} />}
      </div>
      <p className="overline text-n-500">{label}</p>
      <p className="num text-h2 font-semibold mt-0.5 text-heading">{value}</p>
      <div className="flex items-end justify-between gap-2 mt-1">
        {hint && <p className="text-caption text-n-500">{hint}</p>}
        {spark && spark.length > 1 && <Sparkline data={spark} color={sparkColor ?? 'var(--color-wine-500)'} className="ml-auto" />}
      </div>
    </div>
  );
};

export default KpiCard;
