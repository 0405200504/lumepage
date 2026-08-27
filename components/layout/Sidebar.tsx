'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, CalendarRange, Clock, Settings, Sparkles, Lock,
  LayoutDashboard, LogOut, ExternalLink, Wallet, NotebookPen, Hourglass,
  MessageCircle, Smartphone, Bot, ShoppingBag, Contact, ClipboardList, Globe,
  X, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { ROUTE_CAPABILITY, can } from '@/lib/subscription/entitlements';

/** O Header (topo) dispara este evento para abrir a navegação no celular.
 *  Mesmo padrão que o tour de boas-vindas já usa — sem contexto novo só para
 *  ligar dois componentes que são irmãos na casca. */
export const OPEN_NAV_EVENT = 'lume:open-nav';

interface SidebarProps {
  /** O painel administrativo tem barra própria (components/admin/AdminSidebar). */
  role: 'professional';
  name: string;
  brandName?: string;
  slug?: string;
  plan?: string | null;
  /** Aplicar limites de plano (só conta nova com assinatura ativa). */
  enforcePlan?: boolean;
  pendingConversations?: number;
}

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

/** Menu completo, agrupado. Fonte de verdade do rail e do drawer. */
const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: 'Atendimento',
    links: [
      { href: '/dashboard', label: 'Início', icon: LayoutDashboard },
      { href: '/dashboard/agenda', label: 'Agenda', icon: CalendarRange },
      { href: '/dashboard/appointments', label: 'Agendamentos', icon: CalendarDays },
      { href: '/dashboard/waitlist', label: 'Lista de espera', icon: Hourglass },
      { href: '/dashboard/tasks', label: 'Tarefas e notas', icon: NotebookPen },
    ],
  },
  {
    title: 'Clientes',
    links: [
      { href: '/dashboard/clients', label: 'Contatos', icon: Contact },
      { href: '/dashboard/anamnese', label: 'Fichas de anamnese', icon: ClipboardList },
      { href: '/dashboard/whatsapp/conversas', label: 'Conversas', icon: MessageCircle },
      { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: Smartphone },
      ...(AI_ATTENDANCE_ENABLED ? [{ href: '/dashboard/pending', label: 'Atendimento IA', icon: Bot }] : []),
    ],
  },
  {
    title: 'Dinheiro',
    links: [
      { href: '/dashboard/finance', label: 'Financeiro', icon: Wallet },
      { href: '/dashboard/sales', label: 'Vendas', icon: ShoppingBag },
    ],
  },
  {
    title: 'Seu negócio',
    links: [
      { href: '/dashboard/site', label: 'Minha Página', icon: Globe },
      { href: '/dashboard/services', label: 'Serviços', icon: Sparkles },
      { href: '/dashboard/availability', label: 'Disponibilidade', icon: Clock },
      { href: '/dashboard/blocks', label: 'Bloqueios', icon: Lock },
      { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
    ],
  },
];

/** Um item de navegação. Serve o rail e a gaveta — o que muda é só se o
 *  rótulo está visível.
 *
 *  Mora no escopo do MÓDULO de propósito: declarado dentro do Sidebar, cada
 *  render criaria um tipo de componente novo e o React remontaria a barra
 *  inteira, perdendo foco e posição de rolagem a cada navegação. */
