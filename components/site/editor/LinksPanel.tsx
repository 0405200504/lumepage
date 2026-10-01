'use client';

/**
 * ============================================================================
 * Painel "Meus links" — formato da página + botões da bio
 * ============================================================================
 * Aqui a profissional decide se a página é o site completo ou só a lista de
 * links, escolhe o estilo dos botões, escreve a frase curta e organiza os
 * botões. Os quatro botões inteligentes (agendar, WhatsApp, Instagram, mapa)
 * só pedem liga/desliga — o destino vem da identidade. Link livre pede nome
 * e endereço.
 */

import React, { useState } from 'react';
import {
  CalendarCheck, MapPin, Instagram, MessageCircle, Link2, Plus, Trash2,
  ChevronUp, ChevronDown, LayoutTemplate, List, Info,
} from 'lucide-react';
import type { SiteConfig, SiteLinkKind, SiteLinkStyle, SitePageMode } from '@/types/site';
import { LIMITS, LINK_KIND_LABEL } from '@/lib/site/config';
import { TextArea, Toggle, newItemId } from './fields';

const KIND_ICON: Record<SiteLinkKind, React.ElementType> = {
  book: CalendarCheck,
  whatsapp: MessageCircle,
  instagram: Instagram,
  maps: MapPin,
  custom: Link2,
};

const KIND_HINT: Record<SiteLinkKind, string> = {
  book: 'Abre o agendamento da Lume.',
  whatsapp: 'Usa o WhatsApp dos seus dados.',
  instagram: 'Usa o Instagram dos seus dados.',
  maps: 'Abre o Google Maps no seu endereço.',
  custom: '',
};

const STYLE_LABEL: Record<SiteLinkStyle, { name: string; hint: string }> = {
  pill: { name: 'Pílula', hint: 'Botões cheios na cor principal.' },
  card: { name: 'Cartão', hint: 'Cartões claros, “Agendar” em destaque.' },
  outline: { name: 'Contorno', hint: 'Só o traço, bem leve.' },
};

