import React from 'react';
import Link from 'next/link';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { pct } from '@/lib/format';
import { cx } from './ui';

/**
 * PRIMITIVAS DO ADMIN
 * -------------------
 * O mesmo vocabulário do painel da profissional: card branco sem borda, número
 * grande em destaque, rótulo em cinza, uma peça vinho por tela. As tintas
 * coloridas por ícone (índigo, âmbar, esmeralda) saíram — cor aqui é estado ou
 * marca, nunca decoração.
 */

/* ——— KPI ——— */

export function StatCard({ label, value, note, href, accent = false, icon, className = '' }: {
  label: string;
  value: string;
  /** Linha secundária: comparação, contexto, unidade. */
  note?: React.ReactNode;
  href?: string;
  /** O número da tela — card vinho. Um por tela. */
  accent?: boolean;
  icon?: React.ReactNode;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <span className={cx('text-caption font-semibold', accent ? 'text-white/70' : 'text-n-500')}>{label}</span>
        {icon && <span className={cx('shrink-0 [&>svg]:h-4 [&>svg]:w-4', accent ? 'text-white/60' : 'text-n-400')}>{icon}</span>}
      </div>
      <p className={cx('num leading-none tracking-[-0.03em] mt-3', accent ? 'text-white text-h1' : 'text-heading text-h2')}>{value}</p>
      {note && <div className={cx('text-caption mt-2.5 flex flex-wrap items-center gap-1.5', accent ? 'text-white/75' : 'text-n-500')}>{note}</div>}
    </>
  );

  const shell = cx(
    'block p-5 rounded-surface',
    accent ? 'surface-wine text-white shadow-[var(--shadow-wine)]' : 'card',
    href && 'card-interactive',
    className,
  );

  return href ? <Link href={href} className={shell}>{body}</Link> : <div className={shell}>{body}</div>;
}

/** Variação percentual em selo — verde sobe, laranja cai. */
export function Trend({ current, previous, suffix = 'vs período anterior', onDark = false }: {
  current: number; previous: number; suffix?: string; onDark?: boolean;
}) {
  if (!previous) return null;
  const p = ((current - previous) / previous) * 100;
  const up = p >= 0;
  return (
    <>
      <span className={cx(
        'inline-flex items-center gap-0.5 h-[22px] px-1.5 rounded-full text-micro font-bold num',
        onDark ? 'bg-white/15 text-white' : up ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger',
      )}>
        {up ? <ArrowUpRight className="h-3 w-3" aria-hidden /> : <ArrowDownRight className="h-3 w-3" aria-hidden />}
        {pct(Math.abs(p), 0)}
      </span>
      <span>{suffix}</span>
    </>
  );
}

/**
 * Faixa de números encostados, separados por divisória — a linha "Atendimentos
 * hoje · Pendentes · Ticket médio" das referências. Para resumos de tela de
 * lista, onde quatro cards soltos pesavam demais.
 */
export interface StatStripItem { label: string; value: string; note?: React.ReactNode; href?: string; tone?: 'default' | 'warn' | 'bad' | 'accent' }

