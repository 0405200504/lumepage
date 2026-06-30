'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

/** Estado de erro consistente, com ação opcional de tentar novamente. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Algo deu errado',
  description = 'Não foi possível carregar estes dados. Tente novamente.',
  onRetry,
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-[color:var(--color-bad)]/20 bg-[color:var(--color-bad)]/5 ${className}`}>
    <div className="p-3 rounded-2xl bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)] mb-3">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h3 className="text-sm font-bold text-heading">{title}</h3>
    <p className="mt-1 text-xs text-gray-450 max-w-xs">{description}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-gray-150 text-xs font-bold text-forest hover:bg-surface-2 transition-colors">
        <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
      </button>
    )}
  </div>
);

export default ErrorState;
