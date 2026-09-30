'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Sub-navegação de uma área do admin (Contas, Financeiro, Sistema).
 *
 * As telas que saíram do menu lateral não sumiram: viraram abas em pílula no
 * topo da área, no mesmo desenho do segmented do painel da profissional. Cada
 * aba é uma rota de verdade — o link continua compartilhável e o "voltar" do
 * navegador funciona.
 */
export interface SubNavItem { href: string; label: string; count?: number }

export function SubNav({ items, className = '' }: { items: SubNavItem[]; className?: string }) {
  const pathname = usePathname();
  const active = items
    .filter(i => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <nav className={`segmented ${className}`} aria-label="Seções da área">
      {items.map(item => {
        const on = item.href === active;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={on ? 'page' : undefined}
            data-active={on ? 'true' : undefined}
            className="segmented-link"
          >
            {item.label}
            {item.count !== undefined && item.count > 0 && (
              <span className={`num text-micro font-bold rounded-full px-1.5 py-px ${on ? 'bg-white/20' : 'bg-surface text-n-600'}`}>{item.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

/** Abas dentro de uma tela (detalhe da conta): mesma pílula, com `?tab=` na URL. */
export function TabNav({ items, active, hrefFor }: {
  items: { key: string; label: string }[];
  active: string;
  hrefFor: (key: string) => string;
}) {
  return (
    <nav className="segmented" aria-label="Seções">
      {items.map(t => (
        <Link
          key={t.key}
          href={hrefFor(t.key)}
          scroll={false}
          aria-current={active === t.key ? 'page' : undefined}
          data-active={active === t.key ? 'true' : undefined}
          className="segmented-link"
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export const CONTAS_NAV: SubNavItem[] = [
  { href: '/admin/professionals', label: 'Todas as contas' },
  { href: '/admin/professionals/acessos', label: 'Acessos' },
  { href: '/admin/salons', label: 'Grupos' },
];

export const FINANCEIRO_NAV: SubNavItem[] = [
  { href: '/admin/finance', label: 'Receita' },
  { href: '/admin/reports', label: 'Relatórios' },
  { href: '/admin/plans', label: 'Planos' },
];

export const SISTEMA_NAV: SubNavItem[] = [
  { href: '/admin/system', label: 'Saúde' },
  { href: '/admin/logs', label: 'Auditoria' },
  { href: '/admin/broadcast', label: 'Avisos' },
  { href: '/admin/settings', label: 'Configurações' },
];

export default SubNav;
