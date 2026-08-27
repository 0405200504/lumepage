import React from 'react';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

/**
 * Selo de status. Usa as cores SEMÂNTICAS, nunca a escala wine-* — vinho
 * é a marca; se ele também significasse "cancelado", o selo competiria
 * com o botão primário pelo mesmo significado.
 *
 * A única exceção é `accent`, que não carrega status: serve para marcar
 * o que já foi concluído/arquivado sem gritar.
 */
const TONES: Record<Tone, string> = {
  neutral: 'bg-n-100 text-n-600 border-n-200',
  success: 'bg-success-bg text-success border-success-border',
  warning: 'bg-warning-bg text-warning border-warning-border',
  danger:  'bg-danger-bg text-danger border-danger-border',
  info:    'bg-info-bg text-info border-info-border',
  accent:  'bg-wine-50 text-wine-700 border-wine-100',
};

export const StatusPill: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  /** Ponto colorido à esquerda (lista densa, onde o texto é curto). */
  dot?: boolean;
  className?: string;
}> = ({ tone = 'neutral', children, dot, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-0.5 overline whitespace-nowrap ${TONES[tone]} ${className}`}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />}
    {children}
  </span>
);

/** Mesma paleta, sem o formato de pílula — para contagens e rótulos. */
export const Badge: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 border rounded-chip px-2 py-0.5 text-caption ${TONES[tone]} ${className}`}
  >
    {children}
  </span>
);

export default StatusPill;
