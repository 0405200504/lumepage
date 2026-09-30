'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, MessageCircle, CalendarDays, Contact, Wallet, Settings2,
  LogOut, X, PanelLeftClose, PanelLeftOpen, Search,
} from 'lucide-react';
import { LumeLogo } from '../ui/LumeLogo';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/StatusPill';

/**
 * NAVEGAÇÃO DO ADMIN — sete destinos, uma barra branca.
 *
 * A barra anterior tinha dezesseis itens em quatro grupos, sobre um bloco vinho
 * cheio. Ninguém precisa de dezesseis lugares para ir: "Acessos" é uma visão de
 * Contas, "Planos" e "Relatórios" são abas do Financeiro, e Logs / Saúde / Avisos /
 * Configurações são o mesmo assunto (Sistema). O que sumiu daqui continua
 * existindo — virou sub-navegação dentro da tela, onde faz sentido.
 *
 * Visual: a mesma barra flutuante do painel da profissional (card branco, raio
 * hero, item ativo em vinho chapado). O admin não tem paleta própria; é o mesmo
 * produto com outra porta.
 */

export const OPEN_ADMIN_NAV_EVENT = 'lume:admin-open-nav';
export const OPEN_ADMIN_SEARCH_EVENT = 'lume:admin-open-search';
const SIDEBAR_COOKIE = 'lume_admin_sidebar';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  /** Rotas irmãs que acendem este item (sub-navegação da área). */
  also?: string[];
}

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Início', icon: LayoutDashboard, also: ['/admin/tasks'] },
  { href: '/admin/professionals', label: 'Contas', icon: Users, also: ['/admin/salons'] },
  { href: '/admin/conversations', label: 'Conversas', icon: MessageCircle },
  { href: '/admin/appointments', label: 'Agendamentos', icon: CalendarDays },
  { href: '/admin/clients', label: 'Clientes', icon: Contact },
  { href: '/admin/finance', label: 'Financeiro', icon: Wallet, also: ['/admin/reports', '/admin/plans', '/admin/subscriptions'] },
  { href: '/admin/system', label: 'Sistema', icon: Settings2, also: ['/admin/logs', '/admin/broadcast', '/admin/settings'] },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === '/admin') return pathname === '/admin' || (item.also ?? []).some(h => pathname === h || pathname.startsWith(`${h}/`));
  return [item.href, ...(item.also ?? [])].some(h => pathname === h || pathname.startsWith(`${h}/`));
}

const openSearch = () => window.dispatchEvent(new Event(OPEN_ADMIN_SEARCH_EVENT));

/** Cookie de um ano, lido pelo servidor na próxima pintura. */
function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

/* ——— Item ——— */

function Item({ item, active, badge, expanded, onNavigate }: {
  item: NavItem; active: boolean; badge: number; expanded: boolean; onNavigate?: () => void;
}) {
  const Icon = item.icon;
  if (!expanded) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : undefined}
        className="group rail-item mx-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        <Icon className="h-5 w-5" />
        {badge > 0 && !active && (
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-wine-700 ring-2 ring-surface" aria-hidden />
        )}
        <span className="rail-tooltip top-1/2 -translate-y-1/2">
          {item.label}{badge > 0 ? ` · ${badge}` : ''}
        </span>
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
      className="rail-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {badge > 0 && (
        <Badge tone={active ? 'neutral' : 'accent'} className={active ? 'bg-white/20 text-white' : ''}>{badge}</Badge>
      )}
    </Link>
  );
}

/* ——— Corpo (serve o rail e a gaveta) ——— */

