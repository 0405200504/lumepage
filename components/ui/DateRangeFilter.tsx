'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarRange, Loader2 } from 'lucide-react';
import { RANGE_PRESETS, RangeKey, buildHref } from '@/lib/query-params';

interface Props {
  basePath: string;
  /** Presets a exibir (padrão: todos). */
  presets?: RangeKey[];
  /** Esconde o campo de intervalo personalizado. */
  hideCustom?: boolean;
  className?: string;
}

/**
 * Seletor de período global das telas do admin.
 * Escreve `range` (ou `from`/`to`) na URL — nenhuma tela do painel tinha recorte de
 * período antes, então todo número era "desde sempre" sem dizer isso em lugar nenhum.
 */
export function DateRangeFilter({ basePath, presets, hideCustom, className = '' }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentRange = (searchParams.get('range') as RangeKey)
    ?? (searchParams.get('from') || searchParams.get('to') ? 'custom' : 'all');
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');
  const [showCustom, setShowCustom] = useState(currentRange === 'custom');

  const go = (href: string) => startTransition(() => router.push(href, { scroll: false }));

  const applyPreset = (key: RangeKey) => {
    setShowCustom(false);
    go(buildHref(basePath, searchParams, { range: key === 'all' ? null : key, from: null, to: null }));
  };

  const applyCustom = () => {
    if (!from && !to) return;
    go(buildHref(basePath, searchParams, { range: 'custom', from: from || null, to: to || null }));
  };

  const visible = RANGE_PRESETS.filter(p => !presets || presets.includes(p.key));

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <CalendarRange className="h-4 w-4 text-muted shrink-0" aria-hidden />

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Período">
        {visible.map(preset => {
          const active = currentRange === preset.key && !showCustom;
          return (
            <button
              key={preset.key}
              type="button"
              onClick={() => applyPreset(preset.key)}
              aria-pressed={active}
              className={`px-2.5 py-1.5 rounded-lg text-caption font-bold transition-colors ${
                active ? 'bg-accent-soft text-accent-link ring-1 ring-accent-soft-border' : 'text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              {preset.label}
            </button>
          );
        })}

        {!hideCustom && (
          <button
            type="button"
            onClick={() => setShowCustom(v => !v)}
            aria-pressed={showCustom || currentRange === 'custom'}
            className={`px-2.5 py-1.5 rounded-lg text-caption font-bold transition-colors ${
              showCustom || currentRange === 'custom'
                ? 'bg-accent-soft text-accent-link ring-1 ring-accent-soft-border'
                : 'text-muted hover:text-ink hover:bg-surface-2'
            }`}
          >
            Personalizado
          </button>
        )}
      </div>

      {showCustom && !hideCustom && (
        <div className="flex items-center gap-1.5">
          <input
            type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Data inicial"
            className="h-8 px-2 rounded-lg border border-line bg-surface text-caption text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
          />
          <span className="text-muted text-caption">até</span>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Data final"
            className="h-8 px-2 rounded-lg border border-line bg-surface text-caption text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
          />
          <button
            type="button" onClick={applyCustom}
            className="h-8 px-3 rounded-lg bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold transition-colors"
          >
            Aplicar
          </button>
        </div>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-muted" aria-hidden />}
    </div>
  );
}

export default DateRangeFilter;
