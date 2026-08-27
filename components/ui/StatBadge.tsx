import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { Comparison } from '@/lib/analytics';

interface StatBadgeProps {
  comparison: Comparison;
  /** texto após o %, ex.: "vs mês ant." */
  suffix?: string;
  /** quando true, cair é "ruim" (vermelho); quando false (ex.: despesas), subir é ruim. */
  higherIsBetter?: boolean;
  className?: string;
}

/** Selo de tendência ▲/▼ com cor semântica (verde=bom, vermelho=ruim). */
export const StatBadge: React.FC<StatBadgeProps> = ({ comparison, suffix, higherIsBetter = true, className = '' }) => {
  const { deltaPct, direction } = comparison;
  if (direction === 'flat') {
    return (
      <span className={`inline-flex items-center gap-1 text-caption font-bold px-1.5 py-0.5 rounded-full bg-surface-2 text-n-600 ${className}`}>
        <Minus className="h-4 w-4" /> 0%{suffix ? ` ${suffix}` : ''}
      </span>
    );
  }
  const isGood = direction === 'up' ? higherIsBetter : !higherIsBetter;
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;
  const cls = isGood ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger';
  return (
    <span className={`inline-flex items-center gap-1 text-caption font-bold px-1.5 py-0.5 rounded-full ${cls} ${className}`}>
      <Icon className="h-4 w-4" /> {Math.abs(deltaPct).toFixed(1)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export default StatBadge;
