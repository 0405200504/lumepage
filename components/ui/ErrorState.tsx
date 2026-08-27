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
  <div className={`flex flex-col items-center justify-center text-center py-12 px-4 rounded-2xl border border-danger-border bg-danger-bg ${className}`}>
    <div className="p-3 rounded-2xl bg-danger-bg text-danger mb-3">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h3 className="text-label font-bold text-heading">{title}</h3>
    <p className="mt-1 text-caption text-n-600 max-w-xs">{description}</p>
    {onRetry && (
      <button onClick={onRetry} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-n-200 text-caption font-bold text-wine-700 hover:bg-surface-2 transition-colors">
        <RotateCcw className="h-4 w-4" /> Tentar novamente
      </button>
    )}
  </div>
);

export default ErrorState;
