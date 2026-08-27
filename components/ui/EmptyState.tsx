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
 * A moldura deixou de ser tracejada e virou uma superfície: cinza-claro,
 * raio 20, sem contorno. O tracejado é a forma mais barata de dizer
 * "vazio" e também a mais datada — ele desenha uma caixa pontilhada no
 * meio de uma tela cujos outros objetos não têm contorno nenhum, e o
 * resultado é um buraco na composição em vez de um convite.
 *
 * A ilustração é de linha, traço 1.5 com ponta arredondada (o mesmo dos
 * ícones), monocromática em n-300, com UM acento em wine-400.
 */
const DefaultIllustration = () => (
  <svg width="104" height="80" viewBox="0 0 104 80" fill="none" aria-hidden
       strokeLinecap="round" strokeLinejoin="round">
    {/* Um cartão com raio grande, dois campos e o "+" em vinho: a mesma
        geometria do resto do produto, em traço. */}
    <rect
      x="14" y="14" width="76" height="56" rx="12"
      stroke="var(--color-n-300)" strokeWidth="1.5"
    />
    <path d="M14 32h76" stroke="var(--color-n-300)" strokeWidth="1.5" />
    <circle cx="24" cy="23" r="2" fill="var(--color-n-300)" />
    <circle cx="32" cy="23" r="2" fill="var(--color-n-300)" />
    <path d="M26 45h20M26 56h32" stroke="var(--color-n-300)" strokeWidth="1.5" />
    {/* o acento único */}
    <circle cx="76" cy="52" r="13" fill="var(--color-wine-50)" />
    <path d="M69.5 52h13M76 45.5v13" stroke="var(--color-wine-400)" strokeWidth="1.75" />
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
    className={`flex flex-col items-center justify-center text-center py-14 px-6 rounded-surface ${
      framed ? 'bg-surface-2' : ''
    } ${className}`}
  >
    <div className="mb-5">
      {illustration ??
        (icon ? (
          <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-wine-50 text-wine-700">
            {icon}
          </span>
        ) : (
          <DefaultIllustration />
        ))}
    </div>
    <h3 className="text-h3 text-heading">{title}</h3>
    <p className="mt-2 text-body-sm text-n-500 max-w-sm leading-relaxed">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="tap mt-6 h-11 px-5 rounded-full bg-wine-700 shadow-[var(--shadow-wine)] text-white text-body-sm font-semibold transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        {actionText}
      </button>
    )}
    {action && <div className="mt-6">{action}</div>}
  </div>
);

export default EmptyState;
