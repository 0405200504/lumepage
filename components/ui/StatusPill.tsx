import React from 'react';
import { StatusDot, StatusLabel } from './StatusDot';
import type { Tone } from './StatusDot';

export type { Tone };

/**
 * `StatusPill` voltou a ser uma pílula — agora do jeito certo.
 *
 * O desenho vive em `StatusLabel` (components/ui/StatusDot.tsx): fundo
 * claríssimo do próprio tom, texto na cor forte, ponto de 6px à esquerda,
 * 26px de altura, sem borda. Este arquivo é a fachada que dezenas de telas
 * importam; trocar todos os call sites de uma vez seria um diff sem revisão
 * possível.
 */
export const StatusPill: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  /** Mantido por compatibilidade — o ponto agora é sempre desenhado. */
  dot?: boolean;
  /** Ponto que pisca uma vez ao mudar de estado (conexão ao vivo). */
  live?: boolean;
  className?: string;
}> = ({ tone = 'neutral', children, live, className = '' }) => (
  <StatusLabel tone={tone} live={live} className={className}>
    {children}
  </StatusLabel>
);

/**
 * Selo de contagem/rótulo — o irmão menor da pílula de status, sem ponto.
 * Serve para número em item de menu, contador de coluna, tag de plano.
 *
 * Fundo suave e SEM borda: o contorno de 1px em volta de um selo de 20px
 * de altura é o tipo de detalhe que só existe para dizer que existe.
 */
const BADGE: Record<Tone, string> = {
  neutral: 'bg-n-100 text-n-600',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger:  'bg-danger-bg text-danger',
  info:    'bg-info-bg text-info',
  accent:  'bg-wine-700 text-white',
  signal:  'bg-[color:var(--color-signal-bg)] text-[color:var(--color-signal-ink)]',
};

export const Badge: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center justify-center gap-1 rounded-full px-2 h-[22px] min-w-[22px]
      text-micro font-bold tabular-nums whitespace-nowrap ${BADGE[tone]} ${className}`}
  >
    {children}
  </span>
);

export { StatusDot, StatusLabel };
export default StatusPill;
