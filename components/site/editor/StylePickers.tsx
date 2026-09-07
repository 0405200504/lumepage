'use client';

/**
 * ============================================================================
 * Escolha de PALETA e de DUPLA DE FONTES
 * ============================================================================
 * Duas decisões que costumam travar quem não é designer, resolvidas do mesmo
 * jeito: em vez de pedir hexadecimal e nome de família, mostramos opções
 * prontas, com nome, amostra real e uma linha dizendo para quem funciona.
 *
 * O seletor manual de cor não sumiu — ele foi para "ajuste fino", em ThemePanel.
 */

import React from 'react';
import { Check } from 'lucide-react';
import type { SiteTheme } from '@/types/site';
import { palettesByGroup, matchPalette, type SitePalette } from '@/lib/site/palettes';
import { SITE_FONT_PAIRS, getFontPair, FONT_SAMPLE_HREF, type SiteFontPair } from '@/lib/site/fonts';

/**
 * As fontes do catálogo dentro do editor. Fica aqui (e não no layout) para o
 * app só pagar esse download quando a profissional abre a aba de fontes.
 */
export function FontSampleStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={FONT_SAMPLE_HREF} />
    </>
  );
}

// ── Paletas ─────────────────────────────────────────────────────────────────

function PaletteCard({ palette, active, onSelect }: {
  palette: SitePalette; active: boolean; onSelect: () => void;
}) {
  const c = palette.colors;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`text-left rounded-2xl border overflow-hidden transition-ui cursor-pointer ${
        active ? 'border-wine-700 ring-2 ring-wine-700/15 shadow-sm' : 'border-n-200 hover:border-n-300'
      }`}
    >
      {/* Amostra: fundo real, com o texto e o botão por cima — é assim que a
          combinação vai aparecer na página, não como quatro quadradinhos. */}
      <div className="relative px-3 py-3" style={{ background: c.background }}>
        <div className="flex items-center gap-1.5">
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.primary }} />
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.secondary }} />
          <span className="flex-1" />
          <span
            className="text-[9px] font-bold px-2 py-1 rounded-full"
            style={{ background: c.primary, color: c.background }}
          >
            Agendar
          </span>
        </div>
        <p className="text-[11px] mt-2 font-semibold" style={{ color: c.foreground }}>
          Texto da página
        </p>
        {active && (
          <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-wine-700 text-white grid place-items-center">
            <Check className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="px-3 py-2 bg-white border-t border-n-100">
        <span className="text-[12px] font-bold text-heading block">{palette.name}</span>
        <span className="text-[10px] text-n-500 block leading-snug mt-0.5">{palette.bestFor}</span>
      </div>
    </button>
  );
}

export function PalettePicker({ theme, onSelect }: {
  theme: SiteTheme;
  onSelect: (colors: SitePalette['colors']) => void;
}) {
  const current = matchPalette(theme);
  return (
    <div className="space-y-5">
      {palettesByGroup().map(({ group, label, items }) => (
        <div key={group} className="space-y-2">
          <h5 className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-400">{label}</h5>
          <div className="grid grid-cols-2 gap-2.5">
            {items.map(p => (
              <PaletteCard
                key={p.id}
                palette={p}
                active={current?.id === p.id}
                onSelect={() => onSelect(p.colors)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Fontes ──────────────────────────────────────────────────────────────────

function FontCard({ pair, active, onSelect }: {
  pair: SiteFontPair; active: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`relative text-left rounded-2xl border bg-white p-3.5 transition-ui cursor-pointer ${
        active ? 'border-wine-700 ring-2 ring-wine-700/15 shadow-sm' : 'border-n-200 hover:border-n-300'
      }`}
    >
      <p
        className="text-heading"
        style={{
          fontFamily: pair.titleStack,
          fontWeight: pair.titleWeight,
          letterSpacing: pair.titleTracking,
          fontSize: 26,
          lineHeight: 1.1,
        }}
      >
        Beleza
      </p>
      <p
        className="text-n-600 mt-1"
        style={{ fontFamily: pair.bodyStack, fontSize: 11.5, lineHeight: 1.5 }}
      >
        Atendimento com hora marcada e resultado impecável.
      </p>
      <div className="mt-2.5 pt-2.5 border-t border-n-100">
        <span className="text-[12px] font-bold text-heading block">{pair.name}</span>
        <span className="text-[10px] text-n-500 block leading-snug mt-0.5">{pair.mood}</span>
        <span className="text-[9px] text-n-400 block mt-1">
          {pair.titleFamily} + {pair.bodyFamily}
        </span>
      </div>
      {active && (
        <span className="absolute top-2.5 right-2.5 h-5 w-5 rounded-full bg-wine-700 text-white grid place-items-center">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

export function FontPicker({ value, onSelect }: {
  value: string;
  onSelect: (fontPairId: string) => void;
}) {
  const current = getFontPair(value);
  return (
    <div className="space-y-2.5">
      <FontSampleStyles />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {SITE_FONT_PAIRS.map(pair => (
          <FontCard
            key={pair.id}
            pair={pair}
            active={current.id === pair.id}
            onSelect={() => onSelect(pair.id)}
          />
        ))}
      </div>
    </div>
  );
}
