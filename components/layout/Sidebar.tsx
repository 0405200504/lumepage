'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, CalendarRange, Clock, Settings, Sparkles, Lock,
  LayoutDashboard, LogOut, ExternalLink, Wallet, NotebookPen, Hourglass,
  MessageCircle, Smartphone, Bot, ShoppingBag, Contact, ClipboardList, Globe,
  X, Mic,
} from 'lucide-react';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';
import { Avatar } from '../ui/Avatar';
import { Badge } from '../ui/StatusPill';
import { SplashSoundToggle } from '../ui/SplashSoundToggle';
import { ROUTE_CAPABILITY, can } from '@/lib/subscription/entitlements';
import { OPEN_AI_EVENT, talkToAna } from '../ai/AIAgentChat';
import { AnaStar } from '../ai/AnaBrand';

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
  avatarUrl?: string | null;
  plan?: string | null;
  /** Aplicar limites de plano (só conta nova com assinatura ativa). */
  enforcePlan?: boolean;
  pendingConversations?: number;
}

type NavLink = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

/** Menu completo, agrupado. Fonte de verdade do rail e da gaveta. */
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
      { href: '/dashboard/whatsapp/conversas', label: 'WhatsApp', icon: MessageCircle },
      { href: '/dashboard/whatsapp', label: 'Mensagens automáticas', icon: Smartphone },
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

  // Recolhido: disco de 40px; ativo em branco sobre o vinho. Com o mouse a
  // barra inteira abre com os nomes; o tooltip fica para quem navega pelo
  // teclado (aparece no foco).
  if (!showLabel) {
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : undefined}
        className="group rail-item mx-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <Icon className="h-5 w-5" />
        {locked && (
          <Lock className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-white/70 bg-wine-800 rounded-full p-px" aria-hidden />
        )}
        {badge > 0 && (
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-white ring-2 ring-wine-800" aria-hidden />
        )}
        <span className="rail-tooltip top-1/2 -translate-y-1/2">{link.label}</span>
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      data-active={active ? 'true' : undefined}
      className="rail-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 truncate">{link.label}</span>
      {locked && <Lock className="h-4 w-4 shrink-0 opacity-60" aria-hidden />}
      {badge > 0 && (
        <Badge tone="neutral" className={active ? 'bg-wine-700 text-white' : 'bg-white/20 text-white'}>
          {badge}
        </Badge>
      )}
    </Link>
  );
};

/** Corpo da navegação.
 *
 *  Recolhido: TODOS os destinos, só o ícone, com um fio entre os grupos. O
 *  rail não esconde mais nada atrás de um botão — o que ela procura está
 *  sempre à vista, e o nome aparece quando o mouse abre a barra.
 *  Aberto: os mesmos grupos, com título e rótulo. */
