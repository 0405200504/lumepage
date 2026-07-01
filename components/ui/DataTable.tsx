'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  /** conteúdo da célula. */
  cell: (row: T) => React.ReactNode;
  /** valor para ordenação (string ou number). Omita p/ coluna não-ordenável. */
  sortValue?: (row: T) => string | number;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  pageSize?: number;
  /** ordenação inicial. */
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  emptyLabel?: string;
  onRowClick?: (row: T) => void;
}

/** Tabela genérica: ordenação por coluna + paginação client-side. */
export function DataTable<T>({
  columns, rows, rowKey, pageSize = 25, initialSort, emptyLabel = 'Nenhum registro.', onRowClick,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find(c => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a), vb = col.sortValue!(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [rows, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = (key: string) => {
    setPage(0);
    setSort(prev => {
      if (prev?.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null;
    });
  };

  return (
    <div>
      <div className="overflow-x-auto scroll-touch">
        <table className="min-w-full text-left">
          <thead className="text-[10px] font-bold text-gray-450 uppercase tracking-wider border-b border-line bg-surface-2/50">
            <tr>
              {columns.map(col => {
                const sortable = !!col.sortValue;
                const activeSort = sort?.key === col.key;
                return (
                  <th key={col.key} className={`px-4 py-3 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}>
                    {sortable ? (
                      <button onClick={() => toggleSort(col.key)} className={`inline-flex items-center gap-1 hover:text-ink transition-colors ${activeSort ? 'text-ink' : ''}`}>
                        {col.header}
                        {!activeSort ? <ChevronsUpDown className="h-3 w-3 opacity-50" /> : sort!.dir === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      </button>
                    ) : col.header}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-sm text-ink">
            {pageRows.map(row => (
              <tr
                key={rowKey(row)}
                className={`hover:bg-[color:var(--color-accent-soft)]/60 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map(col => (
                  <td key={col.key} className={`px-4 py-3 whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.className ?? ''}`}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={columns.length} className="py-12 text-center text-xs text-gray-450">{emptyLabel}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs no-print">
          <span className="text-gray-450 font-semibold">
            {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} de {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
              className="p-1.5 rounded-lg border border-line text-gray-450 hover:bg-surface-2 disabled:opacity-40 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-bold text-ink">{safePage + 1}/{pageCount}</span>
            <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
              className="p-1.5 rounded-lg border border-line text-gray-450 hover:bg-surface-2 disabled:opacity-40 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
