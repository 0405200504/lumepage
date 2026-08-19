import React from 'react';

/**
 * Esqueleto de carregamento do painel. Cobre /admin e todas as rotas filhas —
 * antes o painel ficava em branco enquanto as consultas rodavam.
 */
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden lg:block w-60 shrink-0 surface-wine" aria-hidden />
      <div className="flex-1 min-w-0">
        <div className="border-b border-line px-6 py-4 space-y-2">
          <div className="skeleton h-3 w-40" />
          <div className="skeleton h-6 w-64" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-4" role="status" aria-label="Carregando">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-[--radius-card]" />)}
          </div>
          <div className="card p-4 space-y-3">
            <div className="skeleton h-4 w-48" />
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-9 w-full" />)}
          </div>
          <span className="sr-only">Carregando o painel…</span>
        </div>
      </div>
    </div>
  );
}
