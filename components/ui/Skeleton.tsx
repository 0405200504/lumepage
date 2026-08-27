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

/** Grade de StatCard: mesmo padding (20/24), mesmo raio, mesma altura. */
export const KpiSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-10 rounded-control" />
        </div>
        <Skeleton className="h-8 w-28 mt-3" />
        <Skeleton className="h-3 w-20 mt-2" />
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
    <Skeleton className="h-24 w-full mt-auto rounded-chip" />
  </div>
);

/** Lista cronológica (atendimentos do dia): linhas de 64px. */
export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 h-16">
        <Skeleton className="h-10 w-12 rounded-chip" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

/** Tabela com linhas de 52px — a mesma altura da tabela real. */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="card p-5 sm:p-6 space-y-3">
    <Skeleton className="h-5 w-40" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-[52px] w-full" />
    ))}
  </div>
);

export default Skeleton;
