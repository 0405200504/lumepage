'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ShieldAlert, Bell } from 'lucide-react';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { ThemeToggle } from './ThemeToggle';
import { DensityToggle } from './DensityToggle';

/**
 * Barra superior do admin.
 *
 * Mesmo vocabulário visual do <Header> do painel da profissional: faixa `glass`,
 * título em Manrope black, subtítulo em cinza, e o chip de identidade em cartão
 * arredondado com sombra suave. O que o admin tem a mais é o breadcrumb e a busca
 * global — navegação, não decoração.
 *
 * DEFEITO CORRIGIDO NESTA RODADA: `.glass` pintava de carvão escuro mesmo no tema
 * claro (a regra `[data-theme='system'] .glass` estava fora do @media de
 * prefers-color-scheme), enquanto os tokens de texto continuavam os do tema claro.
 * Título e breadcrumb ficavam cinza-escuro sobre cinza-escuro (~2:1). O conserto
 * está em globals.css; aqui a faixa volta a ser a mesma do resto do produto.
 */

const SEGMENT_LABEL: Record<string, string> = {
  admin: 'Visão Geral',
  professionals: 'Profissionais',
  acessos: 'Acessos',
  salons: 'Grupos',
  appointments: 'Agendamentos',
  clients: 'Clientes',
  finance: 'Financeiro',
  reports: 'Relatórios',
  plans: 'Planos',
  conversations: 'Conversas',
  alerts: 'Alertas',
  logs: 'Logs',
  system: 'Saúde do sistema',
  broadcast: 'Avisos',
  settings: 'Configurações',
  new: 'Nova',
};

interface Crumb { label: string; href: string }

function buildCrumbs(pathname: string, currentLabel?: string): Crumb[] {
  const parts = pathname.split('/').filter(Boolean); // ['admin', 'professionals', '<id>']
  const crumbs: Crumb[] = [{ label: 'Admin', href: '/admin' }];

  let href = '/admin';
  for (const part of parts.slice(1)) {
    href += `/${part}`;
    const known = SEGMENT_LABEL[part];
    // Segmento dinâmico (id): usa o título da página, que sabe de quem se trata.
    crumbs.push({ label: known ?? currentLabel ?? 'Detalhe', href });
  }
  return crumbs;
}

interface Props {
  title: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  /** Ações da tela (botão primário, exportar…) alinhadas à direita do título. */
  actions?: React.ReactNode;
  /** Itens pedindo atenção agora (trial vencendo + conversas paradas). */
  alertCount?: number;
  theme?: 'light' | 'dark' | 'system';
  density?: 'comfortable' | 'compact';
}

export function AdminTopbar({
  title, subtitle, userName, userEmail, actions,
  alertCount = 0, theme = 'system', density = 'comfortable',
}: Props) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname, title);

  return (
    <header className="sticky top-0 z-30 glass hairline-b select-none">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4">
        <nav aria-label="Trilha de navegação" className="min-w-0 flex-1 pl-12 lg:pl-0">
          <ol className="flex items-center gap-1 text-caption font-bold text-n-600">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-n-600/70 shrink-0" aria-hidden />}
                  {last ? (
                    <span className="text-ink truncate" aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-ink transition-colors truncate">{crumb.label}</Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden md:block"><AdminGlobalSearch /></div>

          <DensityToggle initial={density} />
          <ThemeToggle initial={theme} />

          <Link
            href="/admin/alerts"
            aria-label={alertCount > 0 ? `${alertCount} alertas` : 'Alertas'}
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl bg-surface border border-n-200 text-wine-700 shadow-soft hover:bg-white hover:border-wine-700/20 hover:shadow-md hover:text-wine-700 transition-ui"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-white text-caption font-bold flex items-center justify-center num">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </Link>

          {/* Mesmo chip de identidade do painel da profissional. */}
          <div
            className="flex items-center gap-0 sm:gap-2.5 shrink-0 sm:bg-surface sm:border sm:border-n-200 rounded-full sm:rounded-2xl p-0 sm:p-2 sm:shadow-soft"
            title={`${userName} · ${userEmail}`}
          >
            <span className="h-9 w-9 bg-gradient-to-br from-wine-700/12 to-wine-500/8 ring-1 ring-wine-700/10 text-wine-700 rounded-full sm:rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5" aria-hidden />
            </span>
            <span className="hidden xl:block leading-tight text-left">
              <span className="block text-caption font-bold text-ink">{userName}</span>
              <span className="block text-caption text-n-600 truncate max-w-[150px]">{userEmail}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-h2 font-semibold text-ink tracking-tight leading-tight truncate">{title}</h1>
          {subtitle && <p className="hidden sm:block text-caption text-n-600 mt-1 max-w-2xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 no-print">{actions}</div>}
      </div>
    </header>
  );
}

export default AdminTopbar;
