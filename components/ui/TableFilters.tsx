'use client';

import React, { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X, Loader2 } from 'lucide-react';
import { buildHref } from '@/lib/query-params';

/**
 * Controles de filtro das listas do admin. Todos escrevem na URL (nunca em estado
 * local), para que o servidor faça o recorte e o CSV exporte exatamente o que se vê.
 */

interface SearchInputProps {
  basePath: string;
  placeholder?: string;
  /** ms de espera antes de navegar (padrão 350). */
  delay?: number;
  className?: string;
}

/** Busca com debounce → grava `q` na URL. */
export function SearchInput({ basePath, placeholder = 'Buscar…', delay = 350, className = '' }: SearchInputProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const urlValue = searchParams.get('q') ?? '';
  const [value, setValue] = useState(urlValue);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // A URL pode mudar por fora (voltar, limpar filtros): reflete no campo.
  useEffect(() => {
    if (!dirty.current) setValue(urlValue);
  }, [urlValue]);

  const push = (next: string) => {
    dirty.current = false;
    startTransition(() => router.push(buildHref(basePath, searchParams, { q: next || null }), { scroll: false }));
  };

  const onChange = (next: string) => {
    dirty.current = true;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), delay);
  };

  return (
    <div className={`relative ${className}`}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" aria-hidden />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { if (timer.current) clearTimeout(timer.current); push(value); }
          if (e.key === 'Escape') { setValue(''); push(''); }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-9 pl-9 pr-8 rounded-xl border border-line bg-surface text-sm text-ink placeholder-faint focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-500"
      />
      {pending
        ? <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted" aria-hidden />
        : value && (
          <button
            type="button" onClick={() => { setValue(''); push(''); }} aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted hover:text-ink hover:bg-surface-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
    </div>
  );
}

interface FilterSelectProps {
  basePath: string;
  /** Nome do parâmetro na URL. */
  name: string;
  label: string;
  options: { value: string; label: string }[];
  /** Rótulo da opção "sem filtro" (valor 'all'). */
  allLabel?: string;
  className?: string;
}

/** Select simples → grava `name` na URL ('all' remove o parâmetro). */
export function FilterSelect({ basePath, name, label, options, allLabel = 'Todos', className = '' }: FilterSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const value = searchParams.get(name) ?? 'all';

  return (
    <select
      value={value}
      aria-label={label}
      onChange={e => {
        const next = e.target.value;
        startTransition(() => router.push(buildHref(basePath, searchParams, { [name]: next === 'all' ? null : next }), { scroll: false }));
      }}
      className={`h-9 px-3 rounded-xl border border-line bg-surface text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15 ${className}`}
    >
      <option value="all">{allLabel}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** Aparece quando há qualquer filtro ativo; devolve a lista ao estado limpo. */
export function ClearFilters({ basePath, keys }: { basePath: string; keys: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = keys.filter(k => searchParams.get(k));
  if (active.length === 0) return null;

  const patch: Record<string, null> = {};
  for (const k of [...keys, 'page']) patch[k] = null;

  return (
    <button
      type="button"
      onClick={() => router.push(buildHref(basePath, searchParams, patch), { scroll: false })}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold text-muted hover:text-ink hover:bg-surface-2 transition-colors"
    >
      <X className="h-3.5 w-3.5" />
      Limpar filtros ({active.length})
    </button>
  );
}
