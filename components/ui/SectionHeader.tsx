import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  /** ações à direita (botões, export, etc.) */
  actions?: React.ReactNode;
  className?: string;
}

/** Cabeçalho de seção com hierarquia tipográfica consistente. */
export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, icon, actions, className = '' }) => (
  <div className={`flex items-start justify-between gap-3 ${className}`}>
    <div className="flex items-start gap-2.5 min-w-0">
      {icon && <span className="text-n-500 mt-0.5 shrink-0" aria-hidden>{icon}</span>}
      <div className="min-w-0">
        <h3 className="text-body font-bold text-heading tracking-tight truncate">{title}</h3>
        {subtitle && <p className="text-caption text-n-600 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
  </div>
);

export default SectionHeader;