const NavBody: React.FC<{
  pathname: string;
  showLabel: boolean;
  lockedFor: (href: string) => boolean;
  badgeFor: (href: string) => number;
  onNavigate?: () => void;
}> = ({ pathname, showLabel, lockedFor, badgeFor, onNavigate }) => {
  if (!showLabel) {
    return (
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full px-2 py-2 flex flex-col items-center" aria-label="Navegação principal">
        {GROUPS.map((group, gi) => (
          <React.Fragment key={group.title}>
            {gi > 0 && <span className="my-1.5 h-px w-6 bg-white/15 shrink-0" aria-hidden />}
            <div className="flex flex-col items-center gap-1">
              {group.links.map((link) => (
                <NavItem
                  key={link.href}
                  link={link}
                  active={isActiveHref(pathname, link.href)}
                  locked={lockedFor(link.href)}
                  badge={badgeFor(link.href)}
                  showLabel={false}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </React.Fragment>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full px-3 py-3 space-y-5" aria-label="Navegação principal">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-micro font-bold uppercase tracking-[0.07em] text-white/50 px-3 mb-1.5">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.links.map((link) => (
              <NavItem
                key={link.href}
                link={link}
                active={isActiveHref(pathname, link.href)}
                locked={lockedFor(link.href)}
                badge={badgeFor(link.href)}
                showLabel
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
};

/** Rodapé: conta, página pública e sair. */
const NavFooter: React.FC<{
  showLabel: boolean;
  publicSlug: string;
  displayName: string;
  avatarUrl?: string | null;
  onLogout: () => void;
  onNavigate?: () => void;
}> = ({ showLabel, publicSlug, displayName, avatarUrl, onLogout, onNavigate }) => {
  if (!showLabel) {
    return (
      <div className="shrink-0 w-full px-2 pb-3 pt-2 flex flex-col items-center gap-1.5 border-t border-white/15">
        <Link
          href={`/agendar/${publicSlug}`}
          target="_blank"
          onClick={onNavigate}
          className="group rail-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Ver página pública"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="rail-tooltip top-1/2 -translate-y-1/2">Ver página pública</span>
        </Link>
        <Link
          href="/dashboard/settings"
          onClick={onNavigate}
          className="group rail-item mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          aria-label="Sua conta e configurações"
        >
          <Avatar name={displayName} src={avatarUrl} size="sm" />
          <span className="rail-tooltip top-1/2 -translate-y-1/2">{displayName}</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-full px-3 pb-3 pt-2 space-y-1 border-t border-white/15">
      <Link
        href={`/agendar/${publicSlug}`}
        target="_blank"
        onClick={onNavigate}
        className="rail-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
      >
        <ExternalLink className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate">Ver página pública</span>
      </Link>

      {/* Só na versão com rótulo: no rail fechado seria mais um ícone mudo
          disputando espaço com os destinos. */}
      <SplashSoundToggle />

      <div className="flex items-center gap-3 h-14 px-3 rounded-chip bg-white/10">
        <Link href="/dashboard/settings" onClick={onNavigate} className="flex items-center gap-3 min-w-0 flex-1 rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
          <Avatar name={displayName} src={avatarUrl} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block text-body-sm font-bold text-white truncate">{displayName}</span>
            <span className="block text-caption text-white/60">Sua conta</span>
          </span>
        </Link>
        <button
          onClick={onLogout}
          title="Sair da conta"
          aria-label="Sair da conta"
          className="inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-full bg-white/10 text-white hover:bg-white hover:text-wine-700 transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

function isActiveHref(pathname: string, href: string) {
  if (href === '/dashboard') return pathname === '/dashboard';
  return pathname === href || pathname.startsWith(href + '/');
}

export const Sidebar: React.FC<SidebarProps> = ({ role, name, brandName, slug, avatarUrl, plan, enforcePlan, pendingConversations }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { success, error } = useToast();

  // Desktop: recolhida (só os ícones) e abre com os nomes ao passar o mouse;
  // tirou o mouse, recolhe sozinha. Sem botão de fixar nem estado salvo: uma
  // barra presa aberta desmentiria o "recolhe sozinha".
  //
  // Os dois atrasos são curtos de propósito: o de abrir só filtra o mouse que
  // ATRAVESSA a barra a caminho de outro lugar; o de fechar perdoa a mão que
  // escapa um instante da borda enquanto mira um item.
  const [expanded, setExpanded] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverTo = (open: boolean) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setExpanded(open), open ? 90 : 180);
  };
  useEffect(() => () => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }, []);

  // Mobile: gaveta, aberta pelo hambúrguer do topo.
  const [drawerOpen, setDrawerOpen] = useState(false);

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
          A superfície vinho da tela — UMA por tela, e aqui é ela: a barra
          escura dá contraste com qualquer aba, que é sempre clara.

          76px recolhido, 272px com o mouse em cima. O painel é `fixed`, fora
          do fluxo, e o <aside> ao lado reserva uma faixa de largura CONSTANTE:
          o conteúdo da página não relayoutiza, a barra abre por cima. */}
      <aside className="hidden lg:block shrink-0 w-[100px]" aria-label="Navegação principal">
        <div
          onMouseEnter={() => hoverTo(true)}
          onMouseLeave={() => hoverTo(false)}
          data-expanded={expanded || undefined}
          className={`rail-wine surface-wine text-white fixed left-4 top-4 bottom-4 z-40 flex flex-col
            rounded-hero shadow-[var(--shadow-md)]
            transition-[width] duration-[var(--dur-base)] ease-[var(--ease-out)]
            ${expanded ? 'w-[272px]' : 'w-[76px]'}`}
        >
          <div className={`shrink-0 flex items-center h-16 ${expanded ? 'px-5' : 'justify-center'}`}>
            <Link
              href="/dashboard"
              className="flex items-center rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              aria-label="Lume — Início"
            >
              {expanded
                ? <LumeLogo variant="light" className="h-8" />
                : <LumeLogo variant="light" star className="h-7" />}
            </Link>
          </div>

          <NavBody
            pathname={pathname}
            showLabel={expanded}
            lockedFor={lockedFor}
            badgeFor={badgeFor}
          />
          <NavFooter showLabel={expanded} publicSlug={publicSlug} displayName={displayName} avatarUrl={avatarUrl} onLogout={handleLogout} />
        </div>
      </aside>

      {/* ================= GAVETA (mobile <1024px) =================
          Aberta pelo hambúrguer do topo. Mesma superfície vinho do rail. */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <aside className="rail-wine surface-wine text-white relative w-[88%] max-w-xs h-full shadow-[var(--shadow-lg)] flex flex-col animate-slide-right rounded-r-hero overflow-hidden">
            <div className="shrink-0 pt-safe">
              <div className="flex items-center justify-between h-16 px-5">
                <LumeLogo variant="light" className="h-8" />
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setDrawerOpen(false)}
                  className="group rail-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <NavBody pathname={pathname} showLabel lockedFor={lockedFor} badgeFor={badgeFor} onNavigate={() => setDrawerOpen(false)} />

            {/* ⚠️ A DIVISÓRIA aqui não é enfeite.
                A lista de destinos ROLA (dezoito itens não cabem em nenhuma
                tela de celular) e este bloco fica FIXO no rodapé da gaveta.
                Sem uma linha separando os dois, o corte da rolagem cai no meio
                da lista e o último título de grupo visível aparece encostado
                em "Ana", como se ela pertencesse àquele grupo. */}
            <div className="shrink-0 border-t border-white/15 pt-2">
              {/* Ana: a linha abre o chat; o microfone começa a conversa por
                  voz direto, como no botão de cetim do canto. */}
              <div className="px-3 pb-1 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setDrawerOpen(false); window.dispatchEvent(new Event(OPEN_AI_EVENT)); }}
                  className="rail-row flex-1 min-w-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                >
                  <AnaStar className="h-5" />
                  <span className="flex-1 text-left truncate">Ana</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setDrawerOpen(false); talkToAna(); }}
                  aria-label="Falar com a Ana por voz"
                  title="Falar com a Ana"
                  className="rail-row w-11 shrink-0 justify-center !px-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
                >
                  <Mic className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <div className="safe-sheet">
                <NavFooter showLabel publicSlug={publicSlug} displayName={displayName} avatarUrl={avatarUrl} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
