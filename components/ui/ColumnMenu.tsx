'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Columns3, Check } from 'lucide-react';

/**
 * Menu de colunas das tabelas do admin.
 *
 * Existe porque a alternativa era o que acontecia antes: a última coluna ficava
 * cortada, com a barra de rolagem horizontal escondida, e a informação simplesmente
 * sumia sem aviso. Agora quem tem tela estreita esconde o que não usa.
 *
 * A escolha vive na URL (`?cols=`), igual a filtro e ordenação — a página do servidor
 * relê e monta a tabela já sem as colunas escondidas. Nada de estado paralelo no
 * cliente que a tabela do servidor não enxerga.
 */
export function ColumnMenu({ columns, hidden }: {
  columns: { key: string; label: string; locked?: boolean }[];
  hidden: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const toggle = (key: string) => {
    const next = hidden.includes(key) ? hidden.filter(k => k !== key) : [...hidden, key];
    const params = new URLSearchParams(searchParams.toString());
    if (next.length) params.set('cols', next.join(','));
    else params.delete('cols');
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const hiddenCount = hidden.length;

  return (
    <div className="relative" ref={box}>
      <button
        type="button" onClick={() => setOpen(v => !v)} aria-haspopup="menu" aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-2 transition-colors"
      >
        <Columns3 className="h-3.5 w-3.5" aria-hidden />
        Colunas{hiddenCount > 0 && <span className="text-muted tabular-nums">({hiddenCount} oculta{hiddenCount > 1 ? 's' : ''})</span>}
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-40 w-56 card p-1 shadow-md max-h-80 overflow-y-auto">
          {columns.map(c => {
            const on = !hidden.includes(c.key);
            return (
              <button
                key={c.key} type="button" role="menuitemcheckbox" aria-checked={on}
                disabled={c.locked} onClick={() => toggle(c.key)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left hover:bg-surface-2 transition-colors disabled:opacity-40"
              >
                <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0 ${on ? 'bg-forest border-forest text-white' : 'border-line'}`}>
                  {on && <Check className="h-2.5 w-2.5" aria-hidden />}
                </span>
                <span className={on ? 'text-ink font-semibold' : 'text-muted'}>{c.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ColumnMenu;
