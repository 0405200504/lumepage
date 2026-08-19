'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, ShieldAlert, Bell } from 'lucide-react';
import { AdminGlobalSearch } from './AdminGlobalSearch';
import { ThemeToggle } from './ThemeToggle';

/**
 * Barra superior do admin.
 *
 * Mudanças em relação ao Header compartilhado: ganha breadcrumb e busca global, e
 * perde o botão "Atualizar" — dado que só se atualiza no clique é dado velho por
 * padrão. As mutações passam a revalidar a rota (revalidatePath/router.refresh).
 *
 * O sino de alertas é alimentado por lib/admin/alerts.ts (FASE 3) — só aparece com
 * contagem real; sino sem fonte de dado seria enfeite.
 */

const SEGMENT_LABEL: Record<string, string> = {
  admin: 'Visão Geral',
  professionals: 'Profissionais',
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
}

export function AdminTopbar({ title, subtitle, userName, userEmail, actions, alertCount = 0, theme = 'system' }: Props) {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname, title);

  return (
    <header className="sticky top-0 z-30 glass border-b border-line select-none">
      <div className="px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-4">
        <nav aria-label="Trilha de navegação" className="min-w-0 flex-1 pl-12 lg:pl-0">
          <ol className="flex items-center gap-1 text-[11px] font-semibold text-muted">
            {crumbs.map((crumb, i) => {
              const last = i === crumbs.length - 1;
              return (
                <li key={crumb.href} className="flex items-center gap-1 min-w-0">
                  {i > 0 && <ChevronRight className="h-3 w-3 text-faint shrink-0" aria-hidden />}
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

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:block"><AdminGlobalSearch /></div>

          <ThemeToggle initial={theme} />

          <Link
            href="/admin/alerts"
            aria-label={alertCount > 0 ? `${alertCount} alertas` : 'Alertas'}
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-xl border border-line bg-surface text-muted hover:text-ink hover:bg-surface-2 transition-colors"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[color:var(--color-bad)] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                {alertCount > 99 ? '99+' : alertCount}
              </span>
            )}
          </Link>
          <div
            className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-1.5"
            title={`${userName} · ${userEmail}`}
          >
            <span className="h-7 w-7 rounded-lg bg-accent-soft text-forest flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" aria-hidden />
            </span>
            <span className="hidden xl:block leading-tight">
              <span className="block text-[11px] font-bold text-ink">{userName}</span>
              <span className="block text-[10px] text-muted truncate max-w-[150px]">{userEmail}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pb-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black text-heading tracking-tight leading-tight truncate">{title}</h1>
          {subtitle && <p className="hidden sm:block text-xs text-muted mt-0.5 max-w-3xl">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 no-print">{actions}</div>}
      </div>
    </header>
  );
}

export default AdminTopbar;
