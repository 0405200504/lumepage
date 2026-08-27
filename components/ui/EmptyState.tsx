import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  /** Ilustração de linha própria do contexto. Sem uma, entra a padrão. */
  illustration?: React.ReactNode;
  /** Atalho: um ícone lucide 22px no quadrado de destaque. */
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  /** Ação em forma de link (navegação) em vez de botão. */
  action?: React.ReactNode;
  /** Moldura tracejada em volta. Ligada por padrão — vazio é tracejado. */
  framed?: boolean;
  className?: string;
}

/**
 * Estado vazio.
 *
 * A moldura é TRACEJADA, e isso não é estilo: no sistema novo o tracejado
 * significa uma coisa só — previsto, não confirmado, VAZIO. É a mesma
 * linha que desenha a receita prevista no financeiro e o slot livre na
 * agenda. Quem aprende o código numa tela lê nas outras.
 *
 * A ilustração é de linha, traço 1.25 (o mesmo dos ícones), monocromática
 * em n-300, com UM acento em wine-400.
 */
const DefaultIllustration = () => (
  <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden>
    <rect
      x="12.5" y="10.5" width="71" height="55" rx="1.5"
      stroke="var(--color-n-300)" strokeWidth="1.25"
    />
    <path d="M13 26h70" stroke="var(--color-n-300)" strokeWidth="1.25" />
    {/* ticks da régua — a mesma hierarquia 6px/3px da agenda */}
    <path d="M22 26v6M32 26v3M42 26v6M52 26v3M62 26v6M72 26v3" stroke="var(--color-n-300)" strokeWidth="1" />
    <path d="M30 7v8M66 7v8" stroke="var(--color-n-300)" strokeWidth="1.25" />
    <path d="M24 40h16M24 50h26" stroke="var(--color-n-300)" strokeWidth="1.25" />
    {/* o acento único */}
    <path d="M60 46h14M67 39v14" stroke="var(--color-wine-400)" strokeWidth="1.25" />
  </svg>
);

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  illustration,
  icon,
  actionText,
  onAction,
  action,
  framed = true,
  className = '',
}) => (
  <div
    className={`flex flex-col items-center justify-center text-center py-12 px-5 rounded-surface ${
      framed ? 'line-dashed' : ''
    } ${className}`}
  >
    <div className="mb-5">
      {illustration ??
        (icon ? (
          <span className="inline-flex items-center justify-center h-11 w-11 rounded-badge border border-wine-200 bg-wine-50 text-wine-700 chamfer-s">
            {icon}
          </span>
        ) : (
          <DefaultIllustration />
        ))}
    </div>
    <h3 className="text-h3 text-heading">{title}</h3>
    <p className="mt-1.5 text-body-sm text-n-500 max-w-xs">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="tap mt-5 h-11 px-4 rounded-chip chamfer-s bg-wine-700 text-white text-body-sm font-semibold transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        {actionText}
      </button>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
