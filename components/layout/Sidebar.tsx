'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, CalendarRange, Clock, Settings, Users, Sparkles, Lock,
  LayoutDashboard, LogOut, Menu, X, ExternalLink, Wallet, UserCircle, BarChart3, Store, NotebookPen, Hourglass, Bot, MessageCircle
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';

interface SidebarProps {
  role: 'super_admin' | 'professional';
  name: string;
  brandName?: string;
  slug?: string;
  pendingConversations?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName, slug, pendingConversations }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);

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
      { href: '/dashboard/clients', label: 'Clientes', icon: Users },
      { href: '/dashboard/finance', label: 'Contas', icon: Wallet },
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
    { href: '/dashboard/finance', label: 'Contas', icon: Wallet },
    { href: '/dashboard/clients', label: 'Clientes', icon: Users },
  ];

  const links = getLinks();
  const displayName = brandName || name;
  // Slug real da profissional (corrige link público quebrado)
  const publicSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-');

  const SidebarContent = () => (
    <div className="flex flex-col h-full surface-wine text-white p-5 select-none overflow-y-auto scrollbar-none">
      <div className="space-y-7">
        {/* Logo / Header */}
        <div className="px-1">
          <LumeLogo variant="light" className="h-8" />
          <span className="text-[9px] text-white/55 font-bold uppercase tracking-[0.22em] mt-2 block pl-0.5">
            {role === 'super_admin' ? 'Super Admin' : 'Agenda'}
          </span>
        </div>

        {/* Info Profissional */}
        {role === 'professional' && (
          <div className="bg-white/8 rounded-2xl p-4 border border-white/10 ring-hairline">
            <p className="text-[9px] uppercase font-bold text-white/45 tracking-[0.18em]">Profissional</p>
            <p className="text-sm font-bold text-white truncate mt-1" title={displayName}>{displayName}</p>
          </div>
        )}

        {/* Links de Navegação */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && link.href !== '/admin' && pathname.startsWith(link.href));

            const badge = link.href === '/dashboard/pending' && pendingConversations && pendingConversations > 0
              ? pendingConversations
              : null;

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`group flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold rounded-2xl transition-all-custom ${
                  isActive
                    ? 'bg-white text-[#500b18] shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]'
                    : 'text-white/70 hover:bg-white/8 hover:text-white'
                }`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-[#500b18]' : 'text-white/55 group-hover:text-white'}`} />
                <span className="flex-1">{link.label}</span>
                {badge && (
                  <span className="text-[10px] font-bold text-white bg-amber-500 rounded-full px-1.5 py-0.5 min-w-[18px] text-center leading-none">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="space-y-2.5 mt-auto pt-6">
        {role === 'professional' && (
          <Link
            href={`/agendar/${publicSlug}`}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-3 bg-white/10 hover:bg-white/16 text-xs font-bold rounded-2xl text-white transition-all-custom border border-white/10"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Página Pública
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-white/55 hover:bg-white/8 hover:text-white rounded-2xl transition-all-custom cursor-pointer"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 shadow-glow">
        <SidebarContent />
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
                {active && <span className="absolute top-0 h-1 w-7 rounded-full bg-wine-700" />}
                <span className={`flex items-center justify-center h-8 w-12 rounded-2xl transition-all-custom ${active ? 'bg-wine-700/12' : ''}`}>
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
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
export default Sidebar;