function NavBody({ pathname, expanded, alertCount, name, email, onNavigate, onLogout }: {
  pathname: string; expanded: boolean; alertCount: number; name: string; email: string;
  onNavigate?: () => void; onLogout: () => void;
}) {
  return (
    <>
      {/* Busca: a porta mais rápida para uma conta, cliente ou agendamento. */}
      <div className={expanded ? 'px-3 pt-1' : 'px-2 pt-1 flex justify-center'}>
        {expanded ? (
          <button
            type="button"
            onClick={() => { openSearch(); onNavigate?.(); }}
            className="w-full h-10 px-3 inline-flex items-center gap-2.5 rounded-chip bg-surface-2 text-n-500 hover:bg-n-150 hover:text-heading transition-ui text-body-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          >
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 text-left">Buscar…</span>
            <kbd className="hidden lg:inline text-micro font-bold text-n-500 bg-surface rounded px-1.5 py-0.5">⌘K</kbd>
          </button>
        ) : (
          <button type="button" onClick={openSearch} aria-label="Buscar (⌘K)" className="group rail-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700">
            <Search className="h-5 w-5" />
            <span className="rail-tooltip top-1/2 -translate-y-1/2">Buscar · ⌘K</span>
          </button>
        )}
      </div>

      <nav
        className={`flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full py-3 ${expanded ? 'px-3 space-y-0.5' : 'px-2 flex flex-col items-center gap-1.5'}`}
        aria-label="Navegação do painel administrativo"
      >
        {ADMIN_NAV.map(item => (
          <Item
            key={item.href}
            item={item}
            active={isActive(pathname, item)}
            badge={item.href === '/admin' ? alertCount : 0}
            expanded={expanded}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {/* Rodapé: quem está logado e a saída. */}
      {expanded ? (
        <div className="shrink-0 px-3 pb-3">
          <div className="flex items-center gap-3 h-14 px-3 rounded-chip bg-surface-2" title={`${name} · ${email}`}>
            <Avatar name={name} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-body-sm font-bold text-heading truncate">{name}</span>
              <span className="block text-caption text-n-500 truncate">Administração</span>
            </span>
            <button
              type="button"
              onClick={onLogout}
              title="Sair do admin"
              aria-label="Sair do admin"
              className="icon-chip h-9 w-9 shrink-0 bg-surface hover:bg-danger-bg hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="shrink-0 px-2 pb-3 flex flex-col items-center gap-1.5">
          <button type="button" onClick={onLogout} aria-label="Sair do admin" className="group rail-item hover:!bg-danger-bg hover:!text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700">
            <LogOut className="h-5 w-5" />
            <span className="rail-tooltip top-1/2 -translate-y-1/2">Sair do admin</span>
          </button>
          <span title={`${name} · ${email}`}><Avatar name={name} size="sm" /></span>
        </div>
      )}
    </>
  );
}

/* ——— Barra ——— */

export function AdminSidebar({ name, email, initialCollapsed, alertCount = 0 }: {
  name: string; email: string; initialCollapsed: boolean; alertCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // O topo da página abre a gaveta no celular (mesmo padrão do painel da profissional).
  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener(OPEN_ADMIN_NAV_EVENT, open);
    return () => window.removeEventListener(OPEN_ADMIN_NAV_EVENT, open);
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [drawerOpen]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    writeCookie(SIDEBAR_COOKIE, next ? '1' : '0');
  };

  const handleLogout = async () => {
    const { adminLogoutAction } = await import('@/app/actions/admin-session');
    await adminLogoutAction();
    router.push('/admin-login');
  };

  const expanded = !collapsed;

  return (
    <>
      {/* ——— Desktop: rail fixo, com faixa reservada no fluxo ——— */}
      <aside className={`hidden lg:block shrink-0 transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)] ${expanded ? 'w-[272px]' : 'w-[100px]'}`} aria-label="Navegação">
        <div
          className={`fixed left-4 top-4 bottom-4 z-40 flex flex-col bg-surface rounded-hero shadow-[var(--shadow-sm)]
            transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)] ${expanded ? 'w-[240px]' : 'w-[68px]'}`}
        >
          <div className={`shrink-0 flex items-center h-16 ${expanded ? 'justify-between px-5' : 'justify-center'}`}>
            <Link href="/admin" aria-label="Lume · painel administrativo" className="flex items-center gap-2 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700">
              <LumeLogo variant="wine" className={expanded ? 'h-5' : 'h-4'} />
              {expanded && <span className="text-micro font-bold uppercase tracking-[0.14em] text-n-400 mt-0.5">Admin</span>}
            </Link>
            {expanded && (
              <button type="button" onClick={toggleCollapsed} aria-label="Recolher menu" title="Recolher menu" className="icon-chip h-9 w-9 bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700">
                <PanelLeftClose className="h-[18px] w-[18px]" />
              </button>
            )}
          </div>
          {!expanded && (
            <button type="button" onClick={toggleCollapsed} aria-label="Expandir menu" title="Expandir menu" className="group rail-item mx-auto -mt-2 mb-1 h-9 w-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700">
              <PanelLeftOpen className="h-[18px] w-[18px]" />
              <span className="rail-tooltip top-1/2 -translate-y-1/2">Expandir menu</span>
            </button>
          )}

          <NavBody pathname={pathname} expanded={expanded} alertCount={alertCount} name={name} email={email} onLogout={handleLogout} />
        </div>
      </aside>

      {/* ——— Celular: gaveta ——— */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 sheet-backdrop" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[280px] max-w-[85vw] h-full bg-surface shadow-[var(--shadow-lg)] flex flex-col animate-slide-right rounded-r-hero">
            <div className="shrink-0 flex items-center justify-between h-16 px-5">
              <Link href="/admin" aria-label="Lume · painel administrativo" className="flex items-center gap-2">
                <LumeLogo variant="wine" className="h-5" />
                <span className="text-micro font-bold uppercase tracking-[0.14em] text-n-400 mt-0.5">Admin</span>
              </Link>
              <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fechar menu" className="icon-chip h-9 w-9">
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavBody pathname={pathname} expanded alertCount={alertCount} name={name} email={email} onNavigate={() => setDrawerOpen(false)} onLogout={handleLogout} />
          </aside>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
