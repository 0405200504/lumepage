'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, CalendarRange, Clock, Settings, Users, Sparkles, Lock,
  LayoutDashboard, LogOut, Menu, X, ExternalLink, Wallet, UserCircle, BarChart3, Store, NotebookPen, Hourglass, Bot, MessageCircle,
  PanelLeftClose, PanelLeftOpen, ShoppingBag, Contact, ClipboardList
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';
import { ROUTE_CAPABILITY, can } from '@/lib/subscription/entitlements';

interface SidebarProps {
  role: 'super_admin' | 'professional';
  name: string;
  brandName?: string;
  slug?: string;
  plan?: string | null;
  /** Aplicar limites de plano (só conta nova com assinatura ativa). */
  enforcePlan?: boolean;
  pendingConversations?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName, slug, plan, enforcePlan, pendingConversations }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  // Desktop: rail minimizado por padrão que expande no hover.
  // `pinned` = profissional fixou aberto (persiste entre sessões).
  // `hovered` = mouse sobre a barra. Expandido = pinned || hovered.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  // Lembra a preferência de barra fixada aberta entre sessões.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem('lume_sidebar_pinned') === '1') setPinned(true);
  }, []);
  const togglePinned = () => setPinned((p) => {
    const next = !p;
    try { localStorage.setItem('lume_sidebar_pinned', next ? '1' : '0'); } catch {}
    return next;
  });

  const handleLogout = async () => {
    try {
      const { logoutAction } = await import('@/app/actions/professional');
      const res = await logoutAction();
      if (res.success) {
        success('Até logo!', 'Sessão encerrada com sucesso.');
        router.push('/login');
      } else {
        error('Falha', 'Não foi possível realizar logout.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu um erro ao encerrar sessão.');
    }
  };

  const getLinks = () => {
    if (role === 'super_admin') {
      return [
        { href: '/admin', label: 'Visão Geral', icon: LayoutDashboard },
        { href: '/admin/professionals', label: 'Profissionais', icon: Users },
        { href: '/admin/salons', label: 'Grupos', icon: Store },
        { href: '/admin/appointments', label: 'Agendamentos', icon: CalendarDays },
        { href: '/admin/clients', label: 'Clientes', icon: UserCircle },
        { href: '/admin/finance', label: 'Financeiro', icon: Wallet },
        { href: '/admin/reports', label: 'Relatórios', icon: BarChart3 },
      ];
    }

    return [
      { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
      { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarRange },
      { href: '/dashboard/appointments', label: 'Agendamentos', icon: CalendarDays },
      { href: '/dashboard/waitlist', label: 'Lista de espera', icon: Hourglass },
      { href: '/dashboard/services', label: 'Serviços', icon: Sparkles },
      { href: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
      { href: '/dashboard/blocks', label: 'Bloqueios', icon: Lock },
      { href: '/dashboard/clients', label: 'Contatos', icon: Contact },
      { href: '/dashboard/anamnese', label: 'Fichas de Anamnese', icon: ClipboardList },
      { href: '/dashboard/sales', label: 'Vendas', icon: ShoppingBag },
      { href: '/dashboard/finance', label: 'Financeiro', icon: Wallet },
      { href: '/dashboard/pending', label: 'Conversas', icon: MessageCircle },
      { href: '/dashboard/whatsapp', label: 'Bot WhatsApp', icon: Bot },
      { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
    ];
  };

  // Itens principais da barra inferior (mobile)
  const bottomLinks = [
    { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
    { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarRange },
    { href: '/dashboard/tasks', label: 'Tarefas', icon: NotebookPen },
    { href: '/dashboard/finance', label: 'Financeiro', icon: Wallet },
    { href: '/dashboard/clients', label: 'Contatos', icon: Contact },
  ];

  const links = getLinks();
  const displayName = brandName || name;
  // Slug real da profissional (corrige link público quebrado)
  const publicSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-');

  const SidebarContent = ({ collapsed: isCollapsed = false, showToggle = false }: { collapsed?: boolean; showToggle?: boolean }) => (
    <div className={`flex flex-col h-full surface-wine text-white select-none overflow-y-auto overflow-x-hidden scrollbar-none ${isCollapsed ? 'px-2.5 py-5 items-center' : 'p-5'}`}>
      <div className={`w-full ${isCollapsed ? 'space-y-5' : 'space-y-7'}`}>
        {/* Logo / Header */}
        <div className={`flex items-center ${isCollapsed ? 'flex-col gap-3' : 'justify-between'}`}>
          <div className={isCollapsed ? '' : 'px-1'}>
            {isCollapsed ? (
              <LumeLogo variant="light" className="h-5" />
            ) : (
              <>
                <LumeLogo variant="light" className="h-8" />
                <span className="text-[9px] text-white/55 font-bold uppercase tracking-[0.22em] mt-2 block pl-0.5">
                  {role === 'super_admin' ? 'Super Admin' : 'Agenda'}
                </span>
              </>
            )}
          </div>
          {showToggle && (
            <button
              onClick={togglePinned}
              title={pinned ? 'Desafixar (recolher ao tirar o mouse)' : 'Fixar menu aberto'}
              aria-label={pinned ? 'Desafixar menu' : 'Fixar menu aberto'}
              aria-pressed={pinned}
              className={`p-2 rounded-xl transition-all-custom shrink-0 ${pinned ? 'text-white bg-white/12' : 'text-white/55 hover:text-white hover:bg-white/8'}`}
            >
              {pinned ? <PanelLeftClose className="h-[18px] w-[18px]" /> : <PanelLeftOpen className="h-[18px] w-[18px]" />}
            </button>
          )}
        </div>

        {/* Info Profissional */}
        {role === 'professional' && !isCollapsed && (
          <div className="relative overflow-hidden bg-white/[0.07] rounded-2xl p-4 border border-white/10 ring-hairline">
            <span className="pointer-events-none absolute -top-8 -right-6 h-20 w-20 rounded-full bg-white/10 blur-2xl" />
            <p className="text-[9px] uppercase font-bold text-white/45 tracking-[0.18em]">Profissional</p>
            <p className="text-sm font-bold text-white truncate mt-1" title={displayName}>{displayName}</p>
          </div>
        )}

        {/* Links de Navegação */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && link.href !== '/admin' && pathname.startsWith(link.href));

            // Recurso fora do plano da profissional → mostra cadeado. O link continua
            // navegando: a própria rota renderiza a tela de upgrade (bloqueio no servidor).
            const capability = enforcePlan && role === 'professional' ? ROUTE_CAPABILITY[link.href] : undefined;
            const locked = !!capability && !can(plan, capability);

            const badge = !locked && link.href === '/dashboard/pending' && pendingConversations && pendingConversations > 0
              ? pendingConversations
              : null;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                title={isCollapsed ? link.label : undefined}
                className={`group relative flex items-center rounded-2xl text-[13px] font-semibold transition-all-custom ${
                  isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 px-4 py-2.5'
                } ${
                  isActive
                    ? 'bg-gradient-to-br from-white to-white/92 text-[#500b18] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.7)] ring-1 ring-white/40'
                    : `text-white/70 hover:bg-white/10 hover:text-white ${locked ? 'opacity-60' : ''}`
                }`}
              >
                {isActive && !isCollapsed && (
                  <span className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-[#8c2438]" />
                )}
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#500b18]' : 'text-white/55 group-hover:text-white'}`} />
                {!isCollapsed && <span className="flex-1">{link.label}</span>}
                {locked && !isCollapsed && (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-white/40" />
                )}
                {locked && isCollapsed && (
                  <span className="absolute top-1 right-1"><Lock className="h-2.5 w-2.5 text-white/50" /></span>
                )}
                {badge && (
                  <span className={`text-[10px] font-bold text-white bg-amber-500 rounded-full leading-none text-center ${isCollapsed ? 'absolute top-1 right-1 h-2 w-2 p-0' : 'px-1.5 py-0.5 min-w-[18px]'}`}>
                    {isCollapsed ? '' : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className={`mt-auto pt-6 w-full ${isCollapsed ? 'space-y-2' : 'space-y-2.5'}`}>
        {role === 'professional' && (
          <Link
            href={`/agendar/${publicSlug}`}
            target="_blank"
            title={isCollapsed ? 'Ver Página Pública' : undefined}
            className={`flex items-center justify-center gap-2 bg-white/10 hover:bg-white/16 text-xs font-bold rounded-2xl text-white transition-all-custom border border-white/10 ${isCollapsed ? 'h-11 w-11 mx-auto' : 'w-full py-3'}`}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {!isCollapsed && 'Ver Página Pública'}
          </Link>
        )}
        <button
          onClick={handleLogout}
          title={isCollapsed ? 'Sair da Conta' : undefined}
          className={`flex items-center text-xs font-bold text-white/55 hover:bg-white/8 hover:text-white rounded-2xl transition-all-custom cursor-pointer ${isCollapsed ? 'justify-center h-11 w-11 mx-auto' : 'gap-3 w-full px-4 py-3'}`}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span>Sair da Conta</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop — rail minimizado que expande no hover (overlay).
          O <aside> reserva a largura do rail (80px), ou 256px quando fixado;
          o painel interno é fixo e expande sobre o conteúdo, sem empurrá-lo. */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`hidden lg:block h-screen shrink-0 transition-[width] duration-200 ${pinned ? 'w-64' : 'w-20'}`}
      >
        <div
          className={`fixed top-0 left-0 h-screen z-40 shadow-glow transition-[width] duration-200 ease-out ${expanded ? 'w-64' : 'w-20'}`}
        >
          {SidebarContent({ collapsed: !expanded, showToggle: expanded })}
        </div>
      </aside>

      {/* Botão flutuante (admin) */}
      {role === 'super_admin' && (
        <div className="lg:hidden fixed top-4 right-4 z-40">
          <button onClick={() => setIsOpen(!isOpen)} className="p-3 surface-wine text-white rounded-2xl shadow-lg border border-white/10 transition-all-custom">
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      )}

      {/* Barra de navegação inferior (mobile · profissional) */}
      {role === 'professional' && (
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-gray-150 px-2 pt-2 pb-safe shadow-[0_-8px_24px_-16px_rgba(38,4,10,0.25)]">
        <div className="flex items-stretch justify-around gap-1">
          {bottomLinks.map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`tap relative flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-2xl transition-colors ${
                  active ? 'text-wine-700' : 'text-gray-450'
                }`}
              >
                {active && <span className="absolute top-0 h-1 w-7 rounded-full bg-gradient-to-r from-wine-500 to-wine-700 shadow-[0_2px_8px_-1px_rgba(80,11,24,0.5)]" />}
                <span className={`flex items-center justify-center h-8 w-12 rounded-2xl transition-all-custom ${active ? 'bg-gradient-to-br from-wine-700/12 to-wine-500/8' : ''}`}>
                  <Icon className={`h-[22px] w-[22px] transition-transform ${active ? 'text-wine-700 scale-110' : ''}`} strokeWidth={active ? 2.5 : 2} />
                </span>
                <span className={`text-[10px] tracking-tight ${active ? 'font-bold' : 'font-semibold'}`}>{link.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setIsOpen(true)}
            className="tap relative flex flex-col items-center justify-center gap-1 flex-1 py-1.5 rounded-2xl text-gray-450"
          >
            <span className="flex items-center justify-center h-8 w-12 rounded-2xl">
              <Menu className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[10px] tracking-tight font-semibold">Mais</span>
          </button>
        </div>
      </nav>
      )}

      {/* Sidebar Mobile Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-[#1a0e12]/70" onClick={() => setIsOpen(false)} />
          <aside className="relative w-64 h-full shadow-2xl animate-slide-right">
            {SidebarContent({})}
          </aside>
        </div>
      )}
    </>
  );
};
export default Sidebar;