const STRIP_COLS = { 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5' } as const;

export function StatStrip({ items, cols = 4, className = '' }: { items: StatStripItem[]; cols?: keyof typeof STRIP_COLS; className?: string }) {
  const TONE: Record<NonNullable<StatStripItem['tone']>, string> = {
    default: 'text-heading', warn: 'text-warning', bad: 'text-danger', accent: 'text-wine-700',
  };
  return (
    <div className={cx('card grid grid-cols-2', STRIP_COLS[cols], 'lg:[&>*:not(:first-child)]:border-l lg:[&>*]:border-line [&>*:nth-child(n+3)]:border-t lg:[&>*:nth-child(n+3)]:border-t-0', className)}>
      {items.map(item => {
        const inner = (
          <>
            <span className="block text-caption font-semibold text-n-500 truncate">{item.label}</span>
            <span className={cx('block num text-h3 leading-none mt-2 tracking-[-0.02em]', TONE[item.tone ?? 'default'])}>{item.value}</span>
            {item.note && <span className="block text-caption text-n-500 mt-1.5 truncate">{item.note}</span>}
          </>
        );
        const cls = 'block px-5 py-4 min-w-0';
        return item.href
          ? <Link key={item.label} href={item.href} className={cx(cls, 'hover:bg-n-25 transition-ui first:rounded-l-surface last:rounded-r-surface')}>{inner}</Link>
          : <div key={item.label} className={cls}>{inner}</div>;
      })}
    </div>
  );
}

/* ——— Estrutura ——— */

/** Cabeçalho de seção fora de card. */
export function SectionHeader({ title, note, action, icon }: {
  title: string; note?: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3 px-1">
      {icon && <span className="text-n-500 shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <h2 className="text-h3 text-heading">{title}</h2>
      {note && <span className="text-caption text-n-500">{note}</span>}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

/** Card com cabeçalho: título, nota e ação à direita. `flush` cola o conteúdo nas bordas (listas, tabelas). */
export function Panel({ title, note, action, children, flush = false, className = '' }: {
  title: React.ReactNode; note?: React.ReactNode; action?: React.ReactNode;
  children: React.ReactNode; flush?: boolean; className?: string;
}) {
  return (
    <section className={cx('card overflow-hidden', className)}>
      <header className="px-5 pt-5 pb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-h3 text-heading">{title}</h2>
          {note && <p className="text-caption text-n-500 mt-0.5">{note}</p>}
        </div>
        {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
      </header>
      <div className={flush ? '' : 'px-5 pb-5'}>{children}</div>
    </section>
  );
}

/** Aviso em linha: uma frase com o tom certo, sem virar card gigante. */
export function Notice({ tone = 'info', icon, children, action, className = '' }: {
  tone?: 'info' | 'warn' | 'bad' | 'ok'; icon?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  const TONE = {
    info: 'bg-surface-2 text-n-700',
    warn: 'bg-warning-bg text-warning',
    bad: 'bg-danger-bg text-danger',
    ok: 'bg-success-bg text-success',
  } as const;
  return (
    <div className={cx('rounded-chip px-4 py-3 text-caption font-medium flex flex-wrap items-center gap-x-3 gap-y-1.5', TONE[tone], className)}>
      {icon && <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <div className="flex-1 min-w-0 leading-relaxed">{children}</div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Estado vazio de uma tela ou card. */
export function EmptyState({ icon, title, description, action, className = '' }: {
  icon?: React.ReactNode; title: string; description?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cx('py-14 px-6 flex flex-col items-center text-center', className)}>
      {icon && <div className="mb-3 text-n-400 [&>svg]:h-7 [&>svg]:w-7">{icon}</div>}
      <h3 className="text-label text-heading">{title}</h3>
      {description && <p className="mt-1 text-caption text-n-500 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Compat: estado vazio de uma linha só. */
export function EmptyLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <Notice action={action}>{children}</Notice>;
}

/* ——— Listas dentro de card ——— */

export function RuleList({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <ul className={cx('divide-y divide-line', className)}>{children}</ul>;
}

export function RuleItem({ children, href, className = '' }: { children: React.ReactNode; href?: string; className?: string }) {
  const cls = cx('flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-body-sm', className);
  return href
    ? <li><Link href={href} className={cx(cls, 'hover:bg-n-25 transition-ui')}>{children}</Link></li>
    : <li className={cls}>{children}</li>;
}

/** Linha "rótulo · valor" para blocos de detalhe. */
export function KeyValue({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-line last:border-0 text-body-sm">
      <dt className="text-n-500 shrink-0">{label}</dt>
      <dd className="text-heading font-medium text-right min-w-0 break-words">{children}</dd>
    </div>
  );
}
