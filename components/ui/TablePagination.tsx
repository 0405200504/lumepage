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

/** Paginação server-side: cada botão é um link que muda `page`/`size` na URL. */
export function TablePagination({ total, params, basePath, searchParams, left }: Props) {
  const { page, pageSize } = params;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pageCount);
  const start = total === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(total, current * pageSize);

  const nav = 'icon-chip h-8 w-8';
  const navOff = 'icon-chip h-8 w-8 opacity-40 pointer-events-none';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-line text-caption no-print">
      <div className="flex items-center gap-4">
        <span className="text-n-500 num">
          {start}–{end} de <span className="text-heading font-semibold">{total.toLocaleString('pt-BR')}</span>
        </span>
        {left}
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-1">
          <span className="text-n-500 mr-1">Por página</span>
          {PAGE_SIZES.map(size => (
            <Link
              key={size}
              href={buildHref(basePath, searchParams, { size, page: null })}
              scroll={false}
              className={`h-7 px-2 inline-flex items-center rounded-full font-semibold num transition-ui ${
                size === pageSize ? 'bg-accent-soft text-accent-link' : 'text-n-500 hover:text-heading hover:bg-surface-2'
              }`}
            >
              {size}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {current > 1
            ? <Link href={buildHref(basePath, searchParams, { page: current - 1 })} scroll={false} className={nav} aria-label="Página anterior"><ChevronLeft className="h-4 w-4" /></Link>
            : <span className={navOff} aria-hidden><ChevronLeft className="h-4 w-4" /></span>}
          <span className="px-2 font-semibold text-heading num">{current}/{pageCount}</span>
          {current < pageCount
            ? <Link href={buildHref(basePath, searchParams, { page: current + 1 })} scroll={false} className={nav} aria-label="Próxima página"><ChevronRight className="h-4 w-4" /></Link>
            : <span className={navOff} aria-hidden><ChevronRight className="h-4 w-4" /></span>}
        </div>
      </div>
    </div>
  );
}

export default TablePagination;
