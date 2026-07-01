'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';

export interface QuickAddAction {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
}

interface QuickAddFabProps {
  /** Ações de "criar" do módulo. 1 ação = clique direto; 2+ = menu expansível. */
  actions: QuickAddAction[];
  /** Rótulo acessível do botão principal. */
  label?: string;
}

/**
 * Botão flutuante padrão de "adicionar" (+), presente em todos os módulos.
 * Fica fixo no canto inferior direito, LOGO ACIMA do botão do chat da Lume
 * (mesmos offsets do AIAgentChat: o chat usa bottom 5.5rem/mobile e 1.5rem/desktop,
 * então este fica em 9.5rem/mobile e 6rem/desktop). z-40 mantém o chat (z-50) acessível.
 */
export const QuickAddFab: React.FC<QuickAddFabProps> = ({ actions, label = 'Adicionar' }) => {
  const [open, setOpen] = useState(false);
  if (!actions.length) return null;
  const single = actions.length === 1;

  return (
    <div className="fixed right-4 bottom-[calc(9.5rem+env(safe-area-inset-bottom))] lg:right-6 lg:bottom-24 z-40 flex flex-col items-end gap-2.5 no-print">
      {!single && open && actions.map(({ label: l, icon: Icon, onClick }) => (
        <button key={l} onClick={() => { setOpen(false); onClick(); }} className="flex items-center gap-2.5 animate-slide-up">
          <span className="px-3 py-1.5 rounded-xl bg-ink text-white text-xs font-bold shadow-md whitespace-nowrap">{l}</span>
          <span className="h-11 w-11 rounded-full bg-paper border border-gray-150 text-wine-700 shadow-md flex items-center justify-center shrink-0"><Icon className="h-[18px] w-[18px]" /></span>
        </button>
      ))}
      <button
        onClick={() => single ? actions[0].onClick() : setOpen(o => !o)}
        className="tap h-14 w-14 rounded-full surface-wine text-white shadow-glow flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={single ? actions[0].label : label}
        aria-expanded={single ? undefined : open}
      >
        <Plus className={`h-6 w-6 transition-transform ${!single && open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  );
};

export default QuickAddFab;
