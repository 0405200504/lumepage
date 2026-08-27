'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileText, Printer, ChevronDown } from 'lucide-react';
import { printPDF } from '@/lib/export';

interface ExportMenuProps {
  /** chamado ao escolher "Exportar CSV". */
  onCSV?: () => void;
  /** rótulo do botão. */
  label?: string;
  className?: string;
}

/** Botão de exportação: CSV (nativo) + Imprimir/Salvar PDF (window.print). */
export const ExportMenu: React.FC<ExportMenuProps> = ({ onCSV, label = 'Exportar', className = '' }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className={`relative no-print ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-line text-caption font-bold text-ink hover:bg-surface-2 transition-colors"
      >
        <Download className="h-4 w-4" /> {label}
        <ChevronDown className={`h-4 w-4 text-n-600 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-line bg-surface shadow-md p-1 z-20 animate-fade-up">
          {onCSV && (
            <button
              onClick={() => { onCSV(); setOpen(false); }}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-caption font-semibold text-ink hover:bg-surface-2 transition-colors"
            >
              <FileText className="h-4 w-4 text-n-600" /> Exportar CSV
            </button>
          )}
          <button
            onClick={() => { setOpen(false); setTimeout(printPDF, 50); }}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-caption font-semibold text-ink hover:bg-surface-2 transition-colors"
          >
            <Printer className="h-4 w-4 text-n-600" /> Imprimir / Salvar PDF
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportMenu;
