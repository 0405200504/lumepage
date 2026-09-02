'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, HelpCircle, ChevronRight, ShieldAlert, Menu } from 'lucide-react';
import { OPEN_ONBOARDING_EVENT } from '@/components/onboarding/OnboardingTour';
import { OPEN_NAV_EVENT } from '@/components/layout/Sidebar';
import { Avatar } from '@/components/ui/Avatar';

interface HeaderProps {
  /** Opcionais: se omitidos, o título vem da rota (app da profissional).
   *  O admin continua passando title/subtitle explicitamente. */
  title?: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  role: 'super_admin' | 'professional';
}

/** Mapa rota → título/subtítulo/trilha (app da profissional). */
const ROUTE_META: Record<string, { title: string; subtitle?: string; crumb?: string }> = {
  '/dashboard': {
    title: 'Início',
    subtitle: 'Seu dia, seu faturamento e o que precisa de atenção.',
  },
  '/dashboard/agenda': {
    title: 'Agenda',
    subtitle: 'Ano, mês e semana — agendamentos, feriados e tarefas (arraste para remarcar).',
    crumb: 'Atendimento',
  },
  '/dashboard/appointments': {
    title: 'Agendamentos',
    subtitle: 'Acompanhe, aprove e gerencie os horários agendados pelas suas clientes.',
    crumb: 'Atendimento',
  },
  '/dashboard/waitlist': {
    title: 'Lista de espera',
    subtitle: 'Clientes aguardando horário — contate, encaixe ou organize as solicitações.',
    crumb: 'Atendimento',
  },
  '/dashboard/tasks': {
    title: 'Tarefas e notas',
    subtitle: 'Anote o que é importante. Com data e horário, a tarefa aparece na sua Agenda.',
    crumb: 'Atendimento',
  },
  '/dashboard/availability': {
    title: 'Disponibilidade',
    subtitle: 'Configure o horário de funcionamento e o intervalo de almoço de cada dia.',
    crumb: 'Seu negócio',
  },
  '/dashboard/blocks': {
    title: 'Bloqueios',
    subtitle: 'Feche dias ou horas do expediente para folgas, imprevistos e atendimentos externos.',
    crumb: 'Seu negócio',
  },
  '/dashboard/clients': {
    title: 'Contatos',
    subtitle: 'Histórico, clientes sumidas e faltas — tudo o que ajuda a fidelizar.',
    crumb: 'Clientes',
  },
  '/dashboard/anamnese': {
    title: 'Fichas de anamnese',
    subtitle: 'Crie fichas, envie por link para as clientes responderem e receba tudo em PDF.',
    crumb: 'Clientes',
  },
  '/dashboard/finance': {
    title: 'Contas',
    subtitle: 'O que entrou, o que saiu, lucro e quanto sobrou.',
    crumb: 'Dinheiro',
  },
  '/dashboard/sales': { title: 'Vendas', crumb: 'Dinheiro' },
  '/dashboard/services': {
    title: 'Serviços',
    subtitle: 'Procedimentos, durações e valores exibidos na sua página de agendamento.',
    crumb: 'Seu negócio',
  },
  '/dashboard/site': { title: 'Minha Página', crumb: 'Seu negócio' },
  '/dashboard/settings': {
    title: 'Configurações',
    subtitle: 'Contato, regras comerciais para novos agendamentos e cores de marca.',
    crumb: 'Seu negócio',
  },
  '/dashboard/whatsapp': {
    title: 'Mensagens automáticas',
    subtitle: 'Conecte seu número e escolha o que o Lume envia sozinho: confirmação, lembrete e retorno.',
    crumb: 'Clientes',
  },
  '/dashboard/whatsapp/conversas': {
    title: 'WhatsApp',
    subtitle: 'Leia e responda as conversas do seu número sem sair do Lume.',
    crumb: 'Clientes',
  },
};

