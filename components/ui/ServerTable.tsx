import React from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { RawSearchParams, TableParams, buildHref, nextSort } from '@/lib/query-params';
import { TablePagination } from './TablePagination';
import { ColumnMenu } from './ColumnMenu';

/**
 * TABELA DO PAINEL ADMIN — server-driven
 * --------------------------------------
 * Diferente do <DataTable> (client-side, usado no painel da profissional), esta
 * tabela NÃO recebe a lista inteira: recebe só a página atual, já ordenada e filtrada
 * pelo banco. Ordenação e paginação são links que mexem na URL; a página do servidor
 * relê os searchParams e faz a query nova.
 *
 * Traz o que faltava nas tabelas do admin: cabeçalho fixo, zebra, hover legível,
 * números com num alinhados à direita, linha inteira clicável, estado vazio
 * desenhado e — abaixo de md — cartões no lugar de scroll horizontal.
 */

export interface ServerColumn<T> {
  key: string;
  /** ReactNode para caber, p.ex., a caixa de "selecionar tudo". */
  header: React.ReactNode;
  /** Habilita o link de ordenação. A página precisa tratar `sort=<key>`. */
  sortable?: boolean;
  /** Número: alinha à direita e liga num (colunas de valor comparáveis). */
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  className?: string;
  /** Some no mobile (a coluna não entra no cartão). */
  hideOnMobile?: boolean;
  /** No cartão do mobile, esta coluna vira o título da linha. */
  primary?: boolean;
  /** Rótulo do cartão no mobile (padrão: header). */
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
  /** Apenas as linhas da página atual. */
  rows: T[];
  rowKey: (row: T) => string;
  /** Total de registros do filtro (não da página) — vem do count do banco. */
  total: number;
  params: TableParams;
  basePath: string;
  searchParams?: RawSearchParams;
  /** Torna a linha inteira clicável. */
  rowHref?: (row: T) => string;
  empty?: EmptyStateSlot;
  /** Descrição da tabela para leitores de tela. */
  caption: string;
  /** Barra acima da tabela (busca, filtros, exportar). */
  toolbar?: React.ReactNode;
  /** Conteúdo extra no rodapé, à esquerda da paginação. */
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

  // Colunas escondidas vivem na URL (?cols=a,b), do mesmo jeito que filtro e ordem.
  // Antes a coluna que não cabia simplesmente sumia cortada, com a barra de rolagem
  // horizontal invisível — informação perdida sem aviso.
  const rawCols = searchParams?.cols;
  const hidden = (Array.isArray(rawCols) ? rawCols[0] : rawCols || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const columns = allColumns.filter(c => !(c.menuLabel && hidden.includes(c.key)));
  const menuColumns = allColumns.filter(c => c.menuLabel).map(c => ({ key: c.key, label: c.menuLabel as string }));

  return (
    <div className="card overflow-hidden">
      {(toolbar || menuColumns.length > 0) && (
        <div className="px-4 py-3 border-b border-line bg-surface-2/40 no-print flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1">{toolbar}</div>
          {menuColumns.length > 0 && <ColumnMenu columns={menuColumns} hidden={hidden} />}
        </div>
      )}

      {isEmpty ? (
        <div className="py-16 px-6 flex flex-col items-center text-center">
          {empty?.icon && <div className="mb-4 text-n-600">{empty.icon}</div>}
          <h3 className="text-label font-bold text-ink">{empty?.title ?? 'Nada por aqui'}</h3>
          {empty?.description && (
            <p className="mt-1.5 text-caption text-n-600 max-w-sm leading-relaxed">{empty.description}</p>
          )}
          {empty?.action && <div className="mt-5">{empty.action}</div>}
        </div>
      ) : (
        <>
          {/* ————— Desktop: tabela ————— */}
          {/* `table-scroll` deixa a barra horizontal SEMPRE visível e marca a borda
              direita quando há mais coluna para o lado — nada de corte silencioso. */}
          <div className="hidden md:block overflow-x-auto scroll-touch table-scroll max-h-[70vh]">
            <table className="min-w-full text-left border-collapse">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 z-10 bg-surface-2 text-caption font-bold text-muted uppercase tracking-[0.08em]">
                <tr>
                  {columns.map(col => {
                    const active = params.sort === col.key;
                    const cls = `px-4 py-3 border-b border-line whitespace-nowrap ${alignClass(col)} ${col.className ?? ''}`;

                    if (!col.sortable) {
                      return <th key={col.key} scope="col" className={cls}>{col.header}</th>;
                    }

                    const next = nextSort(params.sort, params.dir, col.key);
                    return (
                      <th
                        key={col.key}
                        scope="col"
                        className={cls}
                        aria-sort={active ? (params.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                      >
                        <Link
                          href={buildHref(basePath, searchParams, { sort: next.sort, dir: next.dir })}
                          scroll={false}
                          className={`inline-flex items-center gap-1 hover:text-ink transition-colors ${active ? 'text-ink' : ''}`}
                        >
                          {col.header}
                          {!active
                            ? <ChevronsUpDown className="h-4 w-4 opacity-40" aria-hidden />
                            : params.dir === 'desc'
                              ? <ArrowDown className="h-4 w-4" aria-hidden />
                              : <ArrowUp className="h-4 w-4" aria-hidden />}
                        </Link>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="text-label text-ink">
                {/* O link da linha mora na coluna `primary` (ou na primeira): assim uma
                    coluna de checkbox ou de ações não vira link por acidente. */}
                {rows.map((row, i) => {
                  const href = rowHref?.(row);
                  const linkIndex = Math.max(0, columns.findIndex(c => c.primary));
                  return (
                    <tr
                      key={rowKey(row)}
                      className={`border-b border-line/70 transition-colors hover:bg-accent-soft/70 ${i % 2 === 1 ? 'bg-surface-2/35' : ''}`}
                    >
                      {columns.map((col, ci) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 align-middle ${alignClass(col)} ${col.numeric ? 'num' : ''} ${col.className ?? ''}`}
                        >
                          {/* A primeira coluna vira o link da linha: mantém a linha
                              "clicável" sem aninhar <a> dentro de <a> nas outras células. */}
                          {href && ci === linkIndex ? (
                            <Link href={href} className="block -mx-4 -my-3 px-4 py-3">
                              {col.cell(row)}
                            </Link>
                          ) : col.cell(row)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ————— Mobile: cartões ————— */}
          <ul className="md:hidden divide-y divide-line">
            {rows.map(row => {
              const href = rowHref?.(row);
              const visible = columns.filter(c => !c.hideOnMobile);
              const primary = visible.find(c => c.primary) ?? visible[0];
              const rest = visible.filter(c => c !== primary);
              const content = (
                <>
                  <div className="text-label font-bold text-ink">{primary?.cell(row)}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {rest.map(col => (
                      <div key={col.key} className="min-w-0">
                        <dt className="text-caption font-bold text-muted uppercase tracking-[0.08em]">
                          {col.mobileLabel ?? col.header}
                        </dt>
                        <dd className={`text-caption text-ink truncate ${col.numeric ? 'num' : ''}`}>{col.cell(row)}</dd>
                      </div>
                    ))}
                  </dl>
                </>
              );
              return (
                <li key={rowKey(row)} className="px-4 py-3.5">
                  {href ? <Link href={href} className="block tap">{content}</Link> : content}
                </li>
              );
            })}
          </ul>

          <TablePagination
            total={total}
            params={params}
            basePath={basePath}
            searchParams={searchParams}
            left={footerLeft}
          />
        </>
      )}
    </div>
  );
}

export default ServerTable;