/** Seletor do formato: duas opções grandes, com desenho, sem jargão. */
export function PageModePicker({ value, onChange }: { value: SitePageMode; onChange: (m: SitePageMode) => void }) {
  const opts: { id: SitePageMode; title: string; desc: string; icon: React.ElementType }[] = [
    { id: 'site', title: 'Site completo', desc: 'Capa, serviços, fotos, depoimentos e agendamento.', icon: LayoutTemplate },
    { id: 'links', title: 'Só links (bio)', desc: 'Sua foto e botões: agendar, WhatsApp, Instagram…', icon: List },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {opts.map(o => {
        const Icon = o.icon;
        const active = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={active}
            className={`text-left rounded-2xl border p-3.5 flex gap-3 transition-ui cursor-pointer ${
              active ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15' : 'border-n-200 bg-white hover:border-n-300'
            }`}
          >
            <span className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ${active ? 'bg-wine-700 text-white' : 'bg-n-100 text-n-600'}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="text-[13px] font-bold text-heading block">{o.title}</span>
              <span className="text-[11px] text-n-600 block mt-0.5 leading-snug">{o.desc}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LinksPanel({ config, set }: {
  config: SiteConfig;
  set: (mutate: (draft: SiteConfig) => void) => void;
}) {
  const l = config.links;
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  const move = (idx: number, dir: -1 | 1) => set(d => {
    const items = d.links.items;
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    [items[idx], items[j]] = [items[j], items[idx]];
  });

  const addCustom = () => {
    const label = newLabel.trim();
    let url = newUrl.trim();
    if (!label) { setAddError('Dê um nome ao botão.'); return; }
    if (!url) { setAddError('Cole o endereço do link.'); return; }
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    try { new URL(url); } catch { setAddError('Esse endereço não parece válido.'); return; }
    if (l.items.length >= LIMITS.maxLinks) { setAddError(`Você pode ter até ${LIMITS.maxLinks} botões.`); return; }
    set(d => {
      d.links.items.push({ id: newItemId('link'), kind: 'custom', label: label.slice(0, LIMITS.linkLabel), url, enabled: true });
    });
    setNewLabel(''); setNewUrl(''); setAddError(null);
  };

  const missingSmart = (['book', 'whatsapp', 'instagram', 'maps'] as SiteLinkKind[])
    .filter(k => !l.items.some(it => it.kind === k));

  return (
    <div className="space-y-7">
      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Formato da página</h4>
        <PageModePicker value={l.mode} onChange={m => set(d => { d.links.mode = m; })} />
        <div className="rounded-2xl border border-n-200 bg-n-50/60 px-3.5 py-3 flex gap-2.5">
          <Info className="h-4 w-4 text-wine-700 shrink-0 mt-0.5" />
          <p className="text-[11px] text-n-600 leading-relaxed">
            Trocar o formato <b>não apaga nada</b>: textos, fotos e serviços continuam guardados.
            Os botões abaixo aparecem na página “só links”.
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Frase embaixo do nome</h4>
        <TextArea label="Uma linha sobre você" value={l.bio} max={LIMITS.bio} rows={2}
          onChange={v => set(d => { d.links.bio = v; })}
          placeholder="Nail designer em Moema · Alongamento, blindagem e nail art · Agende online" />
      </section>

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Estilo dos botões</h4>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(STYLE_LABEL) as SiteLinkStyle[]).map(st => {
            const active = l.style === st;
            const primary = config.theme.primary;
            return (
              <button
                key={st}
                type="button"
                onClick={() => set(d => { d.links.style = st; })}
                aria-pressed={active}
                className={`rounded-2xl border p-2.5 text-left transition-ui cursor-pointer ${
                  active ? 'border-wine-700 ring-2 ring-wine-700/15 bg-accent-soft' : 'border-n-200 bg-white hover:border-n-300'
                }`}
              >
                {/* Miniatura do botão, desenhada com a cor real da paleta */}
                <span
                  className="block h-6 w-full"
                  style={{
                    borderRadius: st === 'card' ? 6 : 999,
                    background: st === 'pill' ? primary : st === 'card' ? '#fff' : 'transparent',
                    border: st === 'pill' ? 'none' : `1.5px solid ${st === 'card' ? 'rgba(0,0,0,.12)' : primary}`,
                  }}
                />
                <span className="text-[12px] font-bold text-heading block mt-2">{STYLE_LABEL[st].name}</span>
                <span className="text-[10px] text-n-500 block leading-snug">{STYLE_LABEL[st].hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Botões</h4>
            <p className="text-[11px] text-n-400 mt-1">Ligue, desligue, mude o texto e a ordem.</p>
          </div>
        </div>

        <div className="space-y-2">
          {l.items.map((it, idx) => {
            const Icon = KIND_ICON[it.kind];
            return (
              <div key={it.id} className={`rounded-2xl border bg-white p-3 ${it.enabled ? 'border-n-200' : 'border-n-100 opacity-70'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="h-8 w-8 shrink-0 rounded-xl bg-n-100 text-n-600 grid place-items-center">
                    <Icon className="h-4 w-4" />
                  </span>
                  <input
                    className="flex-1 min-w-0 h-9 px-2.5 text-[13px] font-semibold bg-transparent border border-transparent hover:border-n-200 focus:border-wine-700 rounded-lg outline-none"
                    value={it.label}
                    maxLength={LIMITS.linkLabel}
                    onChange={e => set(d => { d.links.items[idx].label = e.target.value; })}
                    aria-label="Texto do botão"
                  />
                  <Toggle label="" checked={it.enabled} onChange={v => set(d => { d.links.items[idx].enabled = v; })} />
                </div>
                <div className="flex items-center justify-between gap-2 mt-2 pl-10">
                  {it.kind === 'custom' ? (
                    <input
                      className="flex-1 min-w-0 h-8 px-2.5 text-[12px] text-n-600 bg-n-50 border border-n-200 rounded-lg outline-none focus:border-wine-700"
                      value={it.url}
                      maxLength={LIMITS.url}
                      onChange={e => set(d => { d.links.items[idx].url = e.target.value; })}
                      aria-label="Endereço do link"
                    />
                  ) : (
                    <span className="text-[11px] text-n-400">{KIND_HINT[it.kind]}</span>
                  )}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0} aria-label="Subir"
                      className="icon-chip h-7 w-7 disabled:opacity-30"><ChevronUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => move(idx, 1)} disabled={idx === l.items.length - 1} aria-label="Descer"
                      className="icon-chip h-7 w-7 disabled:opacity-30"><ChevronDown className="h-3.5 w-3.5" /></button>
                    <button type="button" aria-label="Remover"
                      onClick={() => set(d => { d.links.items.splice(idx, 1); })}
                      className="icon-chip h-7 w-7 text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {missingSmart.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-n-500">Adicionar de volta:</span>
            {missingSmart.map(k => {
              const Icon = KIND_ICON[k];
              return (
                <button key={k} type="button"
                  onClick={() => set(d => {
                    d.links.items.push({ id: newItemId('link'), kind: k, label: LINK_KIND_LABEL[k], url: '', enabled: true });
                  })}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-full border border-n-200 bg-white text-n-700 hover:border-wine-300 cursor-pointer">
                  <Icon className="h-3 w-3" /> {LINK_KIND_LABEL[k]}
                </button>
              );
            })}
          </div>
        )}

        {/* Link livre */}
        <div className="rounded-2xl border border-dashed border-n-300 p-3.5 space-y-2.5">
          <p className="text-[12px] font-bold text-heading flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-wine-700" /> Adicionar outro link
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              className="h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl outline-none focus:border-wine-700"
              placeholder="Nome do botão (ex.: Meu catálogo)"
              value={newLabel} maxLength={LIMITS.linkLabel}
              onChange={e => { setNewLabel(e.target.value); setAddError(null); }}
            />
            <input
              className="h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl outline-none focus:border-wine-700"
              placeholder="Endereço (ex.: pinterest.com/seuperfil)"
              value={newUrl} maxLength={LIMITS.url} inputMode="url"
              onChange={e => { setNewUrl(e.target.value); setAddError(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
            />
          </div>
          {addError && <p className="text-[11px] text-warning font-semibold">{addError}</p>}
          <button type="button" onClick={addCustom}
            className="inline-flex items-center gap-1.5 px-4 h-9 text-[12px] font-bold rounded-xl bg-wine-700 hover:bg-wine-800 text-white cursor-pointer">
            <Plus className="h-3.5 w-3.5" /> Adicionar botão
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Serviços na página de links</h4>
        <Toggle
          label="Mostrar meus serviços com preço e botão de agendar"
          checked={l.showServices}
          onChange={v => set(d => { d.links.showServices = v; })}
        />
        <p className="text-[11px] text-n-400">
          Os serviços vêm do seu cadastro na Lume: mudou o preço lá, mudou aqui.
        </p>
      </section>
    </div>
  );
}

export default LinksPanel;
