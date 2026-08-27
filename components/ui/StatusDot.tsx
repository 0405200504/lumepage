import React from 'react';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'signal';

/**
 * Status = PÍLULA SUAVE com ponto.
 *
 * Duas rodadas atrás isto era um retângulo pastel gordo de 24px com borda
 * própria — pesava mais que o dado. A rodada seguinte cortou para um ponto
 * de 6px solto sobre a superfície nua, e aí faltou o contrário: um ponto
 * cinza-esverdeado de 6px numa lista de 17 serviços não se lê a um palmo
 * de distância, e o rótulo em caixa alta ao lado não pertencia a nada.
 *
 * O ponto de equilíbrio é o das referências: pílula de fundo CLARÍSSIMO
 * (o mesmo tom da família, a 6% de saturação), texto na cor forte do tom,
 * sem borda, altura 26px. Ela agrupa ponto e palavra num objeto só, é
 * legível de longe e não vira mancha — porque o fundo é quase branco.
 */
const DOT: Record<Tone, string> = {
  neutral: 'text-n-400',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  info:    'text-info',
  accent:  'text-wine-700',
  signal:  'text-[color:var(--color-signal)]',
};

/** O ponto sozinho. `live` faz ele piscar UMA vez ao mudar de estado. */
export const StatusDot: React.FC<{
  tone?: Tone;
  live?: boolean;
  className?: string;
}> = ({ tone = 'neutral', live, className = '' }) => (
  <span
    className={`status-dot ${DOT[tone]} ${className}`}
    data-live={live ? 'true' : undefined}
    aria-hidden
  />
);

/** Fundo + texto de cada tom. O fundo é sempre o *-bg da paleta semântica,
 *  que foi calibrado para ficar entre 3% e 6% de saturação: perto o
 *  suficiente do branco para não virar bloco de cor numa lista longa. */
const PILL: Record<Tone, string> = {
  neutral: 'bg-n-100 text-n-600',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger:  'bg-danger-bg text-danger',
  info:    'bg-info-bg text-info',
  accent:  'bg-wine-50 text-wine-700',
  signal:  'bg-[color:var(--color-signal-bg)] text-[color:var(--color-signal-ink)]',
};

/**
 * Ponto + rótulo dentro da pílula. Substituto direto de `<StatusPill>`.
 *
 * `strong` ficou sem efeito visual: na pílula o texto JÁ é da cor do tom.
 * O parâmetro sobrou porque várias telas o passam.
 */
export const StatusLabel: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  /** @deprecated Sem efeito — o texto da pílula já usa a cor do tom. */
  strong?: boolean;
  live?: boolean;
  className?: string;
}> = ({ tone = 'neutral', children, live, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1.5 h-[26px] px-2.5 rounded-full whitespace-nowrap
      text-caption font-semibold tracking-[-0.005em] ${PILL[tone]} ${className}`}
  >
    <StatusDot tone={tone} live={live} />
    {children}
  </span>
);

export default StatusDot;
