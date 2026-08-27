'use client';

import React, { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export interface TechColumn<T> {
  key: string;
  header: string;
  /** Coluna numérica: alinha à direita e entra em mono com tabular-nums. */
  num?: boolean;
  cell: (row: T) => React.ReactNode;
  /** Omita para tornar a coluna não-ordenável. */
  sortValue?: (row: T) => string | number;
  /** Esconde abaixo de sm — a coluna acessória some antes da essencial. */
  hideOnMobile?: boolean;
  width?: string;
  className?: string;
}

interface TechTableProps<T> {
  columns: TechColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  /** Renderizado no lugar do corpo quando não há linha nenhuma. */
  empty?: React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Coluna de ações à direita, revelada no hover da linha. */
  actions?: (row: T) => React.ReactNode;
  /**
   * Abaixo de `sm`, a linha vira um item de LISTA em vez de rolar na
   * horizontal. Passe o conteúdo da linha compacta aqui.
   *
   * Sem isso, uma tabela de cinco colunas em 375px mostra só a primeira e
   * esconde as outras quatro atrás de um scroll horizontal que nada anuncia
   * — a profissional vê a lista de nomes e não descobre que existe preço.
   * A lista NÃO é o card antigo de volta: continua sendo uma linha densa,
   * com os dados em mono numa segunda linha.
   */
  mobileRow?: (row: T) => React.ReactNode;
  className?: string;
}

/**
 * ARQUÉTIPO 2 · TABELA DENSA.
 *
 * O erro que esta tabela existe para corrigir: 17 serviços renderizados
 * como 17 cartazes empilhados de raio 24, cada um com dois botões
 * flutuantes por cima da descrição. Dezessete linhas de dados desenhadas
 * como dezessete pôsteres — o usuário rolava uma tela e meia para ver o
 * que cabe em 750px de tabela.
 *
 * As regras da linha: 44px de altura (que é também o alvo mínimo de toque),
 * cabeçalho em mono 10px sticky, divisória de PONTA A PONTA, numérico à
 * direita com dígito de largura fixa, e a ação aparecendo só na linha sob
 * o cursor. Em ponteiro grosso (toque) as ações ficam sempre visíveis,
 * porque lá não existe hover.
 */
export function TechTable<T>({
  columns, rows, rowKey, initialSort, empty, onRowClick, actions, mobileRow, className = '',
}: TechTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | null>(initialSort ?? null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = col.sortValue!(a);
      const vb = col.sortValue!(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb), 'pt-BR') * dir;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) =>
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });

  if (rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <>
      {/* Lista densa — só abaixo de sm, e só quando a tela oferece um layout
          compacto. Sem `mobileRow` o comportamento antigo (scroll) continua. */}
      {mobileRow && (
        <ul className={`sm:hidden ${className}`}>
          {sorted.map((row) => (
            <li key={rowKey(row)} className="border-b border-line last:border-b-0">
              <div
                className={`px-4 py-3 min-h-[56px] flex items-center gap-3 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                <div className="min-w-0 flex-1">{mobileRow(row)}</div>
                {actions && (
                  /* Em ponteiro grosso não existe hover: a ação fica visível. */
                  <div className="shrink-0 flex items-center gap-1">{actions(row)}</div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

    <div className={`overflow-x-auto scroll-touch ${mobileRow ? 'hidden sm:block' : ''} ${className}`}>
      <table className="table-tech">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortable = !!col.sortValue;
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={[
                    col.num ? 'text-right' : '',
                    col.hideOnMobile ? 'hidden sm:table-cell' : '',
                  ].join(' ')}
                  aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                >
                  {sortable ? (
                    /* Na coluna numérica o botão ocupa a largura toda e joga o
                       conteúdo para a direita: sem isso o rótulo do cabeçalho
                       fica solto no meio da coluna enquanto os números estão
                       alinhados na borda, e a coluna perde o prumo.
                       ⚠️ Com `flex-row-reverse` o eixo principal inverte: quem
                       empurra para a DIREITA é `justify-start`, não `justify-end`. */
                    <button
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 transition-ui hover:text-ink ${
                        active ? 'text-ink' : ''
                      } ${col.num ? 'w-full flex-row-reverse justify-start' : ''}`}
                    >
                      {col.header}
                      {!active ? (
                        <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden />
                      ) : sort!.dir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      )}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
            {actions && <th className="w-px" aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={onRowClick ? 'cursor-pointer' : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={[
                    col.num ? 'col-num' : '',
                    col.hideOnMobile ? 'hidden sm:table-cell' : '',
                    col.className ?? '',
                  ].join(' ')}
                >
                  {col.cell(row)}
                </td>
              ))}
              {actions && (
                <td className="text-right whitespace-nowrap">
                  {/* Em toque não há hover: a ação fica visível sempre.
                      `row-actions` só ganha opacity 0 dentro da media query
                      de ponteiro fino, lá em globals.css. */}
                  <span className="row-actions inline-flex items-center gap-1">
                    {actions(row)}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}

export default TechTable;
