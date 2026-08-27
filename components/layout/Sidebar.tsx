'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays, CalendarRange, Clock, Settings, Sparkles, Lock,
  LayoutDashboard, LogOut, ExternalLink, Wallet, NotebookPen, Hourglass,
  MessageCircle, Smartphone, Bot, ShoppingBag, Contact, ClipboardList, Globe,
  MoreHorizontal, X,
} from 'lucide-react';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';
import { Avatar } from '../ui/Avatar';
import { ROUTE_CAPABILITY, can } from '@/lib/subscription/entitlements';

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

/** Menu completo, agrupado. É a fonte de verdade — o rail e a folha "Mais" leem daqui. */
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

const ALL_LINKS = GROUPS.flatMap((g) => g.links);

/** O rail mostra só os destinos do dia a dia. O resto vive em "Mais", com rótulo. */
const RAIL_HREFS = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/appointments',
  '/dashboard/clients',
  '/dashboard/finance',
  '/dashboard/whatsapp/conversas',
  '/dashboard/site',
];

/** Tab bar do celular: CINCO itens. Seis não cabem no polegar nem na largura. */
const TAB_HREFS = ['/dashboard', '/dashboard/agenda', '/dashboard/finance', '/dashboard/clients'];

function isActiveHref(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName, slug, plan, enforcePlan, pendingConversations }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();
  const reduced = useReducedMotion();
  const [moreOpen, setMoreOpen] = useState(false);

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

  const railLinks = RAIL_HREFS.map((h) => ALL_LINKS.find((l) => l.href === h)!).filter(Boolean);
  const tabLinks = TAB_HREFS.map((h) => ALL_LINKS.find((l) => l.href === h)!).filter(Boolean);
  // "Mais" acende quando a rota atual não está na tab bar.
  const moreActive = !TAB_HREFS.some((h) => isActiveHref(pathname, h));

  return (
    <>
      {/* ================= RAIL (desktop ≥1024px) =================
          72px, flutuando com 12px de margem. Só ícone + tooltip: os
          rótulos completos moram em "Mais". */}
      <aside className="hidden lg:block shrink-0 w-24" aria-label="Navegação principal">
        <div className="fixed left-3 top-3 bottom-3 z-40 w-[72px] flex flex-col items-center gap-2 py-4 bg-surface border border-line rounded-hero shadow-sm">
          <Link
            href="/dashboard"
            className="shrink-0 h-10 flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 rounded-chip"
            aria-label="Lume — Início"
          >
            <LumeLogo variant="wine" className="h-5" />
          </Link>

          <nav className="flex-1 flex flex-col items-center gap-1 mt-2 overflow-y-auto scrollbar-none w-full">
            {railLinks.map((link) => {
              const Icon = link.icon;
              const active = isActiveHref(pathname, link.href);
              const locked = lockedFor(link.href);
              return (
                <RailItem
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  active={active}
                  locked={locked}
                >
                  <Icon className="h-5 w-5" />
                </RailItem>
              );
            })}
            <RailButton label="Mais" onClick={() => setMoreOpen(true)} active={moreOpen}>
              <MoreHorizontal className="h-5 w-5" />
            </RailButton>
          </nav>

          <div className="shrink-0 flex flex-col items-center gap-1 w-full pt-2 border-t border-line">
            <RailItem href={`/agendar/${publicSlug}`} label="Ver página pública" external>
              <ExternalLink className="h-5 w-5" />
            </RailItem>
            <RailButton label="Sair da conta" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </RailButton>
            <span className="mt-1" title={displayName}>
              <Avatar name={displayName} size="sm" />
            </span>
          </div>
        </div>
      </aside>

      {/* ================= TAB BAR (mobile <1024px) =================
          Cinco itens. O indicador desliza entre eles. */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-line bg-surface/85 backdrop-blur-[20px] pb-safe"
        aria-label="Navegação principal"
      >
        <div className="flex items-stretch h-[60px]">
          {tabLinks.map((link) => {
            const Icon = link.icon;
            const active = isActiveHref(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`tap relative flex-1 flex flex-col items-center justify-center gap-1 min-w-11
                  focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wine-600
                  ${active ? 'text-wine-700' : 'text-n-500'}`}
              >
                {active && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute top-0 h-[3px] w-8 rounded-full bg-wine-700"
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                    aria-hidden
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className={`text-caption leading-none ${active ? 'font-semibold' : 'font-medium'}`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={`tap relative flex-1 flex flex-col items-center justify-center gap-1 min-w-11
              focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-wine-600
              ${moreActive ? 'text-wine-700' : 'text-n-500'}`}
          >
            {moreActive && (
              <motion.span
                layoutId="tab-indicator"
                className="absolute top-0 h-[3px] w-8 rounded-full bg-wine-700"
                transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <MoreHorizontal className="h-5 w-5" />
            <span className={`text-caption leading-none ${moreActive ? 'font-semibold' : 'font-medium'}`}>Mais</span>
          </button>
        </div>
      </nav>

      {/* ================= FOLHA "MAIS" =================
          Bottom sheet no celular, painel lateral no desktop. Lista TUDO com
          rótulo — nada some do produto por não caber no rail. */}
      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-stretch lg:justify-start" role="dialog" aria-modal="true" aria-label="Todo o menu">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setMoreOpen(false)} />
          <div className="sheet-panel relative w-full lg:w-80 lg:h-full lg:rounded-none lg:ml-[96px] max-h-[85vh] lg:max-h-none overflow-y-auto scroll-touch safe-sheet lg:pb-6">
            <div className="sticky top-0 bg-surface px-5 pt-3 pb-3 flex items-center justify-between gap-3 border-b border-line">
              <div className="flex-1 flex justify-center lg:hidden">
                <span className="sheet-handle" aria-hidden />
              </div>
              <p className="hidden lg:block text-h3 text-heading">Menu</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar menu"
                className="tap absolute right-4 top-3 lg:static h-9 w-9 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-4 py-4 space-y-6">
              {GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="overline text-n-500 px-2 mb-1.5">{group.title}</p>
                  <div className="space-y-0.5">
                    {group.links.map((link) => {
                      const Icon = link.icon;
                      const active = isActiveHref(pathname, link.href);
                      const locked = lockedFor(link.href);
                      const badge = badgeFor(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMoreOpen(false)}
                          className={`tap flex items-center gap-3 min-h-11 px-2.5 rounded-control text-label transition-ui
                            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600
                            ${active ? 'bg-wine-50 text-wine-700 font-semibold' : 'text-ink hover:bg-n-100'}`}
                        >
                          <Icon className="h-5 w-5 shrink-0" />
                          <span className="flex-1">{link.label}</span>
                          {locked && <Lock className="h-4 w-4 text-n-400 shrink-0" />}
                          {badge > 0 && (
                            <span className="num text-caption font-semibold text-warning bg-warning-bg border border-warning-border rounded-full px-2 leading-5">
                              {badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div className="pt-2 border-t border-line space-y-0.5">
                <Link
                  href={`/agendar/${publicSlug}`}
                  target="_blank"
                  onClick={() => setMoreOpen(false)}
                  className="tap flex items-center gap-3 min-h-11 px-2.5 rounded-control text-label text-ink hover:bg-n-100 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                >
                  <ExternalLink className="h-5 w-5 shrink-0" />
                  <span className="flex-1">Ver página pública</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="tap flex w-full items-center gap-3 min-h-11 px-2.5 rounded-control text-label text-n-600 hover:bg-n-100 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-left">Sair da conta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ---------------------------------------------------------------
   Itens do rail. O tooltip aparece com 400ms de atraso — imediato,
   ele pisca a cada passagem de mouse rumo ao conteúdo.
   --------------------------------------------------------------- */

const RAIL_ITEM =
  'group relative flex items-center justify-center h-11 w-11 rounded-control transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600';

const Tooltip: React.FC<{ label: string }> = ({ label }) => (
  <span
    role="tooltip"
    className="rail-tooltip"
  >
    {label}
  </span>
);

const RailItem: React.FC<{
  href: string;
  label: string;
  active?: boolean;
  locked?: boolean;
  external?: boolean;
  children: React.ReactNode;
}> = ({ href, label, active, locked, external, children }) => (
  <Link
    href={href}
    target={external ? '_blank' : undefined}
    aria-label={label}
    aria-current={active ? 'page' : undefined}
    className={`${RAIL_ITEM} ${active ? 'bg-wine-700 text-white' : 'text-n-500 hover:bg-n-100 hover:text-heading'}`}
  >
    {children}
    {locked && <Lock className="absolute top-0.5 right-0.5 h-4 w-4 text-n-400" aria-hidden />}
    <Tooltip label={label} />
  </Link>
);

const RailButton: React.FC<{
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ label, active, onClick, children }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`${RAIL_ITEM} ${active ? 'bg-wine-700 text-white' : 'text-n-500 hover:bg-n-100 hover:text-heading'}`}
  >
    {children}
    <Tooltip label={label} />
  </button>
);

export default Sidebar;
