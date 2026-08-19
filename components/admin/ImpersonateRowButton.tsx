'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { LogIn, Eye, Pencil, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { impersonateAction, SupportMode } from '@/app/actions/admin-professionals';

/**
 * "Entrar como" direto na linha da tabela — sem abrir o detalhe primeiro.
 *
 * Abre em NOVA ABA de propósito: o admin continua na lista, na mesma rolagem e com
 * os mesmos filtros. E pede o modo antes de entrar: leitura é o padrão, editar é
 * escolha consciente.
 */
export function ImpersonateRowButton({ id, brandName }: { id: string; brandName: string }) {
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  // O corpo da tabela rola (overflow + max-height), o que recortaria um menu
  // absoluto. Por isso o menu é `fixed` e recebe a posição do botão na abertura.
  const [anchor, setAnchor] = useState<{ top: number; right: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const enter = (mode: SupportMode) => {
    setOpen(false);
    start(async () => {
      const res = await impersonateAction(id, mode);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      window.open(res.url ?? '/dashboard', '_blank', 'noopener');
      success('Sessão de suporte aberta', `${brandName} · ${mode === 'read' ? 'somente leitura' : 'pode editar'} · 30 min`);
    });
  };

  return (
    <div className="relative inline-block" ref={box}>
      <button
        type="button" disabled={pending}
        onClick={e => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          setAnchor({ top: r.bottom + 4, right: window.innerWidth - r.right });
          setOpen(v => !v);
        }}
        aria-haspopup="menu" aria-expanded={open}
        title={`Abrir o painel de ${brandName} numa aba nova`}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-xl border border-line bg-surface text-[11px] font-bold text-ink hover:bg-surface-2 transition-colors disabled:opacity-50"
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <LogIn className="h-3.5 w-3.5" aria-hidden />}
        Entrar
      </button>

      {open && (
        <div
          role="menu"
          style={{ top: anchor?.top, right: anchor?.right }}
          className="fixed z-[60] w-56 card p-1 shadow-md"
        >
          <button type="button" role="menuitem" onClick={() => enter('read')}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors">
            <span className="flex items-center gap-2 text-xs font-bold text-ink"><Eye className="h-3.5 w-3.5 text-muted" aria-hidden /> Só olhar</span>
            <span className="block text-[10px] text-muted mt-0.5">Nenhuma alteração passa.</span>
          </button>
          <button type="button" role="menuitem"
            onClick={() => { if (confirm(`Entrar na conta de ${brandName} PODENDO EDITAR? Toda alteração fica registrada no seu nome.`)) enter('edit'); }}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-surface-2 transition-colors">
            <span className="flex items-center gap-2 text-xs font-bold text-ink"><Pencil className="h-3.5 w-3.5 text-muted" aria-hidden /> Pode editar</span>
            <span className="block text-[10px] text-muted mt-0.5">Cada mutação vai para a auditoria.</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ImpersonateRowButton;
