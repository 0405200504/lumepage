'use client';

/**
 * ============================================================================
 * Seletor de MODELOS PRONTOS
 * ============================================================================
 * A profissional escolhe uma página inteira já decidida (layout + cores +
 * fontes + cantos), não três ingredientes soltos. Depois ela pode trocar
 * qualquer um deles em "Cores e fontes" — mas nunca é obrigada a começar por aí.
 *
 * A miniatura é DESENHADA com as cores e a fonte reais do look — não é um PNG.
 * Continua valendo a regra que fez o catálogo escalar: publicar um modelo novo
 * é uma entrada em `lib/site/looks.ts`, sem produzir, versionar nem hospedar
 * imagem nenhuma.
 *
 * Trocar de modelo NÃO apaga nada: o conteúdo mora no SiteConfig.
 */

import React, { useMemo, useState } from 'react';
import { Check, Search } from 'lucide-react';
import type { SiteTheme } from '@/types/site';
import {
  resolvedLooks, matchLook, lookSwatch, LOOK_VIBE_LABEL,
  type ResolvedLook, type LookVibe,
} from '@/lib/site/looks';

// ── Miniatura ───────────────────────────────────────────────────────────────

const RADIUS_PX: Record<SiteTheme['radius'], number> = { sharp: 2, soft: 8, round: 14 };

