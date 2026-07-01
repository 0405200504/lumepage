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

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto relative flex items-start gap-3 w-full bg-white/95 backdrop-blur-xl border border-[#efe9e6] rounded-2xl p-4 pl-5 shadow-lg animate-slide-in transition-all overflow-hidden`}
            style={{
              animation: 'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Barra de acento por tipo */}
            <span className={`absolute left-0 top-0 bottom-0 w-1 ${
              toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            }`} />
            {/* Ícones */}
            {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />}

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-800 leading-tight">{toast.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-normal">{toast.message}</p>
              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => { toast.onAction?.(); removeToast(toast.id); }}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#500b18] text-white text-[11px] font-bold hover:bg-[#3d0812] transition-colors"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  {toast.actionLabel}
                </button>
              )}
            </div>

            {/* Fechar */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-450 hover:text-gray-600 p-0.5 rounded-lg hover:bg-gray-50 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes toast-in {
          from {
            transform: translateY(1rem) scale(0.95);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
      `}</style>
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
