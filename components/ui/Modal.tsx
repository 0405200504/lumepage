'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { MonoLabel } from './Mono';

/**
 * Modal / bottom-sheet do produto.
 *
 * É a ÚNICA coisa, junto do dropdown e do toast, que ainda ganha sombra:
 * `--sh-lg` sobrevive exatamente para o que flutua de verdade. Card em
 * repouso é plano; overlay não.
 *
 * No mobile ele vira folha vinda de baixo (o padrão que o produto já usava)
 * e no desktop, caixa centrada de raio `hero` (14px). O rodapé de ações é
 * fixo e a área do meio rola — formulário longo (a anamnese, o serviço com
 * descrição) não pode empurrar o botão "Salvar" para fora da tela.
 */
export const Modal: React.FC<{
  open: boolean;
  onClose: () => void;
  title: string;
  /** Trilha mono acima do título, igual à do header de página. */
  trail?: (string | number | null | undefined)[];
  /** Rodapé fixo — os botões de ação. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  /** Trava o fechamento enquanto salva. */
  busy?: boolean;
  className?: string;
}> = ({ open, onClose, title, trail, footer, children, busy, className = '' }) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc fecha; o foco entra no painel ao abrir. Sem isso o teclado fica
  // preso na página de trás e o leitor de tela nunca chega ao formulário.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    // Trava a rolagem do fundo enquanto o modal está aberto.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 sheet-backdrop"
        onClick={() => !busy && onClose()}
        aria-hidden
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 w-full sm:max-w-lg bg-surface
          shadow-[var(--shadow-lg)] flex flex-col max-h-[92vh] sm:max-h-[85vh] outline-none
          rounded-t-hero sm:rounded-hero animate-slide-up ${className}`}
      >
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4 shrink-0">
          <div className="min-w-0">
            {trail && trail.length > 0 && (
              <MonoLabel as="p" className="mb-1">
                {trail.filter(Boolean).join(' · ')}
              </MonoLabel>
            )}
            <h2 className="text-h2 text-heading truncate">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Fechar"
            className="icon-chip shrink-0 -mt-1 -mr-1 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto scroll-touch px-5 sm:px-6 pb-6 pt-1">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-line px-5 sm:px-6 py-4 flex items-center justify-end gap-2 safe-sheet sm:pb-4">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
};

export default Modal;
