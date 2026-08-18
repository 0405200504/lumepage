'use client';

/**
 * ============================================================================
 * Campos do editor de "Minha Página"
 * ============================================================================
 * A profissional é manicure, lash designer, esteticista — não designer. Cada
 * campo aqui existe para ela nunca precisar pensar em layout:
 *  • contador de caracteres antes de estourar o limite;
 *  • upload que já mostra a miniatura e o botão de remover;
 *  • listas com "adicionar / subir / descer / excluir" no lugar óbvio.
 */

import React, { useId, useRef, useState } from 'react';
import {
  Upload, X, Trash2, Plus, ChevronUp, ChevronDown, Loader2, ImageIcon,
} from 'lucide-react';
import { uploadSiteImage } from './uploadImage';

// ── Blocos de agrupamento ───────────────────────────────────────────────────

export function FieldGroup({ title, hint, children }: {
  title: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h4 className="text-[11px] font-bold uppercase tracking-[0.14em] text-gray-450">{title}</h4>
        {hint && <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{hint}</p>}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>;
}

// ── Texto ───────────────────────────────────────────────────────────────────

interface TextProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  placeholder?: string;
  hint?: string;
  type?: 'text' | 'email' | 'tel';
}

const inputCls =
  'w-full px-3 py-2.5 text-[13px] bg-white border border-gray-150 rounded-xl outline-none ' +
  'focus:border-forest focus:ring-2 focus:ring-forest/10 transition-colors placeholder:text-gray-300';

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.length > max * 0.9;
  return (
    <span className={`text-[10px] tabular-nums ${over ? 'text-amber-600 font-bold' : 'text-gray-300'}`}>
      {value.length}/{max}
    </span>
  );
}

export function TextField({ label, value, onChange, max, placeholder, hint, type = 'text' }: TextProps) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-[11px] font-bold text-gray-600">{label}</label>
        <Counter value={value} max={max} />
      </div>
      <input
        id={id}
        type={type}
        className={inputCls}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

export function TextArea({ label, value, onChange, max, placeholder, hint, rows = 4 }: TextProps & { rows?: number }) {
  const id = useId();
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <label htmlFor={id} className="text-[11px] font-bold text-gray-600">{label}</label>
        <Counter value={value} max={max} />
      </div>
      <textarea
        id={id}
        rows={rows}
        className={`${inputCls} resize-y leading-relaxed`}
        value={value}
        maxLength={max}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
      />
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Cor ─────────────────────────────────────────────────────────────────────

export function ColorField({ label, value, onChange, hint }: {
  label: string; value: string; onChange: (v: string) => void; hint?: string;
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="text-[11px] font-bold text-gray-600 block mb-1.5">{label}</label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-10 w-12 rounded-xl border border-gray-150 bg-white cursor-pointer p-1"
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`${inputCls} font-mono uppercase tracking-wide`}
          maxLength={7}
        />
      </div>
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ── Interruptor ─────────────────────────────────────────────────────────────

export function Toggle({ label, hint, checked, onChange, disabled }: {
  label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? 'bg-forest' : 'bg-gray-200'} ${disabled ? '' : 'cursor-pointer'}`}
      >
        <span className={`block h-4 w-4 bg-white rounded-full shadow-xs transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-gray-700">{label}</span>
        {hint && <span className="block text-[11px] text-gray-400 mt-0.5 leading-relaxed">{hint}</span>}
      </span>
    </label>
  );
}

// ── Imagem ──────────────────────────────────────────────────────────────────

export function ImageField({ label, value, onChange, professionalId, kind, hint, aspect = 'square', onError }: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  professionalId: string;
  kind: string;
  hint?: string;
  aspect?: 'square' | 'wide' | 'portrait';
  onError?: (msg: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const ratio = aspect === 'wide' ? 'aspect-video' : aspect === 'portrait' ? 'aspect-4/5' : 'aspect-square';

  const pick = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    const res = await uploadSiteImage(professionalId, file, kind);
    setBusy(false);
    if (res.ok && res.url) onChange(res.url);
    else onError?.(res.error || 'Não foi possível enviar a imagem.');
    if (ref.current) ref.current.value = '';
  };

  return (
    <div>
      <label className="text-[11px] font-bold text-gray-600 block mb-1.5">{label}</label>
      <div className="flex items-start gap-3">
        <div className={`${ratio} w-20 shrink-0 rounded-xl overflow-hidden bg-sand border border-gray-150 grid place-items-center`}>
          {value
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={value} alt="" className="h-full w-full object-cover" />
            : <ImageIcon className="h-5 w-5 text-gray-300" />}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => ref.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl bg-forest hover:bg-forest-hover text-white disabled:opacity-60 cursor-pointer transition-colors"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {busy ? 'Enviando…' : value ? 'Trocar' : 'Enviar foto'}
            </button>
            {value && (
              <button
                type="button"
                onClick={() => onChange('')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border border-gray-150 text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <X className="h-3.5 w-3.5" /> Remover
              </button>
            )}
          </div>
          {hint && <p className="text-[10px] text-gray-400 leading-relaxed">{hint}</p>}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={e => pick(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Lista ordenável genérica ────────────────────────────────────────────────

export function Repeater<T extends { id: string }>({
  items, onChange, renderItem, makeNew, addLabel, max, emptyHint,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  makeNew: () => T;
  addLabel: string;
  max: number;
  emptyHint?: string;
}) {
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {items.length === 0 && emptyHint && (
        <p className="text-[11px] text-gray-400 bg-sand border border-gray-150 rounded-xl px-3 py-3 leading-relaxed">
          {emptyHint}
        </p>
      )}

      {items.map((item, i) => (
        <div key={item.id} className="rounded-2xl border border-gray-150 bg-white p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              {i + 1} de {items.length}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                aria-label="Subir"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 cursor-pointer">
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1}
                aria-label="Descer"
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 disabled:opacity-30 cursor-pointer">
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                aria-label="Excluir"
                className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 cursor-pointer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          {renderItem(
            item,
            patch => onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it))),
            i,
          )}
        </div>
      ))}

      {items.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...items, makeNew()])}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[11px] font-bold rounded-xl border border-dashed border-gray-250 text-gray-500 hover:border-forest hover:text-forest cursor-pointer transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      ) : (
        <p className="text-[10px] text-gray-400 text-center">Limite de {max} itens atingido.</p>
      )}
    </div>
  );
}

/** Gera um id local para itens novos de lista (o servidor sanea depois). */
export function newItemId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
