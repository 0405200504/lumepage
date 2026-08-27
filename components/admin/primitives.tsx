import React from 'react';
import Link from 'next/link';

/**
 * PRIMITIVAS DO ADMIN
 * -------------------
 * Mesmo vocabulário visual dos cartões do painel da profissional
 * (components/dashboard/DashboardOverview.tsx): `card-elevated` arredondado, ícone
 * dentro de um quadradinho tintado, número grande em Manrope black com num
 * e rótulo em cinza abaixo. O admin não tem um sistema visual próprio — é o mesmo
 * produto, e um KPI daqui deve ser reconhecível como um KPI de lá.
 */

/** Tintas do ícone — as mesmas quatro usadas nos KPIs do painel da profissional. */
export type StatTint = 'wine' | 'indigo' | 'amber' | 'emerald';

const TINT: Record<StatTint, string> = {
  wine: 'bg-wine-700/10 text-wine-700',
  indigo: 'bg-info/10 text-info',
  amber: 'bg-warning/10 text-warning',
  emerald: 'bg-success/10 text-success',
};

export function StatCard({ label, value, note, href, icon, tint = 'wine', className = '' }: {
  label: string;
  value: string;
  /** Linha secundária: comparação, contexto, unidade. */
  note?: React.ReactNode;
  href?: string;
  icon?: React.ReactNode;
  tint?: StatTint;
  className?: string;
}) {
  const body = (
    <>
      {icon && (
        <span className={`inline-flex items-center justify-center h-9 w-9 rounded-xl ${TINT[tint]}`}>
          {icon}
        </span>
      )}
      <p className={`text-h2 sm:text-h2 font-semibold text-ink leading-none num ${icon ? 'mt-4' : ''}`}>{value}</p>
      <span className="text-caption font-bold text-n-600 mt-1.5 block">{label}</span>
      {note && <span className="block text-caption text-n-600 font-medium mt-0.5">{note}</span>}
    </>
  );

  const shell = `card-elevated p-4 sm:p-5 rounded-3xl ${className}`;

  return href
    ? <Link href={href} className={`${shell} block hover:-translate-y-0.5`}>{body}</Link>
    : <div className={shell}>{body}</div>;
}

/** Cabeçalho de seção — mesmo peso dos títulos internos do painel da profissional. */
export function SectionHeader({ title, note, action, icon }: {
  title: string;
  note?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-3">
      {icon && <span className="text-n-600 shrink-0">{icon}</span>}
      <h2 className="text-label font-bold text-ink">{title}</h2>
      {note && <span className="text-caption text-n-600">{note}</span>}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

/** Estado vazio de uma linha só, com a ação ao lado. */
export function EmptyLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <p className="card px-4 py-3.5 text-caption text-n-600 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{children}</span>
      {action}
    </p>
  );
}

/** Lista secundária dentro de um cartão. */
export function RuleList({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-line">{children}</ul>;
}

export function RuleItem({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = 'flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-caption';
  return href
    ? <li><Link href={href} className={`${cls} hover:bg-surface-2 transition-colors`}>{children}</Link></li>
    : <li className={cls}>{children}</li>;
}
