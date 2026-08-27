import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  /** Ilustração de linha própria do contexto. Sem uma, entra a padrão. */
  illustration?: React.ReactNode;
  /** Atalho: um ícone lucide 24px emoldurado no chip de destaque. */
  icon?: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
  /** Ação em forma de link (navegação) em vez de botão. */
  action?: React.ReactNode;
}

/**
 * Ilustração de linha: traço 1.5, monocromática em n-300, com UM único
 * acento em wine-400. Nada de foto de banco de imagem, nada de emoji
 * gigante — os dois denunciam interface montada às pressas.
 */
const DefaultIllustration = () => (
  <svg width="96" height="72" viewBox="0 0 96 72" fill="none" aria-hidden>
    <rect
      x="12.75" y="10.75" width="70.5" height="54.5" rx="7.25"
      stroke="var(--color-n-300)" strokeWidth="1.5"
    />
    <path d="M13 26h70" stroke="var(--color-n-300)" strokeWidth="1.5" />
    <path d="M30 8v9M66 8v9" stroke="var(--color-n-300)" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M26 38h14M26 48h24" stroke="var(--color-n-300)" strokeWidth="1.5" strokeLinecap="round" />
    {/* o acento único */}
    <circle cx="66" cy="46" r="7.25" stroke="var(--color-wine-400)" strokeWidth="1.5" />
    <path d="M66 42.5v7M62.5 46h7" stroke="var(--color-wine-400)" strokeWidth="1.5" strokeLinecap="round" />
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
}) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-5">
    <div className="mb-5">
      {illustration ??
        (icon ? (
          <span className="inline-flex items-center justify-center h-14 w-14 rounded-hero bg-wine-50 text-wine-700">
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
        className="tap mt-5 h-11 px-4 rounded-control bg-wine-700 text-white text-label font-semibold shadow-wine transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
      >
        {actionText}
      </button>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export default EmptyState;
