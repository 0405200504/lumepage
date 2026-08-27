import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Esqueleto da área de conteúdo — a casca (rail, topbar, tab bar) fica de pé.
 *
 * As alturas espelham o bento da Início: hero 268px, KPIs 132px, blocos de
 * baixo 320px. É isso que mantém o CLS em zero — quando os dados chegam,
 * nada salta de lugar. Mudou a altura de um card lá, mude aqui também.
 */
export default function Loading() {
  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-11 w-64 rounded-control" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        <div className="lg:col-span-7 card p-6 sm:p-8 min-h-[268px] flex flex-col">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-12 w-56 mt-3" />
          <Skeleton className="h-4 w-48 mt-3" />
          <Skeleton className="h-[110px] w-full mt-auto rounded-chip" />
        </div>

        <div className="lg:col-span-5 lg:row-span-2 card p-5 sm:p-6 min-h-[268px]">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-3 w-28 mt-2" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-4 h-14">
                <Skeleton className="h-3 w-10 mt-3" />
                <Skeleton className="h-2.5 w-2.5 rounded-full mt-3" />
                <div className="flex-1 space-y-2 pt-1.5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 sm:p-6 min-h-[132px]">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20 mt-3" />
              <Skeleton className="h-3 w-16 mt-2" />
            </div>
          ))}
        </div>

        <div className="lg:col-span-7 card p-5 sm:p-6 min-h-[320px] space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] w-full" />
          ))}
        </div>

        <div className="lg:col-span-5 card p-5 sm:p-6 min-h-[320px] space-y-3">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[52px] w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
