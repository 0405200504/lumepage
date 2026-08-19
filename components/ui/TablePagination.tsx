import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PAGE_SIZES, RawSearchParams, TableParams, buildHref } from '@/lib/query-params';

interface Props {
  total: number;
  params: TableParams;
  basePath: string;
  searchParams?: RawSearchParams;
  left?: React.ReactNode;
}

/**
 * Paginação server-side: cada botão é um link que muda `page`/`size` na URL.
 * Mostra sempre a contagem total do filtro — "1–25 de 340" é a informação que faltava
 * nas listas do admin, que renderizavam tudo sem dizer quanto era "tudo".
 */
export function TablePagination({ total, params, basePath, searchParams, left }: Props) {
  const { page, pageSize } = params;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);

  const navBtn = 'inline-flex items-center justify-center h-8 w-8 rounded-lg border border-line text-muted hover:bg-surface-2 hover:text-ink transition-colors';
  const navOff = 'inline-flex items-center justify-center h-8 w-8 rounded-lg border border-line text-muted/40 pointer-events-none';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-xs no-print">
      <div className="flex items-center gap-4">
        <span className="font-semibold text-muted tabular-nums">
          {start}–{end} de <span className="text-ink">{total.toLocaleString('pt-BR')}</span>
        </span>
        {left}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1.5">
          <span className="text-muted font-semibold">Por página</span>
          {PAGE_SIZES.map(size => (
            <Link
              key={size}
              href={buildHref(basePath, searchParams, { size, page: null })}
              scroll={false}
              className={`px-2 py-1 rounded-md font-bold tabular-nums transition-colors ${
                size === pageSize ? 'bg-accent-soft text-accent-link' : 'text-muted hover:text-ink hover:bg-surface-2'
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {current > 1 ? (
            <Link href={buildHref(basePath, searchParams, { page: current - 1 })} scroll={false} className={navBtn} aria-label="Página anterior">
              <ChevronLeft className="h-4 w-4" />
            </Link>
          ) : (
            <span className={navOff} aria-hidden><ChevronLeft className="h-4 w-4" /></span>
          )}

          <span className="px-2 font-bold text-ink tabular-nums">{current}/{pageCount}</span>

          {current < pageCount ? (
            <Link href={buildHref(basePath, searchParams, { page: current + 1 })} scroll={false} className={navBtn} aria-label="Próxima página">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className={navOff} aria-hidden><ChevronRight className="h-4 w-4" /></span>
          )}
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