const NavItem: React.FC<{
  link: NavLink;
  active: boolean;
  locked: boolean;
  badge: number;
  showLabel: boolean;
  onNavigate?: () => void;
}> = ({ link, active, locked, badge, showLabel, onNavigate }) => {
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      title={showLabel ? undefined : link.label}
      className={`group/item relative flex items-center h-11 rounded-control transition-ui
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600
        ${showLabel ? 'gap-3 px-3' : 'justify-center w-11 mx-auto'}
        ${active ? 'bg-wine-700 text-white' : 'text-n-600 hover:bg-n-100 hover:text-heading'}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {showLabel && (
        <>
          <span className="flex-1 text-label truncate">{link.label}</span>
          {locked && <Lock className="h-4 w-4 shrink-0 text-n-400" aria-hidden />}
          {badge > 0 && (
            <span className={`num text-caption font-semibold rounded-full px-2 leading-5 shrink-0 ${active ? 'bg-white/20 text-white' : 'bg-warning-bg text-warning border border-warning-border'}`}>
              {badge}
            </span>
          )}
        </>
      )}
      {!showLabel && locked && <Lock className="absolute top-0.5 right-0.5 h-4 w-4 text-n-400" aria-hidden />}
      {!showLabel && badge > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-warning" aria-hidden />}
    </Link>
  );
};

/** Corpo da navegação, compartilhado entre o rail e a gaveta. */
const NavBody: React.FC<{
  pathname: string;
  showLabel: boolean;
  lockedFor: (href: string) => boolean;
  badgeFor: (href: string) => number;
  onNavigate?: () => void;
}> = ({ pathname, showLabel, lockedFor, badgeFor, onNavigate }) => (
  <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full px-2 py-2 space-y-3" aria-label="Navegação principal">
    {GROUPS.map((group, gi) => (
      <div key={group.title}>
        {showLabel ? (
          <p className="overline text-n-500 px-3 mb-1">{group.title}</p>
        ) : (
          gi > 0 && <div className="mx-auto w-6 border-t border-line mb-2" aria-hidden />
        )}
        <div className="space-y-0.5">
          {group.links.map((link) => (
            <NavItem
              key={link.href}
              link={link}
              active={isActiveHref(pathname, link.href)}
              locked={lockedFor(link.href)}
              badge={badgeFor(link.href)}
              showLabel={showLabel}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    ))}
  </nav>
);

/** Rodapé: página pública, sair e a identificação da conta. */
const NavFooter: React.FC<{
  showLabel: boolean;
  publicSlug: string;
  displayName: string;
  onLogout: () => void;
  onNavigate?: () => void;
}> = ({ showLabel, publicSlug, displayName, onLogout, onNavigate }) => (
  <div className="shrink-0 w-full px-2 pt-2 pb-1 border-t border-line space-y-0.5">
    <Link
      href={`/agendar/${publicSlug}`}
      target="_blank"
      onClick={onNavigate}
      title={showLabel ? undefined : 'Ver página pública'}
      className={`flex items-center h-11 rounded-control text-n-600 hover:bg-n-100 hover:text-heading transition-ui
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600
        ${showLabel ? 'gap-3 px-3' : 'justify-center w-11 mx-auto'}`}
    >
      <ExternalLink className="h-5 w-5 shrink-0" />
      {showLabel && <span className="flex-1 text-label truncate">Ver página pública</span>}
    </Link>
    <button
      onClick={onLogout}
      title={showLabel ? undefined : 'Sair da conta'}
      className={`flex items-center h-11 rounded-control text-n-600 hover:bg-n-100 hover:text-heading transition-ui
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600
        ${showLabel ? 'gap-3 px-3 w-full' : 'justify-center w-11 mx-auto'}`}
    >
      <LogOut className="h-5 w-5 shrink-0" />
      {showLabel && <span className="flex-1 text-label text-left truncate">Sair da conta</span>}
    </button>
    <div className={`flex items-center h-11 ${showLabel ? 'gap-3 px-3' : 'justify-center'}`}>
      <Avatar name={displayName} size="sm" />
      {showLabel && (
        <span className="min-w-0 flex-1">
          <span className="block text-label font-semibold text-heading truncate">{displayName}</span>
        </span>
      )}
    </div>
  </div>
);

function isActiveHref(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName, slug, plan, enforcePlan, pendingConversations }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();

  // Desktop: recolhido por padrão, abre no hover. `pinned` fixa aberto e
  // persiste entre sessões — quem usa teclado ou trackpad lento não quer
  // depender do mouse parado em cima da barra.
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const expanded = pinned || hovered;

  // Mobile: gaveta, aberta pelo botão do topo.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // O valor só existe no navegador; ler durante o render quebraria a
  // hidratação (servidor e cliente renderizariam barras diferentes).
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem('lume_sidebar_pinned') === '1') setPinned(true);
    } catch { /* modo privativo: segue recolhida */ }
  }, []);

  useEffect(() => {
    const abrir = () => setDrawerOpen(true);
    window.addEventListener(OPEN_NAV_EVENT, abrir);
    return () => window.removeEventListener(OPEN_NAV_EVENT, abrir);
  }, []);

  // Trava a rolagem do fundo enquanto a gaveta está aberta.
  useEffect(() => {
    if (!drawerOpen) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = anterior; };
  }, [drawerOpen]);

  const togglePinned = () => setPinned((p) => {
    const next = !p;
    try { localStorage.setItem('lume_sidebar_pinned', next ? '1' : '0'); } catch { /* ignora */ }
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
    } catch {
      error('Erro', 'Ocorreu um erro ao encerrar sessão.');
    }
  };

  const displayName = brandName || name;
  const publicSlug = slug || name.toLowerCase().trim().replace(/\s+/g, '-');

  const lockedFor = (href: string) => {
    const capability = enforcePlan && role === 'professional' ? ROUTE_CAPABILITY[href] : undefined;
    return !!capability && !can(plan, capability);
  };

  const badgeFor = (href: string) =>
    href === '/dashboard/pending' && pendingConversations ? pendingConversations : 0;

  return (
    <>
      {/* ================= RAIL (desktop ≥1024px) =================
          72px recolhido, 264px aberto no hover.

          A largura É animada aqui, contra a regra geral — mas o painel é
          `fixed`, fora do fluxo, e o <aside> ao lado reserva uma faixa de
          largura CONSTANTE. Ou seja: o conteúdo da página não relayoutiza,
          e a barra abre por cima em vez de empurrar a tela inteira. */}
      <aside className="hidden lg:block shrink-0 w-24" aria-label="Navegação principal">
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          data-expanded={expanded || undefined}
          className={`fixed left-3 top-3 bottom-3 z-40 flex flex-col
            bg-surface border border-line rounded-hero shadow-sm
            transition-[width] duration-[220ms] ease-out
            ${expanded ? 'w-[264px] shadow-lg' : 'w-[72px]'}`}
        >
          <div className={`shrink-0 flex items-center h-14 ${expanded ? 'justify-between px-4' : 'justify-center'}`}>
            <Link
              href="/dashboard"
              className="flex items-center rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
              aria-label="Lume — Início"
            >
              <LumeLogo variant="wine" className="h-5" />
            </Link>
            {expanded && (
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                onClick={togglePinned}
                aria-pressed={pinned}
                aria-label={pinned ? 'Desafixar o menu' : 'Fixar o menu aberto'}
                title={pinned ? 'Desafixar (recolhe ao tirar o mouse)' : 'Fixar o menu aberto'}
                leadingIcon={pinned ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
              />
            )}
          </div>

          <NavBody pathname={pathname} showLabel={expanded} lockedFor={lockedFor} badgeFor={badgeFor} />
          <NavFooter showLabel={expanded} publicSlug={publicSlug} displayName={displayName} onLogout={handleLogout} />
        </div>
      </aside>

      {/* ================= GAVETA (mobile <1024px) =================
          Não há mais barra fixa no rodapé. A navegação inteira mora aqui,
          aberta pelo botão do topo — o polegar alcança o topo esquerdo com
          o mesmo esforço, e o rodapé volta a ser conteúdo. */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[86%] max-w-xs h-full bg-surface shadow-lg flex flex-col animate-slide-right">
            <div className="shrink-0 flex items-center justify-between h-16 px-4 border-b border-line pt-safe">
              <LumeLogo variant="wine" className="h-5" />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label="Fechar menu"
                onClick={() => setDrawerOpen(false)}
                leadingIcon={<X className="h-5 w-5" />}
              />
            </div>
            <NavBody pathname={pathname} showLabel lockedFor={lockedFor} badgeFor={badgeFor} onNavigate={() => setDrawerOpen(false)} />
            <div className="safe-sheet">
              <NavFooter showLabel publicSlug={publicSlug} displayName={displayName} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
