'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { bulkExtendTrialAction } from '@/app/actions/admin-professionals';
import { button } from './ui';

/** Estende o acesso da conta em 7, 30 ou 90 dias — um clique, sem formulário. */
export function ExtendAccessButton({ id, brandName, variant = 'secondary' }: { id: string; brandName: string; variant?: 'secondary' | 'soft' }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const extend = (days: number) => {
    setOpen(false);
    start(async () => {
      const res = await bulkExtendTrialAction([id], days);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      success('Acesso estendido', `${brandName} ganhou mais ${days} dias.`);
      router.refresh();
    });
  };

  return (
    <div className="relative inline-block" ref={box}>
      <button type="button" disabled={pending} onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open} className={button(variant, 'md')}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarPlus className="h-4 w-4" />} Estender acesso
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1.5 z-40 w-44 card p-1.5 shadow-[var(--shadow-md)]">
          {[7, 30, 90].map(d => (
            <button key={d} type="button" role="menuitem" onClick={() => extend(d)}
              className="w-full text-left px-3 py-2 rounded-chip text-body-sm font-medium text-heading hover:bg-surface-2 transition-ui">
              + {d} dias
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExtendAccessButton;
