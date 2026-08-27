'use client';

/**
 * ============================================================================
 * Seletor de modelo
 * ============================================================================
 * A miniatura de cada template é DESENHADA com as cores e a fonte do próprio
 * template — não é um PNG. Isso importa para escalar: publicar o Template 07
 * não exige produzir, versionar e hospedar uma imagem; basta registrar o
 * metadado `preview` e o card aparece pronto.
 *
 * Trocar de modelo aqui NÃO apaga nada: o conteúdo mora no SiteConfig, o
 * template só o desenha de outro jeito.
 */

import React from 'react';
import { Check } from 'lucide-react';
import { SITE_TEMPLATES, type SiteTemplateMeta } from '@/lib/site/templates';

function Thumb({ meta }: { meta: SiteTemplateMeta }) {
  const p = meta.preview;
  const bar = { background: p.accent, borderRadius: 2 };

  return (
    <div
      className="relative h-36 w-full overflow-hidden rounded-t-2xl"
      style={{ background: p.background }}
      aria-hidden="true"
    >
      {/* barra de topo */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${p.accent}22` }}>
        <span style={{ fontFamily: p.titleFont, fontSize: 9, letterSpacing: '.1em', color: p.text, opacity: .85 }}>
          ESTÚDIO
        </span>
        <span style={{ ...bar, width: 26, height: 7 }} />
      </div>

      {p.layout === 'split' && (
        <div className="flex gap-2 px-3 pt-3">
          <div className="flex-1 space-y-1.5">
            <span className="block" style={{ ...bar, width: '38%', height: 3, opacity: .6 }} />
            <span className="block" style={{ fontFamily: p.titleFont, fontSize: 16, lineHeight: 1.05, color: p.text }}>
              Aa
            </span>
            <span className="block" style={{ background: `${p.text}22`, height: 3, width: '80%', borderRadius: 2 }} />
            <span className="block" style={{ background: `${p.text}22`, height: 3, width: '62%', borderRadius: 2 }} />
            <span className="block mt-2" style={{ ...bar, width: 44, height: 10, borderRadius: 999 }} />
          </div>
          <div style={{ width: 52, height: 66, background: p.surface, borderRadius: 8, border: `1px solid ${p.accent}33` }} />
        </div>
      )}

      {p.layout === 'centered' && (
        <div className="px-5 pt-5 text-center">
          <span className="block mx-auto" style={{ ...bar, width: 22, height: 3, opacity: .7 }} />
          <span className="block mt-2" style={{ fontFamily: p.titleFont, fontSize: 20, color: p.text }}>Aa</span>
          <span className="block mx-auto mt-2" style={{ background: `${p.text}22`, height: 3, width: '70%', borderRadius: 2 }} />
          <span className="block mx-auto mt-1" style={{ background: `${p.text}22`, height: 3, width: '52%', borderRadius: 2 }} />
          <span className="block mx-auto mt-3" style={{ ...bar, width: 52, height: 10 }} />
        </div>
      )}

      {p.layout === 'editorial' && (
        <div className="px-3 pt-3">
          <span className="block" style={{ ...bar, width: 18, height: 2, opacity: .8 }} />
          <span className="block mt-1.5" style={{ fontFamily: p.titleFont, fontSize: 30, lineHeight: .9, color: p.text, letterSpacing: '-.02em' }}>
            Aa
          </span>
          <div className="flex gap-1.5 mt-2">
            <div style={{ flex: 1, height: 34, background: p.surface }} />
            <div style={{ flex: 1, height: 34, background: `${p.accent}33` }} />
            <div style={{ flex: 1, height: 34, background: p.surface }} />
          </div>
        </div>
      )}

      {p.layout === 'cards' && (
        <div className="px-3 pt-3">
          <span className="block" style={{ fontFamily: p.titleFont, fontSize: 14, color: p.text }}>Aa</span>
          <div className="grid grid-cols-3 gap-1.5 mt-2.5">
            {[0, 1, 2].map(i => (
              <div key={i} style={{ height: 40, background: p.surface, borderRadius: 8, border: `1px solid ${p.accent}22` }}>
                <span className="block m-1.5" style={{ ...bar, width: 12, height: 12, borderRadius: 999 }} />
              </div>
            ))}
          </div>
          <span className="block mx-auto mt-2" style={{ ...bar, width: 46, height: 9, borderRadius: 999 }} />
        </div>
      )}

      {p.layout === 'stacked' && (
        <div className="px-3 pt-3 text-center">
          <span className="block mt-1" style={{ fontFamily: p.titleFont, fontSize: 18, color: p.text }}>Aa</span>
          <span className="block mx-auto mt-1.5" style={{ background: `${p.text}22`, height: 3, width: '64%', borderRadius: 2 }} />
          <div className="mt-2.5 space-y-1">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5" style={{ background: p.surface, borderRadius: 4 }}>
                <span style={{ background: `${p.text}33`, height: 3, width: 40, borderRadius: 2 }} />
                <span style={{ ...bar, width: 16, height: 3 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TemplatePicker({ selected, onSelect }: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {SITE_TEMPLATES.map(meta => {
        const active = meta.id === selected;
        return (
          <button
            key={meta.id}
            type="button"
            onClick={() => onSelect(meta.id)}
            aria-pressed={active}
            className={`text-left rounded-2xl border bg-white overflow-hidden transition-ui cursor-pointer ${
              active
                ? 'border-wine-700 ring-2 ring-wine-700/15 shadow-md'
                : 'border-n-200 hover:border-n-300 hover:shadow-soft'
            }`}
          >
            <div className="relative">
              <Thumb meta={meta} />
              {active && (
                <span className="absolute top-2 right-2 h-6 w-6 rounded-full bg-wine-700 text-white grid place-items-center shadow-md">
                  <Check className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
            <div className="p-3.5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-heading">{meta.name}</h4>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-n-600 bg-n-100 border border-n-200 px-2 py-0.5 rounded-full">
                  {meta.category}
                </span>
              </div>
              <p className="text-[11px] text-n-600 mt-1.5 leading-relaxed">{meta.description}</p>
              <p className="text-[10px] text-n-400 mt-2">
                <span className="font-bold">Ideal para:</span> {meta.bestFor}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default TemplatePicker;
