'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Bell } from 'lucide-react';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { ThemeToggle } from './ThemeToggle';
import { DensityToggle } from './DensityToggle';

/**
 * Barra superior do admin.
 *
 * DEFEITO CORRIGIDO NESTA RODADA: a faixa herdava `.glass`, que pintava de carvão
 * escuro mesmo no tema claro, enquanto os tokens de texto continuavam os do claro.
 * Título e breadcrumb ficavam cinza-escuro sobre cinza-escuro (~2:1) — o segundo
 * item do breadcrumb sumia por completo. Agora a faixa acompanha o fundo da página
 * (areia) e se separa do conteúdo por filete, não por cor.
 *
 * A hierarquia é feita por tamanho e espaço, não por caixa: rótulo pequeno em
 * caixa-alta, título grande, subtítulo em tinta fraca — sem ícone em quadradinho.
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
  const initials = userName.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-[color:var(--surface-page)] border-b border-[color:var(--rule-strong)] select-none">
      {/* Linha 1 — navegação e ferramentas. Filete separa da linha do título. */}
      <div className="px-4 sm:px-6 h-11 flex items-center gap-4 border-b border-[color:var(--rule-subtle)]">
        <nav aria-label="Trilha de navegação" className="min-w-0 flex-1 pl-12 lg:pl-0">
          <ol className="flex items-center gap-1.5 text-[11px] font-medium">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-[color:var(--ink-faint)] shrink-0" aria-hidden />}
                  {last ? (
                    <span className="text-[color:var(--ink)] font-semibold truncate" aria-current="page">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors truncate">
                      {crumb.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden md:block"><AdminGlobalSearch /></div>

          <DensityToggle initial={density} />
          <ThemeToggle initial={theme} />

          <Link
            href="/admin/alerts"
            aria-label={alertCount > 0 ? `${alertCount} alertas` : 'Alertas'}
            className="relative inline-flex items-center justify-center h-8 w-8 rounded-[4px] border border-line text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-[2px] bg-[color:var(--bad-ink)] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </Link>

          {/* Identidade sem ícone em quadradinho colorido: iniciais em filete. */}
          <span
            className="flex items-center gap-2 h-8 pl-1 pr-2.5 rounded-[4px] border border-line"
            title={`${userName} · ${userEmail}`}
          >
            <span className="h-6 w-6 rounded-[2px] bg-[color:var(--accent)] text-[color:var(--ink-inverse)] text-[10px] font-bold flex items-center justify-center shrink-0">
              {initials || 'LU'}
            </span>
            <span className="hidden xl:block text-[11px] font-medium text-ink truncate max-w-[140px]">{userEmail}</span>
          </span>
        </div>
      </div>

      {/* Linha 2 — título da tela. 20px/600 contra 10.5px de rótulo: hierarquia por
          tamanho, não por cor nem por caixa. */}
      <div className="px-4 sm:px-6 py-3.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[20px] font-semibold text-[color:var(--ink)] leading-tight truncate">{title}</h1>
          {subtitle && <p className="hidden sm:block text-[13px] text-[color:var(--ink-muted)] mt-1 max-w-3xl leading-snug">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 no-print">{actions}</div>}
      </div>
    </header>
  );
}

export default AdminTopbar;
