'use client';

import React, { useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Download } from 'lucide-react';
import { Portal } from './Portal';
import { brl } from '@/lib/format';

export interface DrillDownRow {
  id: string;
  title: string;
  subtitle?: string;
  amountCents: number;
  /** define o sinal/cor: 'in' verde, 'out' vermelho, 'neutral' neutro. */
  tone?: 'in' | 'out' | 'neutral';
}

interface DrillDownModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  rows: DrillDownRow[];
  onClose: () => void;
  /** total exibido no rodapé; se omitido, soma os valores. */
  totalLabel?: string;
  onExport?: () => void;
}

/** Modal de detalhamento: lista as transações/atendimentos que compõem um número. */
export const DrillDownModal: React.FC<DrillDownModalProps> = ({
  open, title, subtitle, rows, onClose, totalLabel = 'Total', onExport,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const total = rows.reduce((s, r) => s + (r.tone === 'out' ? -r.amountCents : r.amountCents), 0);

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-[#100b0c]/55 backdrop-blur-md" onClick={onClose} />
        <div className="relative card-elevated w-full sm:max-w-lg mx-0 sm:mx-4 rounded-b-none sm:rounded-3xl p-0 z-10 animate-slide-up max-h-[85vh] flex flex-col safe-sheet sm:pb-0">
          <div className="flex items-start justify-between gap-3 p-5 border-b border-line">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-heading tracking-tight truncate">{title}</h3>
              {subtitle && <p className="text-xs text-gray-450 mt-0.5">{subtitle}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onExport && (
                <button onClick={onExport} title="Exportar CSV" className="p-2 rounded-lg text-gray-450 hover:bg-surface-2 hover:text-forest transition-colors">
                  <Download className="h-4 w-4" />
                </button>
              )}
              <button onClick={onClose} aria-label="Fechar" className="p-2 rounded-lg text-gray-450 hover:bg-surface-2 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto scroll-touch flex-1 p-3 space-y-1.5">
            {rows.length === 0 ? (
              <p className="text-center text-xs text-gray-450 py-12">Nenhum item compõe este número.</p>
            ) : rows.map((r) => {
              const out = r.tone === 'out';
              const neutral = r.tone === 'neutral';
              return (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:bg-surface-2 transition-colors">
                  {!neutral && (
                    <span className={`p-1.5 rounded-lg shrink-0 ${out ? 'bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)]' : 'bg-[color:var(--color-ok)]/10 text-[color:var(--color-ok)]'}`}>
                      {out ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink truncate">{r.title}</p>
                    {r.subtitle && <p className="text-[11px] text-gray-450 truncate">{r.subtitle}</p>}
                  </div>
                  <span className={`text-sm font-bold shrink-0 tabular-nums ${neutral ? 'text-ink' : out ? 'text-[color:var(--color-bad)]' : 'text-[color:var(--color-ok)]'}`}>
                    {neutral ? '' : out ? '−' : '+'}{brl(r.amountCents)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-5 border-t border-line">
            <span className="text-xs font-bold text-gray-450 uppercase tracking-wider">{totalLabel} · {rows.length} {rows.length === 1 ? 'item' : 'itens'}</span>
            <span className="text-lg font-bold text-heading tabular-nums">{brl(Math.abs(total))}</span>
          </div>
        </div>
      </div>
    </Portal>
  );
};

export default DrillDownModal;
