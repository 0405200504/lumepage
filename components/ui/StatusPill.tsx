import React from 'react';
import { StatusDot, StatusLabel } from './StatusDot';
import type { Tone } from './StatusDot';

export type { Tone };

/**
 * `StatusPill` deixou de ser uma pílula.
 *
 * O nome e a assinatura continuam porque dezenas de telas chamam por ele —
 * trocar o call site em todas de uma vez seria um diff sem revisão possível.
 * O que mudou é o desenho: onde havia um retângulo de raio total com fundo
 * verde-menta e borda pastel, agora há um ponto de 6px e um rótulo em mono.
 *
 * Por que a pílula tinha de sair: ela ocupava ~90×24px para carregar uma
 * palavra, e numa lista de 17 serviços isso é uma coluna inteira de manchas
 * coloridas competindo com o nome do serviço. Também obrigava cada tom a ter
 * três cores (fundo, borda, texto) — nove cores de status na paleta, todas
 * fora da marca.
 *
 * O `dot` virou padrão e o parâmetro sobrou por compatibilidade.
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
 * Selo de contagem/rótulo. Retângulo de raio 4 com hairline e texto em
 * mono — sem fundo pastel. O `accent` (vinho) ganha o chanfro de 6px,
 * que é a assinatura do estado ativo.
 */
const BADGE: Record<Tone, string> = {
  neutral: 'border-line text-n-600',
  success: 'border-line text-success',
  warning: 'border-line text-warning',
  danger:  'border-line text-danger',
  info:    'border-line text-info',
  accent:  'border-wine-200 bg-wine-50 text-wine-700 chamfer-s',
  signal:  'border-line text-[color:var(--color-signal-ink)]',
};

export const Badge: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 border rounded-badge px-1.5 h-5 mono-micro whitespace-nowrap ${BADGE[tone]} ${className}`}
  >
    {children}
  </span>
);

export { StatusDot, StatusLabel };
export default StatusPill;