/**
 * Topbar da página.
 *
 * Fundo transparente sobre o cinza da aplicação; o blur e a divisória só
 * entram DEPOIS de 8px de rolagem — em repouso a barra não desenha uma
 * linha que não precisa existir.
 *
 * O título subiu para `h2` (24px/700) e a trilha virou uma linha de
 * legenda comum, sem caixa alta. As ações da direita viraram discos: é a
 * gramática de botão de ícone das referências, e ela resolve o problema de
 * ter dois botões retangulares de tamanhos diferentes lado a lado no canto.
 *
 * No celular ela colapsa: em repouso mostra título e subtítulo; ao rolar,
 * encolhe e mantém só o título com as ações.
 */
export const Header: React.FC<HeaderProps> = ({ title, subtitle, userName, userEmail, role }) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const meta = ROUTE_META[pathname];
  const resolvedTitle = title ?? meta?.title ?? 'Lume';
  const resolvedSubtitle = subtitle ?? meta?.subtitle;
  const crumb = meta?.crumb;

  return (
    <header
      data-scrolled={scrolled || undefined}
      className="sticky top-0 z-30 select-none pt-safe transition-ui bg-surface border-b border-line shadow-xs"
    >
      <div
        className="flex items-center gap-3 px-4 lg:px-8 max-w-[1400px] mx-auto w-full
          h-[84px] data-[scrolled]:h-[60px] lg:h-20 lg:data-[scrolled]:h-[68px]
          transition-[height] duration-[var(--dur-base)] ease-[var(--ease-out)]"
        data-scrolled={scrolled || undefined}
      >
        {/* O menu completo abre AQUI, no topo — em todas as áreas, inclusive
            no painel da profissional.

            Ele já morou aqui, saiu para o item "Mais" do dock inferior (o
            polegar alcança o rodapé melhor do que o canto superior esquerdo)
            e voltou a pedido: o ícone de grade no meio de uma cápsula escura
            não se anunciava como "menu", e a gaveta lateral — que é onde
            moram os dezoito destinos — simplesmente não era encontrada.
            Hambúrguer no topo é o gesto que todo mundo já procura primeiro.

            O dock do rodapé continua existindo com os quatro atalhos do dia
            a dia; o que saiu de lá foi só o botão de abrir. */}
        <button
          type="button"
          className="lg:hidden icon-chip h-11 w-11 -ml-1.5 shrink-0
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          aria-label="Abrir menu de navegação"
          onClick={() => window.dispatchEvent(new Event(OPEN_NAV_EVENT))}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>

        <div className="min-w-0 flex-1" data-tour="page-header">
          {crumb && (
            <p className="hidden lg:flex items-center gap-1 text-caption font-medium text-n-500 mb-1">
              <Link href="/dashboard" className="hover:text-heading transition-ui">Painel</Link>
              <ChevronRight className="h-3.5 w-3.5 text-n-300" aria-hidden />
              <span>{crumb}</span>
            </p>
          )}
          <h1 className="text-h2 text-heading truncate">{resolvedTitle}</h1>
          {resolvedSubtitle && !scrolled && (
            <p className="hidden lg:block text-caption text-n-500 mt-1 max-w-2xl truncate">
              {resolvedSubtitle}
            </p>
          )}
        </div>

        {/* Ações em disco. Ajuda e atualizar são do mesmo peso — nenhuma das
            duas merece um botão com rótulo disputando com o título ao lado. */}
        <div className="flex items-center gap-2 shrink-0">
          {role === 'professional' && (
            <button
              type="button"
              aria-label="Rever o tutorial de boas-vindas"
              title="Rever o tutorial de boas-vindas"
              onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
              className="icon-chip h-10 w-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <HelpCircle className="h-[18px] w-[18px]" aria-hidden />
            </button>
          )}

          <button
            type="button"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={isRefreshing}
            aria-label="Atualizar os dados"
            title="Atualizar os dados sem recarregar a página"
            className="icon-chip h-10 w-10 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>

          <span title={`${userName} · ${userEmail}`} className="lg:hidden ml-0.5">
            {role === 'super_admin' ? (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-wine-50 text-wine-700">
                <ShieldAlert className="h-5 w-5" />
              </span>
            ) : (
              <Avatar name={userName} size="sm" />
            )}
          </span>
        </div>
      </div>
    </header>
  );
};

export default Header;
