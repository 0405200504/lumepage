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

  /* Paleta semântica do design system. O vermelho/âmbar/esmeralda padrão do
     Tailwind não existe na marca — era paleta vazando para dentro do produto.
     O destrutivo NUNCA usa a escala wine-*: se usasse, o botão de excluir
     ficaria igual ao botão primário e a profissional apagaria achando que
     estava salvando. */
  const getThemeClasses = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'border border-line text-danger',
          btnBg: 'bg-danger hover:brightness-95 text-white',
        };
      case 'warning':
        return {
          iconBg: 'border border-line text-warning',
          btnBg: 'bg-warning hover:brightness-95 text-white',
        };
      default:
        return {
          iconBg: 'bg-wine-50 text-wine-700',
          btnBg: 'bg-wine-700 hover:bg-wine-800 text-white',
        };
    }
  };

  const theme = getThemeClasses();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Background overlay */}
      <div
        className="absolute inset-0 bg-wine-950/50 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onCancel}
      />

      {/* Modal Box */}
      <div className="card-elevated relative rounded-3xl p-6 max-w-sm w-full z-10 animate-slide-up">
        <div className="flex gap-4 items-start">
          <div className={`p-3 rounded-2xl ${theme.iconBg} shrink-0`}>
            <AlertCircle className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-body font-bold text-n-900 leading-tight">{title}</h3>
            <p className="mt-2 text-caption text-n-500 leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onCancel}
            className="px-4 py-2 border border-n-200 rounded-xl text-caption font-semibold text-n-600 hover:bg-n-50 transition-colors "
          >
            {cancelText}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-caption font-semibold transition-ui flex items-center gap-1.5 ${theme.btnBg}`}
          >
            {isLoading ? 'Aguarde...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ConfirmDialog;
