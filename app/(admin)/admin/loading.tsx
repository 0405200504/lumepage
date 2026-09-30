import React from 'react';

/** Esqueleto do painel: cobre /admin e todas as rotas filhas enquanto as consultas rodam. */
export default function AdminLoading() {
  return (
    <div className="flex min-h-screen bg-bg">
      <div className="hidden lg:block w-[272px] shrink-0">
        <div className="fixed left-4 top-4 bottom-4 w-[240px] bg-surface rounded-hero shadow-[var(--shadow-sm)]" aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8" role="status" aria-label="Carregando">
          <div className="pt-7 pb-6 space-y-2">
            <div className="skeleton h-7 w-56" />
            <div className="skeleton h-3 w-80" />
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-28 rounded-surface" />)}
            </div>
            <div className="card p-5 space-y-3">
              <div className="skeleton h-4 w-48" />
              {Array.from({ length: 7 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
            </div>
          </div>
          <span className="sr-only">Carregando o painel…</span>
        </div>
      </div>
    </div>
  );
}
