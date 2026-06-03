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
    <div className="flex flex-col items-center justify-center text-center py-12 px-4 border-2 border-dashed border-gray-250 rounded-3xl bg-white/50">
      <div className="p-4 bg-gray-100/60 text-gray-450 rounded-2xl mb-4 shrink-0">
        {icon || <FolderOpen className="h-8 w-8" />}
      </div>
      <h3 className="text-sm font-bold text-gray-800 tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-gray-450 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all-custom"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
