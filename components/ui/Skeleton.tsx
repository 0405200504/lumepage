import React from 'react';

/**
 * Esqueleto, nunca spinner.
 *
 * A regra que importa: cada esqueleto tem a MESMA altura do conteúdo que
 * vai substituir. É o que mantém o CLS em zero — a tela não pula quando os
 * dados chegam. Se mudar a altura de um card, mude a do esqueleto junto.
 */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden />
);

/** Grade de StatCard: mesmo padding (16/20), mesmo raio, mesma altura.
 *  Sem o quadrado do ícone — o StatCard não desenha mais ícone. */
export const KpiSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 sm:p-5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-7 w-28 mt-3" />
        <Skeleton className="h-3 w-20 mt-2.5" />
      </div>
    ))}
  </div>
);

/** Hero do faturamento — 2 linhas de grade no desktop. */
export const HeroSkeleton: React.FC = () => (
  <div className="card p-6 sm:p-8 min-h-[268px] flex flex-col">
    <Skeleton className="h-3 w-32" />
    <Skeleton className="h-12 w-56 mt-4" />
    <Skeleton className="h-3 w-40 mt-3" />
    <Skeleton className="h-24 w-full mt-auto rounded-badge" />
  </div>
);

/** Lista cronológica (atendimentos do dia): linhas de 64px. */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 h-16">
        <Skeleton className="h-10 w-12 rounded-badge" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-4 w-20 rounded-badge" />
      </div>
    ))}
  </div>
);

/** Tabela com linhas de 44px — a mesma altura da linha de `.table-tech`. */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="card overflow-hidden">
    <div className="h-10 border-b border-line-strong flex items-center px-3">
      <Skeleton className="h-2.5 w-28" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-11 border-b border-line last:border-b-0 flex items-center px-3">
        <Skeleton className="h-3 w-full" />
      </div>
    ))}
  </div>
);

export default Skeleton;
