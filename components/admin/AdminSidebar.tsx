'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Store, CalendarDays, UserCircle, Wallet, BarChart3,
  LogOut, Menu, X, PanelLeftClose, PanelLeftOpen, CreditCard, MessageCircle,
  ScrollText, Settings, Activity, Megaphone, Bell, KeyRound,
} from 'lucide-react';
import { LumeLogo } from '../ui/LumeLogo';

/**
 * Navegação do painel administrativo.
 *
 * Antes o admin usava a mesma barra da profissional: um trilho só de ícones, sem
 * rótulo e sem tooltip, com sete símbolos parecidos entre si. Aqui os itens têm nome,
 * vêm agrupados por área e o estado recolhido é escolha explícita (e fica gravada em
 * cookie, para o servidor já renderizar na largura certa e não haver "pulo" na tela).
 *
 * Os grupos existem desde já para receberem os itens das próximas fases (Conversas,
 * Logs, Sistema, Configurações). Item que ainda não tem tela não entra no menu — menu
 * que leva a 404 é pior do que menu curto.
 */

const SIDEBAR_COOKIE = 'lume_admin_sidebar';

interface NavItem { href: string; label: string; icon: React.ElementType }
interface NavGroup { title: string; items: NavItem[] }

const GROUPS: NavGroup[] = [
  {
    title: 'Rede',
    items: [
      { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
      { href: '/admin/professionals', label: 'Profissionais', icon: Users },
      { href: '/admin/professionals/acessos', label: 'Acessos', icon: KeyRound },
      { href: '/admin/salons', label: 'Grupos', icon: Store },
    ],
  },
  {
    title: 'Operação',
    items: [
      { href: '/admin/appointments', label: 'Agendamentos', icon: CalendarDays },
      { href: '/admin/clients', label: 'Clientes', icon: UserCircle },
      { href: '/admin/conversations', label: 'Conversas', icon: MessageCircle },
    ],
  },
  {
    title: 'Negócio',
    items: [
      { href: '/admin/finance', label: 'Financeiro', icon: Wallet },
      { href: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
      { href: '/admin/plans', label: 'Planos', icon: CreditCard },
      { href: '/admin/alerts', label: 'Alertas', icon: Bell },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { href: '/admin/logs', label: 'Logs', icon: ScrollText },
      { href: '/admin/system', label: 'Saúde', icon: Activity },
      { href: '/admin/broadcast', label: 'Avisos', icon: Megaphone },
      { href: '/admin/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

/**
 * Item ativo = o href MAIS ESPECÍFICO que casa com a rota atual.
 * Sem isso, /admin/professionals/acessos acenderia dois itens ao mesmo tempo
 * (Profissionais e Acessos), porque um é prefixo do outro.
 */
function activeHrefFor(pathname: string): string | null {
  const matches = GROUPS.flatMap(g => g.items).map(i => i.href).filter(href =>
    href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

interface NavProps {
  mini: boolean;
  pathname: string;
  name: string;
  email: string;
  onNavigate: () => void;
  onToggleCollapsed: () => void;
  onLogout: () => void;
}

/** Conteúdo da barra. Fora do componente pai para não ser recriado a cada render. */
function AdminNav({ mini, pathname, name, email, onNavigate, onToggleCollapsed, onLogout }: NavProps) {
  const currentHref = activeHrefFor(pathname);
  return (
    <div className={`flex flex-col h-full surface-wine text-white select-none overflow-y-auto scrollbar-none ${mini ? 'px-2.5 py-5' : 'px-4 py-5'}`}>
      <div className={`flex items-center ${mini ? 'flex-col gap-3' : 'justify-between'}`}>
        <Link href="/admin" className={mini ? '' : 'px-1'} aria-label="Painel administrativo Lume">
          <LumeLogo variant="light" className={mini ? 'h-5' : 'h-7'} />
          {!mini && (
            <span className="text-[9px] text-white/55 font-bold uppercase tracking-[0.22em] mt-1.5 block pl-0.5">
              Super Admin
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={mini ? 'Expandir menu' : 'Recolher menu'}
          aria-label={mini ? 'Expandir menu' : 'Recolher menu'}
          aria-expanded={!mini}
          className="hidden lg:inline-flex p-2 rounded-xl text-white/55 hover:text-white hover:bg-white/10 transition-colors shrink-0"
        >
          {mini ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>
      </div>

      <nav className="mt-7 space-y-6 flex-1" aria-label="Navegação do painel administrativo">
        {/* Calculado uma vez: ver activeHrefFor. */}
        {GROUPS.map(group => (
          <div key={group.title}>
            {mini ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/12" aria-hidden />
            ) : (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">{group.title}</p>
            )}
            <ul className="space-y-1">
              {group.items.map(item => {
                const Icon = item.icon;
                const active = currentHref === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={mini ? item.label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`group relative flex items-center rounded-xl text-[13px] font-semibold transition-colors ${
                        mini ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-3 py-2.5'
                      } ${active ? 'bg-white text-wine-700 shadow-[0_8px_20px_-12px_rgba(0,0,0,0.7)]' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-wine-700' : 'text-white/55 group-hover:text-white'}`} />
                      {!mini && <span>{item.label}</span>}
                      {/* Tooltip do modo recolhido — a barra antiga não tinha nenhum. */}
                      {mini && (
                        <span className="pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded-lg bg-wine-900 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="mt-6 pt-4 border-t border-white/10">
        {!mini && (
          <div className="px-3 pb-3">
            <p className="text-xs font-bold text-white truncate" title={name}>{name}</p>
            <p className="text-[10px] text-white/50 truncate" title={email}>{email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={onLogout}
          title={mini ? 'Sair do admin' : undefined}
          className={`flex items-center text-xs font-bold text-white/55 hover:bg-white/10 hover:text-white rounded-xl transition-colors ${
            mini ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 w-full px-3 py-2.5'
          }`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!mini && <span>Sair do admin</span>}
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar({ name, email, initialCollapsed }: { name: string; email: string; initialCollapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      document.cookie = `${SIDEBAR_COOKIE}=${next ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      return next;
    });
  };

  const handleLogout = async () => {
    const { adminLogoutAction } = await import('@/app/actions/admin-session');
    await adminLogoutAction();
    router.push('/admin-login');
  };

  const navProps = {
    pathname,
    name,
    email,
    onNavigate: () => setMobileOpen(false),
    onToggleCollapsed: toggleCollapsed,
    onLogout: handleLogout,
  };

  return (
    <>
      {/* Desktop: ocupa espaço de verdade no fluxo (não é overlay) */}
      <aside className={`hidden lg:block shrink-0 h-screen sticky top-0 transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-60'}`}>
        <AdminNav mini={collapsed} {...navProps} />
      </aside>

      {/* Mobile: botão + drawer */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 surface-wine text-white rounded-xl shadow-lg border border-white/10"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-[#1a0e12]/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 h-full shadow-2xl animate-slide-right">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute top-4 right-3 z-10 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            <AdminNav mini={false} {...navProps} />
          </aside>
        </div>
      )}
    </>
  );
}

export default AdminSidebar;
