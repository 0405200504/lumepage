import React from 'react';
import Link from 'next/link';

/**
 * PRIMITIVAS DO ADMIN
 * -------------------
 * Três peças que aparecem em toda tela. O que elas deliberadamente NÃO têm:
 *
 *  - ícone Lucide dentro de um quadradinho colorido no topo do cartão. Era a marca
 *    registrada do visual genérico e estava em todos os KPIs do painel. Aqui o lugar
 *    do ícone é ocupado por um rótulo tipográfico — ou por nada.
 *  - sombra. A estrutura vem do filete de 1px.
 *  - degradê. Em lugar nenhum.
 *
 * Hierarquia: rótulo 10,5px em caixa-alta com tracking aberto · número 32px tabular ·
 * nota 11px em tinta fraca. Tamanho e espaço fazem o trabalho que a cor não deve fazer.
 */

export function StatCard({ label, value, note, href, accent = false, className = '' }: {
  label: string;
  value: string;
  /** Linha secundária: comparação, contexto, unidade. */
  note?: React.ReactNode;
  href?: string;
  /** Um número por tela pode receber o bordô. Só um. */
  accent?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <span className="admin-eyebrow block">{label}</span>
      <span className={`admin-figure block mt-2.5 ${accent ? 'text-[color:var(--accent)]' : ''}`}>{value}</span>
      {note && <span className="block mt-1.5 text-[11px] text-[color:var(--ink-muted)] leading-snug">{note}</span>}
    </>
  );

  const shell = `border border-[color:var(--rule-subtle)] rounded-[8px] bg-[color:var(--surface-card)] px-3.5 py-3 ${className}`;

  return href
    ? <Link href={href} className={`${shell} block hover:border-[color:var(--rule-strong)] transition-colors`}>{body}</Link>
    : <div className={shell}>{body}</div>;
}

/**
 * Cabeçalho de seção numerado ("01 — Precisa da sua atenção").
 * A numeração é o que dá ao painel cara de documento operacional em vez de
 * dashboard genérico: as seções passam a ter ordem declarada, não só posição.
 */
export function SectionHeader({ index, title, note, action }: {
  index?: string;
  title: string;
  note?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3 pb-2 border-b border-[color:var(--rule-subtle)]">
      {index && <span className="admin-section-index shrink-0">{index} —</span>}
      <h2 className="text-[15px] font-semibold text-[color:var(--ink)] leading-none">{title}</h2>
      {note && <span className="text-[11px] text-[color:var(--ink-muted)]">{note}</span>}
      {action && <span className="ml-auto">{action}</span>}
    </div>
  );
}

/**
 * Estado vazio: uma frase e uma ação. Nunca um ícone gigante centralizado —
 * o ícone não diz o que fazer, a frase diz.
 */
export function EmptyLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <p className="border border-[color:var(--rule-subtle)] rounded-[8px] px-4 py-3.5 text-[13px] text-[color:var(--ink-muted)] flex flex-wrap items-center gap-x-2 gap-y-1">
      <span>{children}</span>
      {action}
    </p>
  );
}

/** Linha de dado sem cartão: filete no topo, densidade alta. */
export function RuleList({ children }: { children: React.ReactNode }) {
  return <ul className="border-t border-[color:var(--rule-subtle)]">{children}</ul>;
}

export function RuleItem({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = 'flex flex-wrap items-center gap-x-3 gap-y-1 py-2 border-b border-[color:var(--rule-subtle)] text-[13px]';
  return href
    ? <li><Link href={href} className={`${cls} hover:text-[color:var(--accent)] transition-colors`}>{children}</Link></li>
    : <li className={cls}>{children}</li>;
}
