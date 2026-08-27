'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle2, AlertTriangle, Info, Undo2 } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  /** Texto do botão de ação (ex.: "Desfazer"). */
  actionLabel?: string;
  /** Chamado ao clicar no botão de ação. */
  onAction?: () => void;
  /** Duração em ms (padrão 4000; 7000 quando há ação). */
  duration?: number;
}

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

type ToastFn = (title: string, message: string, options?: ToastOptions) => void;

interface ToastContextType {
  success: ToastFn;
  error: ToastFn;
  info: ToastFn;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message: string, options?: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message, actionLabel: options?.actionLabel, onAction: options?.onAction }]);

    const duration = options?.duration ?? (options?.actionLabel ? 7000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const success = useCallback<ToastFn>((title, message, options) => addToast('success', title, message, options), [addToast]);
  const error = useCallback<ToastFn>((title, message, options) => addToast('error', title, message, options), [addToast]);
  const info = useCallback<ToastFn>((title, message, options) => addToast('info', title, message, options), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}

      {/* Toast: no desktop entra pelo topo à direita; no celular pelo rodapé,
          acima da tab bar, onde o polegar alcança o botão de desfazer. */}
      <div
        className="fixed z-55 flex flex-col gap-3 pointer-events-none no-print
          left-4 right-4 bottom-[calc(1.5rem+env(safe-area-inset-bottom))]
          sm:left-auto sm:right-6 sm:top-6 sm:bottom-auto sm:w-[380px]"
      >
        {toasts.map((toast) => {
          // Classe ESTÁTICA por tipo: `text-${tone}` não existe para o
          // Tailwind, que varre o código como texto e nunca veria a string.
          const iconColor =
            toast.type === 'success' ? 'text-success' : toast.type === 'error' ? 'text-danger' : 'text-info';
          const Icon =
            toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? AlertTriangle : Info;
          return (
            <div
              key={toast.id}
              role={toast.type === 'error' ? 'alert' : 'status'}
              className="toast-in pointer-events-auto card p-4 flex items-start gap-3"
            >
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden />

              <div className="flex-1 min-w-0">
                <p className="text-label font-semibold text-heading leading-snug">{toast.title}</p>
                <p className="text-caption text-n-500 mt-0.5">{toast.message}</p>
                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={() => { toast.onAction?.(); removeToast(toast.id); }}
                    className="tap mt-2.5 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-wine-700 text-white text-caption font-semibold transition-ui hover:bg-wine-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden />
                    {toast.actionLabel}
                  </button>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                aria-label="Fechar aviso"
                className="tap shrink-0 h-8 w-8 -mt-1 -mr-1 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider');
  }
  return context;
};
