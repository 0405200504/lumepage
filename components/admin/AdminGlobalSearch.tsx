'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Users, UserCircle, CalendarDays, CornerDownLeft } from 'lucide-react';
import { adminGlobalSearchAction, SearchHit } from '@/app/actions/admin-search';
import { OPEN_ADMIN_SEARCH_EVENT } from './AdminSidebar';

/**
 * Busca global (⌘K / Ctrl+K): profissional, cliente ou agendamento, de qualquer tela.
 * Não tem botão próprio — abre pelo atalho ou pelo evento disparado pela barra
 * lateral e pelo cabeçalho no celular.
 */

const KIND_META: Record<SearchHit['kind'], { icon: React.ElementType; label: string }> = {
  professional: { icon: Users, label: 'Conta' },
  client: { icon: UserCircle, label: 'Cliente' },
  appointment: { icon: CalendarDays, label: 'Agendamento' },
};

export function AdminGlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHits([]);
    setCursor(0);
    seq.current++;
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => { if (v) close(); return !v; });
      }
      if (e.key === 'Escape') close();
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_ADMIN_SEARCH_EVENT, onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_ADMIN_SEARCH_EVENT, onOpen);
    };
  }, [close]);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) { setHits([]); setLoading(false); return; }
    const id = ++seq.current;
    setLoading(true);
    adminGlobalSearchAction(q)
      .then(res => {
        if (id !== seq.current) return;
        setHits(res.hits ?? []);
        setCursor(0);
      })
      .finally(() => { if (id === seq.current) setLoading(false); });
  }, []);

  const onChange = (value: string) => {
    setQuery(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(value), 250);
  };

  const go = (hit: SearchHit) => { close(); router.push(hit.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, hits.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Enter' && hits[cursor]) { e.preventDefault(); go(hits[cursor]); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Busca global">
      <div className="absolute inset-0 sheet-backdrop" onClick={close} />

      <div className="relative w-full max-w-xl card shadow-[var(--shadow-lg)] overflow-hidden animate-slide-up rounded-hero">
        <div className="flex items-center gap-3 px-5 border-b border-line">
          <Search className="h-4 w-4 text-n-400 shrink-0" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={e => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Conta, cliente ou agendamento…"
            aria-label="Buscar na rede"
            className="flex-1 h-14 bg-transparent text-body text-heading placeholder:text-n-400 focus:outline-none"
          />
          {loading
            ? <Loader2 className="h-4 w-4 animate-spin text-n-400" aria-hidden />
            : <kbd className="hidden sm:inline text-micro font-bold text-n-500 bg-surface-2 rounded px-1.5 py-0.5">esc</kbd>}
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-1.5">
          {query.trim().length < 2 ? (
            <p className="px-4 py-8 text-center text-caption text-n-500">Digite ao menos 2 caracteres.</p>
          ) : hits.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-caption text-n-500">Nada encontrado para “{query}”.</p>
          ) : (
            <ul>
              {hits.map((hit, i) => {
                const Icon = KIND_META[hit.kind].icon;
                return (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => go(hit)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-chip text-left transition-ui ${i === cursor ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
                    >
                      <span className="icon-chip h-8 w-8"><Icon className="h-4 w-4" aria-hidden /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-body-sm font-semibold text-heading truncate">{hit.title}</span>
                        <span className="block text-caption text-n-500 truncate">{hit.subtitle}</span>
                      </span>
                      <span className="text-micro font-bold uppercase tracking-wide text-n-400 shrink-0">{KIND_META[hit.kind].label}</span>
                      {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-n-400 shrink-0" aria-hidden />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminGlobalSearch;
