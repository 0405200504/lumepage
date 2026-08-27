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
 * Duas peças, não uma: a variação vive numa PÍLULA suave (seta + número,
 * na cor semântica) e o "vs mês ant." fica FORA dela, em cinza. É assim
 * nas referências, e a razão é de leitura: o olho precisa capturar
 * "+12,4% para cima, é bom" num relance, e a frase de comparação é
 * contexto que só se lê depois. Enfiar as duas coisas dentro do mesmo
 * chip colorido cria um bloco de 180px que compete com o número do KPI.
 */
export const StatBadge: React.FC<StatBadgeProps> = ({
  comparison, suffix, higherIsBetter = true, className = '',
}) => {
  const { deltaPct, direction } = comparison;

  if (direction === 'flat') {
    return (
      <span className={`inline-flex items-center gap-1.5 ${className}`}>
        <span className="inline-flex items-center gap-1 h-6 px-2 rounded-full bg-n-100 text-n-600 text-caption font-bold tabular-nums">
          <Minus className="h-3 w-3" aria-hidden /> 0%
        </span>
        {suffix && <span className="text-caption text-n-500">{suffix}</span>}
      </span>
    );
  }

  const isGood = direction === 'up' ? higherIsBetter : !higherIsBetter;
  const Icon = direction === 'up' ? ArrowUpRight : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-0.5 h-6 px-2 rounded-full text-caption font-bold tabular-nums ${
          isGood ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
        }`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {Math.abs(deltaPct).toFixed(1)}%
      </span>
      {suffix && <span className="text-caption text-n-500 truncate">{suffix}</span>}
    </span>
  );
};

export default StatBadge;
