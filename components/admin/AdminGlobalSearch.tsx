'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2, Users, UserCircle, CalendarDays, CornerDownLeft } from 'lucide-react';
import { adminGlobalSearchAction, SearchHit } from '@/app/actions/admin-search';

/**
 * Busca global (⌘K / Ctrl+K): profissional, cliente ou agendamento, de qualquer tela.
 * Substitui o vaivém por menu lateral quando você já sabe o nome de quem procura.
 */

const KIND_META: Record<SearchHit['kind'], { icon: React.ElementType; label: string }> = {
  professional: { icon: Users, label: 'Profissional' },
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

  /** Fecha e zera — o próximo ⌘K abre limpo, não na busca anterior. */
  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHits([]);
    setCursor(0);
    seq.current++; // descarta resposta em voo
  }, []);

  // Atalho global
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => {
          if (v) close();
          return !v;
        });
      }
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const search = useCallback((q: string) => {
    if (q.trim().length < 2) { setHits([]); setLoading(false); return; }
    const id = ++seq.current;
    setLoading(true);
    adminGlobalSearchAction(q)
      .then(res => {
        if (id !== seq.current) return; // resposta atrasada de uma busca anterior
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-xl border border-line bg-surface text-caption text-muted hover:text-ink hover:border-n-300 transition-colors min-w-[200px]"
      >
        <Search className="h-4 w-4" aria-hidden />
        <span className="flex-1 text-left">Buscar na rede…</span>
        <kbd className="hidden sm:inline text-caption font-bold text-muted bg-surface-2 border border-line rounded px-1.5 py-0.5">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" role="dialog" aria-modal="true" aria-label="Busca global">
          <div className="absolute inset-0 bg-wine-950/45" onClick={close} />

          <div className="relative w-full max-w-xl card shadow-lg overflow-hidden animate-slide-up">
            <div className="flex items-center gap-2 px-4 border-b border-line">
              <Search className="h-4 w-4 text-muted shrink-0" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={e => onChange(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Profissional, cliente ou agendamento…"
                aria-label="Buscar na rede"
                className="flex-1 h-12 bg-transparent text-label text-ink placeholder-faint "
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />}
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-caption text-muted">Digite ao menos 2 caracteres.</p>
              ) : hits.length === 0 && !loading ? (
                <p className="px-4 py-8 text-center text-caption text-muted">Nada encontrado para “{query}”.</p>
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
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === cursor ? 'bg-accent-soft' : 'hover:bg-surface-2'}`}
                        >
                          <Icon className="h-4 w-4 text-muted shrink-0" aria-hidden />
                          <span className="min-w-0 flex-1">
                            <span className="block text-label font-semibold text-ink truncate">{hit.title}</span>
                            <span className="block text-caption text-muted truncate">{hit.subtitle}</span>
                          </span>
                          <span className="text-caption font-bold uppercase tracking-wide text-muted shrink-0">
                            {KIND_META[hit.kind].label}
                          </span>
                          {i === cursor && <CornerDownLeft className="h-3.5 w-3.5 text-muted shrink-0" aria-hidden />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminGlobalSearch;
