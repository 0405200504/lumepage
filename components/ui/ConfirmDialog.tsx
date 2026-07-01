'use client';

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  onConfirm,
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  const getThemeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-50 text-red-600',
          btnBg: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-200'
        };
      case 'warning':
        return {
          iconBg: 'bg-amber-50 text-amber-600',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-amber-200'
        };
      default:
        return {
          iconBg: 'bg-emerald-50 text-emerald-700',
          btnBg: 'bg-forest hover:bg-forest-hover text-white focus:ring-forest/20'
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-[#1a0e12]/50 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal Box */}
      <div className="card-elevated relative rounded-3xl p-6 max-w-sm w-full z-10 animate-slide-up">
        <div className="flex gap-4 items-start">
          <div className={`p-3 rounded-2xl ${theme.iconBg} shrink-0`}>
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 leading-tight">{title}</h3>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors focus:outline-none"
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 transition-all flex items-center gap-1.5 ${theme.btnBg}`}
          >
            {isLoading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmDialog;
