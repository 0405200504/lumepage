'use client';

import React, { useState } from 'react';
import { Sparkles, Check, ChevronDown } from 'lucide-react';
import { NICHE_LIST, type NicheId, type NichePreset } from '@/lib/site/presets';
import type { SiteConfig } from '@/types/site';

interface NicheCopyPickerProps {
  onApplyNicheTexts: (niche: NichePreset) => void;
}

export function NicheCopyPicker({ onApplyNicheTexts }: NicheCopyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [applied, setApplied] = useState<NicheId | null>(null);

  const handleApply = (niche: NichePreset) => {
    onApplyNicheTexts(niche);
    setApplied(niche.id);
    setIsOpen(false);
    setTimeout(() => setApplied(null), 3000);
  };

  return (
    <div className="rounded-2xl border border-accent-soft-border bg-accent-soft p-3.5 space-y-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-wine-100 text-wine-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="text-[12px] font-bold text-wine-900">
              Sugestões de Textos Prontos por Nicho
            </h4>
            <p className="text-[10px] text-n-600">
              Sem inspiração para escrever? Aplique textos profissionais de alta conversão.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white border border-n-200 text-n-700 hover:bg-n-50 transition-colors cursor-pointer shrink-0"
        >
          {isOpen ? 'Ocultar' : 'Escolher nicho'}
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {applied && (
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-success bg-white px-2.5 py-1.5 rounded-lg border border-success-border">
          <Check className="h-3.5 w-3.5" />
          Textos aplicados com sucesso! Revise e ajuste conforme preferir.
        </div>
      )}

      {isOpen && (
        <div className="pt-2 border-t border-accent-soft-border/60 grid grid-cols-1 sm:grid-cols-2 gap-2 animate-in fade-in duration-200">
          {NICHE_LIST.map((niche) => (
            <button
              key={niche.id}
              type="button"
              onClick={() => handleApply(niche)}
              className="text-left p-2.5 rounded-xl bg-white border border-n-200 hover:border-wine-700 hover:bg-wine-50/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-heading group-hover:text-wine-800">
                  {niche.name}
                </span>
                <span className="text-[9px] font-semibold text-n-500">
                  {niche.badge}
                </span>
              </div>
              <p className="text-[10px] text-n-500 mt-1 line-clamp-1">
                {niche.content.hero.headline}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
