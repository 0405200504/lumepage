'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * SELEÇÃO MÚLTIPLA + AÇÕES EM MASSA
 * ---------------------------------
 * O provider é client, mas a tabela dentro dele continua sendo renderizada no
 * servidor (passa como `children`). Só as caixas de seleção e a barra flutuante
 * rodam no cliente.
 *
 * Uso:
 *   <TableSelectionProvider pageIds={rows.map(r => r.id)}>
 *     <ServerTable columns={[{ key: 'sel', cell: r => <RowCheckbox id={r.id} /> }, …]} … />
 *     <BulkActionsBar actions={[{ label: 'Pausar', onRun: ids => pausarAction(ids) }]} />
 *   </TableSelectionProvider>
 */

interface SelectionCtx {
  selected: Set<string>;
  pageIds: string[];
  toggle: (id: string) => void;
  toggleAll: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
}

const Ctx = createContext<SelectionCtx | null>(null);

function useSelection(): SelectionCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('Use os componentes de seleção dentro de <TableSelectionProvider>.');
  return ctx;
}

export function TableSelectionProvider({ pageIds, children }: { pageIds: string[]; children: React.ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected(prev => {
      const allOnPage = pageIds.every(id => prev.has(id));
      const next = new Set(prev);
      for (const id of pageIds) { if (allOnPage) next.delete(id); else next.add(id); }
      return next;
    });
  }, [pageIds]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo<SelectionCtx>(() => ({
    selected, pageIds, toggle, toggleAll, clear,
    isSelected: (id: string) => selected.has(id),
  }), [selected, pageIds, toggle, toggleAll, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const boxClass = 'h-4 w-4 rounded border-n-300 text-wine-700 accent-[color:var(--color-wine-700)] cursor-pointer';

/** Caixa de uma linha. Usar dentro do `cell` de uma coluna. */
export function RowCheckbox({ id, label }: { id: string; label?: string }) {
  const { isSelected, toggle } = useSelection();
  return (
    <input
      type="checkbox"
      checked={isSelected(id)}
      onChange={() => toggle(id)}
      onClick={e => e.stopPropagation()}
      aria-label={label ?? 'Selecionar linha'}
      className={boxClass}
    />
  );
}

/** Caixa do cabeçalho: marca/desmarca tudo o que está na página atual. */
export function SelectAllCheckbox() {
  const { pageIds, selected, toggleAll } = useSelection();
  const all = pageIds.length > 0 && pageIds.every(id => selected.has(id));
  const some = !all && pageIds.some(id => selected.has(id));
  return (
    <input
      type="checkbox"
      checked={all}
      ref={el => { if (el) el.indeterminate = some; }}
      onChange={toggleAll}
      aria-label="Selecionar todas as linhas desta página"
      className={boxClass}
    />
  );
}

export interface BulkAction {
  label: string;
  icon?: React.ReactNode;
  /** Estilo destrutivo (vermelho) + confirmação. */
  destructive?: boolean;
  /** Texto da confirmação. Se ausente e destructive, usa um padrão. */
  confirm?: string;
  onRun: (ids: string[]) => Promise<{ success: boolean; error?: string } | void>;
}

/** Barra flutuante que aparece quando há linhas selecionadas. */
export function BulkActionsBar({ actions, noun = 'registro' }: { actions: BulkAction[]; noun?: string }) {
  const { selected, clear } = useSelection();
  const [running, setRunning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const count = selected.size;

  if (count === 0) return null;

  const run = async (action: BulkAction) => {
    const question = action.confirm
      ?? (action.destructive ? `Confirmar "${action.label}" em ${count} ${noun}(s)? Esta ação não se desfaz sozinha.` : null);
    if (question && !window.confirm(question)) return;

    setError(null);
    setRunning(action.label);
    try {
      const res = await action.onRun([...selected]);
      if (res && res.success === false) setError(res.error ?? 'Não foi possível concluir.');
      else clear();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível concluir.');
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="no-print fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="flex flex-col gap-1.5">
        {error && (
          <p className="text-caption font-bold text-white bg-danger rounded-lg px-3 py-1.5 shadow-md">{error}</p>
        )}
        <div className="flex items-center gap-2 rounded-2xl bg-surface border border-line shadow-lg px-3 py-2.5">
          <span className="text-caption font-bold text-ink num px-1">
            {count} {noun}{count > 1 ? 's' : ''} selecionado{count > 1 ? 's' : ''}
          </span>
          <span className="h-5 w-px bg-line" aria-hidden />
          {actions.map(action => (
            <button
              key={action.label}
              type="button"
              disabled={running !== null}
              onClick={() => run(action)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-xl text-caption font-bold transition-colors disabled:opacity-50 ${
                action.destructive
                  ? 'text-danger hover:bg-danger-bg'
                  : 'text-ink hover:bg-surface-2'
              }`}
            >
              {running === action.label ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
              {action.label}
            </button>
          ))}
          <button
            type="button" onClick={clear} aria-label="Limpar seleção"
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
