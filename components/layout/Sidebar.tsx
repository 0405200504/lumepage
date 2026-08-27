'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  CalendarDays, CalendarRange, Clock, Settings, Sparkles, Lock,
  LayoutDashboard, LogOut, ExternalLink, Wallet, NotebookPen, Hourglass,
  MessageCircle, Smartphone, Bot, ShoppingBag, Contact, ClipboardList, Globe,
  X, PanelLeftClose, PanelLeftOpen, LayoutGrid,
} from 'lucide-react';
import { AI_ATTENDANCE_ENABLED } from '@/lib/whatsapp/flags';
import { useToast } from '../ui/Toast';
import { LumeLogo } from '../ui/LumeLogo';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Badge } from '../ui/StatusPill';
import { ROUTE_CAPABILITY, can } from '@/lib/subscription/entitlements';
import { OPEN_AI_EVENT } from '../ai/AIAgentChat';

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

/** Menu completo, agrupado. Fonte de verdade do rail aberto e do drawer. */
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

/**
 * O rail RECOLHIDO não mostra os dezoito destinos.
 *
 * Esta é a resposta direta a "a barra está feia e cheia de informação":
 * dezoito ícones empilhados numa coluna de 72px passam de 850px de altura,
 * não cabem sem rolagem em notebook nenhum, e nenhum deles se destaca —
 * o olho não tem onde pousar. As referências mostram cinco ou seis, e
 * escondem o resto atrás de um botão.
 *
 * Estes são os seis do dia a dia. O menu completo continua a UM gesto de
 * distância: passar o mouse (ou tocar em "Todas as áreas") abre o rail com
 * os quatro grupos inteiros.
 */
const PRIMARY_HREFS = [
  '/dashboard',
  '/dashboard/agenda',
  '/dashboard/clients',
  '/dashboard/whatsapp/conversas',
  '/dashboard/finance',
  '/dashboard/services',
];