function LookThumb({ resolved }: { resolved: ResolvedLook }) {
  const { theme, font, template } = resolved;
  const { surface, line } = lookSwatch(theme);
  const r = RADIUS_PX[theme.radius];
  const layout = template.preview.layout;

  const title = (size: number, extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: font.titleStack,
    fontWeight: font.titleWeight,
    letterSpacing: font.titleTracking,
    color: theme.foreground,
    fontSize: size,
    lineHeight: 1.05,
    ...extra,
  });
  const textBar = (w: string | number, o = 0.22) => ({
    display: 'block', height: 3, width: w, borderRadius: 2,
    background: theme.foreground, opacity: o,
  } as React.CSSProperties);
  const pill = (w: number, h = 11): React.CSSProperties => ({
    display: 'block', width: w, height: h,
    borderRadius: theme.radius === 'sharp' ? 2 : 999,
    background: theme.primary,
  });

  return (
    <div
      className="relative h-[152px] w-full overflow-hidden"
      style={{ background: theme.background }}
      aria-hidden="true"
    >
      {/* topo */}
      <div
        className="flex items-center justify-between px-3"
        style={{ height: 22, borderBottom: `1px solid ${line}` }}
      >
        <span style={title(9, { letterSpacing: '.08em', opacity: 0.9 })}>ESTÚDIO</span>
        <span style={pill(20, 7)} />
      </div>

      {layout === 'split' && (
        <div className="flex gap-2 px-3 pt-3">
          <div className="flex-1 space-y-1.5">
            <span style={{ ...textBar(22), background: theme.secondary, opacity: 1 }} />
            <span style={title(19)}>Aa</span>
            <span style={textBar('86%')} />
            <span style={textBar('64%')} />
            <span className="block pt-1.5" style={pill(46)} />
          </div>
          <div style={{ width: 54, height: 84, background: surface, borderRadius: r, border: `1px solid ${line}` }} />
        </div>
      )}

      {layout === 'centered' && (
        <div className="px-6 pt-5 text-center">
          <span className="mx-auto" style={{ ...textBar(20), background: theme.secondary, opacity: 1, margin: '0 auto' }} />
          <span className="block mt-2.5" style={title(24)}>Aa</span>
          <span className="mt-2.5" style={{ ...textBar('72%'), margin: '10px auto 0' }} />
          <span style={{ ...textBar('54%'), margin: '5px auto 0' }} />
          <span style={{ ...pill(58, 12), margin: '12px auto 0' }} />
        </div>
      )}

      {layout === 'editorial' && (
        <div className="px-3 pt-2.5">
          <span style={{ ...textBar(16), background: theme.secondary, opacity: 1 }} />
          <span className="block mt-1.5" style={title(34, { letterSpacing: '-.02em' })}>Aa</span>
          <div className="flex gap-1.5 mt-2.5">
            <div style={{ flex: 1, height: 44, background: surface, borderRadius: r }} />
            <div style={{ flex: 1, height: 44, background: theme.secondary, opacity: 0.5, borderRadius: r }} />
            <div style={{ flex: 1, height: 44, background: surface, borderRadius: r }} />
          </div>
          <span className="block mt-2" style={pill(40, 9)} />
        </div>
      )}

      {layout === 'cards' && (
        <div className="px-3 pt-3">
          <span style={title(15)}>Aa</span>
          <span className="block mt-1.5" style={textBar('60%')} />
          <div className="grid grid-cols-3 gap-1.5 mt-2.5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 46, background: surface, borderRadius: r, border: `1px solid ${line}`, padding: 5 }}>
                <span className="block" style={{ height: 10, width: 10, borderRadius: 999, background: theme.primary }} />
                <span className="block mt-1.5" style={textBar('80%')} />
                <span className="block mt-1" style={textBar('55%')} />
              </div>
            ))}
          </div>
          <span className="block mt-2" style={{ ...pill(48, 10), margin: '8px auto 0' }} />
        </div>
      )}

      {layout === 'stacked' && (
        <div className="px-3 pt-3 text-center">
          <span className="block" style={title(20)}>Aa</span>
          <span style={{ ...textBar('64%'), margin: '7px auto 0' }} />
          <div className="mt-2.5 space-y-1.5 text-left">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className="flex items-center justify-between px-2"
                style={{ background: surface, borderRadius: r, height: 20, border: `1px solid ${line}` }}
              >
                <span style={textBar(38, 0.35)} />
                <span style={{ ...textBar(14), background: theme.primary, opacity: 1 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Grade ───────────────────────────────────────────────────────────────────

const VIBES: LookVibe[] = ['elegante', 'clean', 'acolhedor', 'doce', 'ousado', 'escuro'];

export function LookPicker({
  templateId, theme, onSelect, priorityIds, compact,
}: {
  templateId: string;
  theme: SiteTheme;
  /** Aplica o modelo inteiro: layout + cores + fontes + cantos. */
  onSelect: (resolved: ResolvedLook) => void;
  /** Ids que sobem para o topo (ex.: os do nicho escolhido no assistente). */
  priorityIds?: string[];
  compact?: boolean;
}) {
  const [vibe, setVibe] = useState<LookVibe | 'all'>('all');
  const current = matchLook(templateId, theme);

  const list = useMemo(() => {
    const all = resolvedLooks();
    const filtered = vibe === 'all' ? all : all.filter(r => r.look.vibe === vibe);
    if (!priorityIds?.length) return filtered;
    const score = (r: ResolvedLook) => (priorityIds.includes(r.look.id) ? 0 : 1);
    return [...filtered].sort((a, b) => score(a) - score(b));
  }, [vibe, priorityIds]);

  return (
    <div className="space-y-3">
      {/* Filtro por clima — a profissional pensa em sensação, não em categoria */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-n-400 pr-1">
          <Search className="h-3 w-3" /> Estilo
        </span>
        {(['all', ...VIBES] as const).map(v => {
          const active = vibe === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setVibe(v)}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full border transition-colors cursor-pointer ${
                active
                  ? 'border-wine-700 bg-accent-soft text-wine-700'
                  : 'border-n-200 bg-white text-n-600 hover:border-n-300'
              }`}
            >
              {v === 'all' ? 'Todos' : LOOK_VIBE_LABEL[v]}
            </button>
          );
        })}
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {list.map(resolved => {
          const { look, palette, font } = resolved;
          const active = current?.id === look.id;
          const recommended = priorityIds?.includes(look.id);
          return (
            <button
              key={look.id}
              type="button"
              onClick={() => onSelect(resolved)}
              aria-pressed={active}
              className={`text-left rounded-2xl border bg-white overflow-hidden transition-ui cursor-pointer ${
                active
                  ? 'border-wine-700 ring-2 ring-wine-700/15 shadow-md'
                  : 'border-n-200 hover:border-n-300 hover:shadow-soft'
              }`}
            >
              <div className="relative">
                <LookThumb resolved={resolved} />
                {recommended && !active && (
                  <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider bg-white/95 text-wine-800 border border-wine-200 px-2 py-0.5 rounded-full">
                    ✨ Indicado para você
                  </span>
                )}
                {active && (
                  <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-wine-700 text-white grid place-items-center shadow-md">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>

              <div className="p-3.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-heading">{look.name}</h4>
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-n-600 bg-n-100 border border-n-200 px-2 py-0.5 rounded-full">
                    {LOOK_VIBE_LABEL[look.vibe]}
                  </span>
                </div>
                <p className="text-[11px] text-n-600 mt-1.5 leading-relaxed">{look.tagline}</p>

                {/* O que exatamente vem junto — sem isso "modelo" é palavra vaga */}
                <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-n-100">
                  <div className="flex items-center gap-1">
                    {[palette.colors.primary, palette.colors.secondary, palette.colors.background].map(c => (
                      <span
                        key={c}
                        className="h-3.5 w-3.5 rounded-full border border-black/10"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-n-400 truncate">
                    {palette.name} · {font.titleFamily}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {list.length === 0 && (
        <p className="text-[12px] text-n-500 text-center py-6">
          Nenhum modelo com esse estilo. Escolha outro filtro.
        </p>
      )}
    </div>
  );
}

export default LookPicker;
