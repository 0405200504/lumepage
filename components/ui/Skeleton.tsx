import React from 'react';

/** Bloco de carregamento com shimmer (classe .skeleton no globals). */
export const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`skeleton ${className}`} aria-hidden />
);

/** Esqueleto pronto para uma grade de KPIs. */
export const KpiSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="card p-4 space-y-3">
        <Skeleton className="h-8 w-8 rounded-xl" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-24" />
      </div>
    ))}
  </div>
);

/** Esqueleto para tabelas. */
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => (
  <div className="card p-5 space-y-3">
    <Skeleton className="h-5 w-40" />
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} className="h-9 w-full" />
    ))}
  </div>
);

export default Skeleton;
