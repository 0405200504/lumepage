'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { RANGE_PRESETS, RangeKey, buildHref } from '@/lib/query-params';

interface Props {
  basePath: string;
  presets?: RangeKey[];
  hideCustom?: boolean;
  className?: string;
}

/**
 * Seletor de período das telas do admin, em segmented. Escreve `range` (ou
 * `from`/`to`) na URL. Por padrão mostra só os cortes do dia a dia; "Mais"
 * abre o intervalo personalizado.
 */
const DEFAULT_PRESETS: RangeKey[] = ['7d', '30d', 'month', '90d', 'year', 'all'];

export function DateRangeFilter({ basePath, presets = DEFAULT_PRESETS, hideCustom, className = '' }: Props) {
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

  const visible = RANGE_PRESETS.filter(p => presets.includes(p.key));
  const customOn = showCustom || currentRange === 'custom';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="segmented" role="group" aria-label="Período">
        {visible.map(preset => {
          const active = currentRange === preset.key && !showCustom;
          return (
            <button key={preset.key} type="button" onClick={() => applyPreset(preset.key)} aria-pressed={active} data-active={active ? 'true' : undefined}>
              {preset.label}
            </button>
          );
        })}
        {!hideCustom && (
          <button type="button" onClick={() => setShowCustom(v => !v)} aria-pressed={customOn} data-active={customOn ? 'true' : undefined}>
            Datas
          </button>
        )}
      </div>

      {customOn && !hideCustom && (
        <div className="flex items-center gap-1.5">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} aria-label="Data inicial" className="field-input h-9 w-auto text-caption" />
          <span className="text-n-500 text-caption">até</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} aria-label="Data final" className="field-input h-9 w-auto text-caption" />
          <button type="button" onClick={applyCustom} className="h-9 px-3.5 rounded-full bg-wine-700 hover:bg-wine-800 text-white text-caption font-semibold transition-ui">
            Aplicar
          </button>
        </div>
      )}

      {pending && <Loader2 className="h-4 w-4 animate-spin text-n-400" aria-hidden />}
    </div>
  );
}

export default DateRangeFilter;
