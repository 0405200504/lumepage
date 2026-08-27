import React from 'react';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'signal';

/**
 * O status virou PONTO + RÓTULO.
 *
 * A pílula pastel gorda (verde-menta, creme, lilás) era o elemento mais
 * amador do painel: um retângulo colorido de 24px de altura para dizer
 * "ativo", repetido 17 vezes numa lista, empurrando a informação real
 * para a margem. O ponto de 6px diz o mesmo em 1/8 da área — e como o
 * rótulo fica em mono na cor do texto, ele não depende de contraste de
 * fundo pastel para ser legível.
 */
const DOT: Record<Tone, string> = {
  neutral: 'text-n-400',
  success: 'text-success',
  warning: 'text-warning',
  danger:  'text-danger',
  info:    'text-info',
  accent:  'text-wine-700',
  /* signal nunca colore TEXTO — só o ponto. Ver StatusLabel abaixo. */
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

/**
 * Ponto + rótulo. Este é o substituto direto de `<StatusPill>`.
 *
 * O rótulo fica em n-600 e não na cor do tom: cor no texto pequeno é o
 * que obrigava os fundos pastel a existir. O ponto carrega o significado,
 * o texto carrega a palavra. Quem precisa do texto tingido (uma única
 * linha em erro, por exemplo) passa `strong`.
 */
export const StatusLabel: React.FC<{
  tone?: Tone;
  children: React.ReactNode;
  /** Tinge também o texto. Use com parcimônia — e nunca com `signal`,
   *  que reprova em contraste abaixo de 24px. */
  strong?: boolean;
  live?: boolean;
  className?: string;
}> = ({ tone = 'neutral', children, strong, live, className = '' }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`}>
    <StatusDot tone={tone} live={live} />
    <span className={`mono-micro ${strong && tone !== 'signal' ? DOT[tone] : 'text-n-600'}`}>
      {children}
    </span>
  </span>
);

export default StatusDot;
