import React from 'react';
import { FolderOpen } from 'lucide-react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionText,
  onAction
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-line rounded-xl bg-surface-2/50">
      <div className="p-3.5 bg-surface-2 text-gray-450 rounded-xl mb-4 shrink-0">
        {icon || <FolderOpen className="h-7 w-7" />}
      </div>
      <h3 className="text-sm font-semibold text-heading tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-gray-450 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-lg shadow-xs transition-all-custom"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
