import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { RawSearchParams, TableParams, buildHref, nextSort } from '@/lib/query-params';
import { TablePagination } from './TablePagination';
import { ColumnMenu } from './ColumnMenu';

/**
 * TABELA DO PAINEL ADMIN — server-driven
 * --------------------------------------
 * Recebe só a página atual, já ordenada e filtrada pelo banco. Ordenação e
 * paginação são links que mexem na URL; a página do servidor relê os
 * searchParams e faz a query nova.
 *
 * Visual: card branco, cabeçalho em caixa normal e cinza, SEM zebra, divisória
 * clara e hover suave. Abaixo de md, cada linha vira um cartão.
 */

export interface ServerColumn<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  hideOnMobile?: boolean;
  /** No cartão do mobile, esta coluna vira o título da linha. */
  primary?: boolean;
  mobileLabel?: string;
  /** Nome legível no menu de colunas. Sem isto, a coluna não pode ser escondida. */
  menuLabel?: string;
  cell: (row: T) => React.ReactNode;
}

export interface EmptyStateSlot {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

interface ServerTableProps<T> {
  columns: ServerColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  total: number;
  params: TableParams;
  basePath: string;
  searchParams?: RawSearchParams;
  rowHref?: (row: T) => string;
  empty?: EmptyStateSlot;
  caption: string;
  toolbar?: React.ReactNode;
  footerLeft?: React.ReactNode;
}

const alignClass = (col: { align?: string; numeric?: boolean }) => {
  const align = col.align ?? (col.numeric ? 'right' : 'left');
  return align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
};

export function ServerTable<T>({
  columns: allColumns, rows, rowKey, total, params, basePath, searchParams,
  rowHref, empty, caption, toolbar, footerLeft,
}: ServerTableProps<T>) {
  const isEmpty = rows.length === 0;

  const rawCols = searchParams?.cols;
  const hidden = (Array.isArray(rawCols) ? rawCols[0] : rawCols || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const columns = allColumns.filter(c => !(c.menuLabel && hidden.includes(c.key)));
  const menuColumns = allColumns.filter(c => c.menuLabel).map(c => ({ key: c.key, label: c.menuLabel as string }));

  return (
    <div className="card overflow-hidden">
      {(toolbar || menuColumns.length > 0) && (
        <div className="px-4 py-3 no-print flex flex-wrap items-center gap-2 border-b border-line">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {menuColumns.length > 0 && <ColumnMenu columns={menuColumns} hidden={hidden} />}
        </div>
      )}

      {isEmpty ? (
        <div className="py-16 px-6 flex flex-col items-center text-center">
          {empty?.icon && <div className="mb-3 text-n-400 [&>svg]:h-7 [&>svg]:w-7">{empty.icon}</div>}
          <h3 className="text-label text-heading">{empty?.title ?? 'Nada por aqui'}</h3>
          {empty?.description && (
            <p className="mt-1 text-caption text-n-500 max-w-sm leading-relaxed">{empty.description}</p>
          )}
          {empty?.action && <div className="mt-4">{empty.action}</div>}
        </div>
      ) : (
        <>
          {/* ——— Desktop ——— */}
          <div className="hidden md:block overflow-x-auto scroll-touch table-scroll max-h-[70vh]">
            <table className="admin-table min-w-full border-collapse">
              <caption className="sr-only">{caption}</caption>
              <thead>
                <tr>
                  {columns.map(col => {
                    const active = params.sort === col.key;
                    const cls = `${alignClass(col)} ${col.className ?? ''}`;
                    if (!col.sortable) return <th key={col.key} scope="col" className={cls}>{col.header}</th>;
                    const next = nextSort(params.sort, params.dir, col.key);
                    return (
                      <th key={col.key} scope="col" className={cls} aria-sort={active ? (params.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <Link
                          href={buildHref(basePath, searchParams, { sort: next.sort, dir: next.dir })}
                          scroll={false}
                          className={`inline-flex items-center gap-1 hover:text-heading transition-ui ${active ? 'text-heading' : ''}`}
                        >
                          {col.header}
                          {!active
                            ? <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden />
                            : params.dir === 'desc'
                              ? <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                              : <ArrowUp className="h-3.5 w-3.5" aria-hidden />}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const href = rowHref?.(row);
                  const linkIndex = Math.max(0, columns.findIndex(c => c.primary));
                  return (
                    <tr key={rowKey(row)} className="transition-colors">
                      {columns.map((col, ci) => (
                        <td key={col.key} className={`${alignClass(col)} ${col.numeric ? 'num' : ''} ${col.className ?? ''}`}>
                          {href && ci === linkIndex ? (
                            <Link href={href} className="block -mx-4 -my-3 px-4 py-3">{col.cell(row)}</Link>
                          ) : col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ——— Celular: cartões ——— */}
          <ul className="md:hidden divide-y divide-line">
            {rows.map(row => {
              const href = rowHref?.(row);
              const visible = columns.filter(c => !c.hideOnMobile);
              const primary = visible.find(c => c.primary) ?? visible[0];
              const rest = visible.filter(c => c !== primary);
              const content = (
                <>
                  <div className="text-body-sm font-semibold text-heading">{primary?.cell(row)}</div>
                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2">
                    {rest.map(col => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-micro font-semibold text-n-500">{col.mobileLabel ?? col.header}</dt>
                        <dd className={`text-caption text-ink truncate mt-0.5 ${col.numeric ? 'num' : ''}`}>{col.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              );
              return (
                <li key={rowKey(row)} className="px-4 py-4">
                  {href ? <Link href={href} className="block tap">{content}</Link> : content}
                </li>
              );
            })}
          </ul>

          <TablePagination total={total} params={params} basePath={basePath} searchParams={searchParams} left={footerLeft} />
        </>
      )}
    </div>
  );
}

export default ServerTable;
