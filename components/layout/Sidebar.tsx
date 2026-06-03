'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Calendar, Clock, Settings, Users, Sparkles, Lock, 
  LayoutDashboard, LogOut, Menu, X, ShieldAlert 
} from 'lucide-react';
import { useToast } from '../ui/Toast';

interface SidebarProps {
  role: 'super_admin' | 'professional';
  name: string;
  brandName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Import dinâmico da action para evitar erros no client-side
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
      ];
    }

    return [
      { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
      { href: '/dashboard/appointments', label: 'Agendamentos', icon: Calendar },
      { href: '/dashboard/services', label: 'Serviços', icon: Sparkles },
      { href: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
      { href: '/dashboard/blocks', label: 'Bloqueios', icon: Lock },
      { href: '/dashboard/clients', label: 'Clientes', icon: Users },
      { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
    ];
  };

  const links = getLinks();
  const displayName = brandName || name;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#500b18] text-white p-6 justify-between select-none">
      <div className="space-y-8">
        {/* Logo / Header */}
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 bg-white text-[#500b18] flex items-center justify-center font-black rounded-xl text-lg shadow-sm">
            L
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight leading-none">Lume Agenda</h1>
            <span className="text-[10px] text-white/70 font-bold uppercase tracking-widest mt-1 block">
              {role === 'super_admin' ? 'Super Admin' : 'Painel Comercial'}
            </span>
          </div>
        </div>

        {/* Info Profissional */}
        {role === 'professional' && (
          <div className="bg-[#681624] rounded-2xl p-4 border border-[#801c2e]/50">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Profissional</p>
            <p className="text-sm font-bold text-white truncate mt-0.5" title={displayName}>{displayName}</p>
          </div>
        )}

        {/* Links de Navegação */}
        <nav className="space-y-1.5">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-xs font-bold rounded-xl transition-all ${
                  isActive 
                    ? 'bg-white text-[#500b18] shadow-md shadow-black/10' 
                    : 'text-[#d6c7ca] hover:bg-[#681624] hover:text-white'
                }`}
              >
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="space-y-4">
        {role === 'professional' && (
          <Link
            href={`/agendar/${brandName?.toLowerCase().replace(/\s+/g, '-') || name.toLowerCase().replace(/\s+/g, '-')}`}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#681624] hover:bg-[#801c2e] text-xs font-bold rounded-xl text-white transition-colors border border-[#801c2e]/60"
          >
            Ver Página Pública
          </Link>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-xs font-bold text-red-300 hover:bg-red-950/30 hover:text-red-200 rounded-xl transition-all cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 shrink-0" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 shrink-0 border-r border-[#681624]/25 shadow-xl">
        <SidebarContent />
      </aside>

      {/* Menu mobile flutuante */}
      <div className="lg:hidden fixed top-4 right-4 z-40">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 bg-[#500b18] text-white rounded-2xl shadow-lg border border-[#681624] hover:bg-[#681624] focus:outline-none transition-colors"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Mobile Overlay */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-35 flex">
          <div className="absolute inset-0 bg-[#0c1512]/60 backdrop-blur-xs" onClick={() => setIsOpen(false)} />
          <aside className="relative w-64 h-full shadow-2xl animate-slide-right">
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
};
export default Sidebar;
