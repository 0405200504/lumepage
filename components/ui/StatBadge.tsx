import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import type { Comparison } from '@/lib/analytics';

interface StatBadgeProps {
  comparison: Comparison;
  /** texto após o %, ex.: "vs mês ant." */
  suffix?: string;
  /** quando true, cair é "ruim"; quando false (ex.: despesas), subir é ruim. */
  higherIsBetter?: boolean;
  className?: string;
}

/**
 * Selo de tendência ▲/▼.
 *
 * Perdeu o retângulo de fundo pastel arredondado: um chip verde-menta em
 * volta de "+12,4%" pesava mais que o próprio dado e repetia, no canto de
 * cada card, a paleta que estamos tirando da tela. Agora é seta + número
 * em mono, tingidos pela cor semântica. Zero área de fundo.
 */
export const StatBadge: React.FC<StatBadgeProps> = ({
  comparison, suffix, higherIsBetter = true, className = '',
}) => {
  const { deltaPct, direction } = comparison;
  if (direction === 'flat') {
    return (
      <span className={`inline-flex items-center gap-1 mono-micro text-n-500 ${className}`}>
        <Minus className="h-3 w-3" aria-hidden /> 0%{suffix ? ` ${suffix}` : ''}
      </span>
    );
  }
  const isGood = direction === 'up' ? higherIsBetter : !higherIsBetter;
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 mono-micro ${
        isGood ? 'text-success' : 'text-danger'
      } ${className}`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {Math.abs(deltaPct).toFixed(1)}%{suffix ? ` ${suffix}` : ''}
    </span>
  );
};

export default StatBadge;
