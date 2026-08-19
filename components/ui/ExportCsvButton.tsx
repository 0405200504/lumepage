'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { Download } from 'lucide-react';
import { DatasetKey } from '@/lib/admin/export-datasets';

/**
 * Botão único de exportação, reaproveitado por todas as listas do admin.
 * Repassa a query string atual para /api/admin/export — o CSV sai com o mesmo
 * recorte da tela, sem duplicar a lógica de filtro em lugar nenhum.
 */
export function ExportCsvButton({
  dataset, label = 'Exportar CSV', className = '',
}: { dataset: DatasetKey; label?: string; className?: string }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams.toString());
  params.set('dataset', dataset);
  // Paginação não se aplica ao arquivo: exporta o filtro inteiro.
  params.delete('page');
  params.delete('size');

  return (
    <a
      href={`/api/admin/export?${params.toString()}`}
      // Download real (a rota manda Content-Disposition) — sem virar navegação SPA.
      download
      className={`no-print inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-2 transition-colors ${className}`}
    >
      <Download className="h-3.5 w-3.5" aria-hidden />
      {label}
    </a>
  );
}

export default ExportCsvButton;