const ALL_LINKS = GROUPS.flatMap((g) => g.links);
const PRIMARY_LINKS = PRIMARY_HREFS
  .map((href) => ALL_LINKS.find((l) => l.href === href))
  .filter((l): l is NavLink => !!l);

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

  // Recolhido: disco de 44px, ativo em vinho chapado. O rótulo aparece no
  // tooltip escuro depois de 400ms — tempo suficiente para não piscar
  // quando o mouse só está atravessando a barra rumo ao conteúdo.
  if (!showLabel) {
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        data-active={active ? 'true' : undefined}
        className="group rail-item mx-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
      >
        <Icon className="h-5 w-5" />
        {locked && (
          <Lock className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 text-n-400 bg-surface rounded-full p-px" aria-hidden />
        )}
        {badge > 0 && (
          <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-wine-700 ring-2 ring-surface" aria-hidden />
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
      className="rail-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="flex-1 truncate">{link.label}</span>
      {locked && <Lock className="h-4 w-4 shrink-0 opacity-60" aria-hidden />}
      {badge > 0 && (
        <Badge tone={active ? 'neutral' : 'accent'} className={active ? 'bg-white/20 text-white' : ''}>
          {badge}
        </Badge>
      )}
    </Link>
  );
};

/** Corpo da navegação.
 *
 *  Recolhido: só os seis primários, sem título de grupo e sem divisória —
 *  seis discos alinhados, e nada mais.
 *  Aberto: os quatro grupos completos, com o título em cinza-claro. */
const NavBody: React.FC<{
  pathname: string;
  showLabel: boolean;
  lockedFor: (href: string) => boolean;
  badgeFor: (href: string) => number;
  onNavigate?: () => void;
  /** Botão "todas as áreas" — só existe no rail recolhido do desktop. */
  onExpand?: () => void;
}> = ({ pathname, showLabel, lockedFor, badgeFor, onNavigate, onExpand }) => {
  if (!showLabel) {
    return (
      <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full px-2 py-3 flex flex-col items-center gap-1.5" aria-label="Navegação principal">
        {PRIMARY_LINKS.map((link) => (
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
        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="group rail-item mt-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            aria-label="Ver todas as áreas"
          >
            <LayoutGrid className="h-5 w-5" />
            <span className="rail-tooltip top-1/2 -translate-y-1/2">Todas as áreas</span>
          </button>
        )}
      </nav>
    );
  }

  return (
    <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none w-full px-3 py-3 space-y-5" aria-label="Navegação principal">
      {GROUPS.map((group) => (
        <div key={group.title}>
          <p className="text-micro font-bold uppercase tracking-[0.07em] text-n-400 px-3 mb-1.5">
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

/** Rodapé: conta, página pública e sair.
 *
 *  Eram três linhas soltas de 44px empilhadas com uma borda em cima. Viraram
 *  DUAS: a linha da conta (avatar + nome + sair) e o link da página pública.
 *  O "Sair" perdeu a linha inteira e virou o ícone à direita do nome, que é
 *  onde qualquer pessoa já procura por ele. */
const NavFooter: React.FC<{
  showLabel: boolean;
  publicSlug: string;
  displayName: string;
  onLogout: () => void;
  onNavigate?: () => void;
}> = ({ showLabel, publicSlug, displayName, onLogout, onNavigate }) => {
  if (!showLabel) {
    return (
      <div className="shrink-0 w-full px-2 pb-3 pt-2 flex flex-col items-center gap-1.5">
        <Link
          href={`/agendar/${publicSlug}`}
          target="_blank"
          onClick={onNavigate}
          className="group rail-item focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          aria-label="Ver página pública"
        >
          <ExternalLink className="h-5 w-5" />
          <span className="rail-tooltip top-1/2 -translate-y-1/2">Ver página pública</span>
        </Link>
        <span className="mt-1"><Avatar name={displayName} size="sm" /></span>
      </div>
    );
  }

  return (
    <div className="shrink-0 w-full px-3 pb-3 pt-2 space-y-1">
      <Link
        href={`/agendar/${publicSlug}`}
        target="_blank"
        onClick={onNavigate}
        className="rail-row focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
      >
        <ExternalLink className="h-5 w-5 shrink-0" />
        <span className="flex-1 truncate">Ver página pública</span>
      </Link>

      <div className="flex items-center gap-3 h-14 px-3 rounded-chip bg-surface-2">
        <Avatar name={displayName} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block text-body-sm font-bold text-heading truncate">{displayName}</span>
          <span className="block text-caption text-n-500">Sua conta</span>
        </span>
        <button
          onClick={onLogout}
          title="Sair da conta"
          aria-label="Sair da conta"
          className="icon-chip h-9 w-9 shrink-0 bg-surface hover:bg-danger-bg hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
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
          76px recolhido, 272px aberto no hover.

          A largura É animada aqui, contra a regra geral — mas o painel é
          `fixed`, fora do fluxo, e o <aside> ao lado reserva uma faixa de
          largura CONSTANTE. Ou seja: o conteúdo da página não relayoutiza,
          e a barra abre por cima em vez de empurrar a tela inteira. */}
      <aside className="hidden lg:block shrink-0 w-[100px]" aria-label="Navegação principal">
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          data-expanded={expanded || undefined}
          className={`fixed left-4 top-4 bottom-4 z-40 flex flex-col
            bg-surface rounded-hero shadow-[var(--shadow-sm)]
            transition-[width,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]
            ${expanded ? 'w-[272px] shadow-[var(--shadow-lg)]' : 'w-[76px]'}`}
        >
          <div className={`shrink-0 flex items-center h-16 ${expanded ? 'justify-between px-5' : 'justify-center'}`}>
            <Link
              href="/dashboard"
              className="flex items-center rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              aria-label="Lume — Início"
            >
              <LumeLogo variant="wine" className={expanded ? 'h-5' : 'h-4'} />
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

          <NavBody
            pathname={pathname}
            showLabel={expanded}
            lockedFor={lockedFor}
            badgeFor={badgeFor}
            onExpand={togglePinned}
          />
          <NavFooter showLabel={expanded} publicSlug={publicSlug} displayName={displayName} onLogout={handleLogout} />
        </div>
      </aside>

      {/* ================= GAVETA (mobile <1024px) =================
          Aberta pelo item "Mais" do dock inferior. */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Menu de navegação">
          <div className="sheet-backdrop absolute inset-0" onClick={() => setDrawerOpen(false)} />
          <aside className="relative w-[88%] max-w-xs h-full bg-surface shadow-[var(--shadow-lg)] flex flex-col animate-slide-right rounded-r-hero overflow-hidden">
            <div className="shrink-0 flex items-center justify-between h-16 px-5 pt-safe">
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

            {/* ⚠️ A DIVISÓRIA aqui não é enfeite.
                A lista de destinos ROLA (dezoito itens não cabem em nenhuma
                tela de celular) e este bloco fica FIXO no rodapé da gaveta.
                Sem uma linha separando os dois, o corte da rolagem cai no meio
                da lista e o último título de grupo visível — "Dinheiro", por
                exemplo — aparece encostado em "Assistente IA", como se este
                pertencesse àquele grupo. A linha diz "o que vem abaixo é outra
                coisa" e, de quebra, denuncia que a lista continua acima.

                O Assistente IA está aqui, e não flutuando sobre o conteúdo,
                porque no celular ele disputava o canto inferior direito com o
                FAB de novo agendamento e os dois cobriam a coluna de valores
                em /finance e /services. */}
            <div className="shrink-0 border-t border-line pt-2">
              <div className="px-3 pb-1">
                <button
                  type="button"
                  onClick={() => { setDrawerOpen(false); window.dispatchEvent(new Event(OPEN_AI_EVENT)); }}
                  className="rail-row w-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-wine-700"
                >
                  <Sparkles className="h-5 w-5 shrink-0 text-wine-700" aria-hidden />
                  <span className="flex-1 text-left truncate">Assistente IA</span>
                </button>
              </div>
              <div className="safe-sheet">
                <NavFooter showLabel publicSlug={publicSlug} displayName={displayName} onLogout={handleLogout} onNavigate={() => setDrawerOpen(false)} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default Sidebar;
