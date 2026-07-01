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
    <div className="relative flex flex-col items-center justify-center text-center py-12 px-4 border border-dashed border-line rounded-2xl bg-gradient-to-b from-surface-2/40 to-transparent overflow-hidden">
      <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 h-24 w-40 rounded-full bg-wine-500/[0.06] blur-2xl" />
      <div className="relative p-3.5 bg-white text-forest rounded-2xl mb-4 shrink-0 ring-1 ring-wine-700/10 shadow-soft">
        {icon || <FolderOpen className="h-7 w-7" />}
      </div>
      <h3 className="text-sm font-semibold text-heading tracking-tight">{title}</h3>
      <p className="mt-1 text-xs text-gray-450 max-w-xs leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="tap mt-5 px-4 py-2.5 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:shadow-glow transition-all-custom"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
