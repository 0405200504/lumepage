'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, ChevronRight, ShieldAlert, Menu } from 'lucide-react';
import { OPEN_ONBOARDING_EVENT } from '@/components/onboarding/OnboardingTour';
import { OPEN_NAV_EVENT } from '@/components/layout/Sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { LumeLogo } from '@/components/ui/LumeLogo';

interface HeaderProps {
  /** Opcionais: se omitidos, o título vem da rota (app da profissional).
   *  O admin continua passando title/subtitle explicitamente. */
  title?: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
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
  '/dashboard/mais-clientes': {
    title: 'Quero mais clientes',
    subtitle: 'A equipe Lume estrutura seu Instagram, seu Google, seus anúncios e seu WhatsApp para encher a sua agenda.',
    crumb: 'Seu negócio',
  },
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
 * A logo da Lume fica pequena no centro exato da faixa, no computador e no
 * celular. Quem garante é a grade de três colunas iguais (1fr · logo ·
 * 1fr): o título mora na coluna da esquerda e trunca antes de chegar na
 * logo, em vez de empurrá-la para o lado.
 *
 * No celular ela já ficou centrada no espaço entre o título e o "?", e
 * mudava de lugar a cada tela; o pedido foi o meio da tela, sempre. Com a
 * logo travada no meio sobram ~89px para o título num iPhone de 390px, por
 * isso lá ele desce para 18px (o tamanho de título da barra do iOS): metade
 * das telas cabe inteira, o resto trunca com reticências.
 *
 * No computador a faixa vira um cartão de cantos arredondados, solto no
 * cinza como a barra lateral vinho ao lado: mesmo recuo de 16px no topo,
 * mesmo raio, e as bordas alinhadas com as do conteúdo (1440 − 2×32). O
 * <header> continua ocupando a largura toda com o fundo cinza, e é ele que
 * esconde o conteúdo rolando por trás dos cantos. No celular nada muda:
 * faixa de ponta a ponta, 84/60px. O `lg:pt-4!` precisa do `!` porque o
 * `.pt-safe` mora fora de @layer e venceria.
 */
export const Header: React.FC<HeaderProps> = ({ title, subtitle, userName, userEmail, avatarUrl, role }) => {
  const pathname = usePathname();
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
      className="sticky top-0 z-30 select-none pt-safe transition-ui bg-surface border-b border-line shadow-xs
        lg:pt-4! lg:pb-3 lg:px-8 lg:bg-bg lg:border-b-0 lg:shadow-none"
    >
      <div
        className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] content-center items-center gap-3
          px-4 lg:px-6 max-w-[1400px] lg:max-w-[1376px] mx-auto w-full
          lg:bg-surface lg:rounded-hero lg:shadow-sm
          h-[84px] data-[scrolled]:h-[60px] lg:h-20 lg:data-[scrolled]:h-[68px]
          transition-[height] duration-[var(--dur-base)] ease-[var(--ease-out)]"
        data-scrolled={scrolled || undefined}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* O menu completo abre AQUI, no topo — em todas as áreas, inclusive
              no painel da profissional.

              Ele já morou aqui, saiu para o item "Mais" do dock inferior (o
              polegar alcança o rodapé melhor do que o canto superior esquerdo)
              e voltou a pedido: o ícone de grade no meio de uma cápsula escura
              não se anunciava como "menu", e a gaveta lateral — que é onde
              moram os dezoito destinos — simplesmente não era encontrada.
              Hambúrguer no topo é o gesto que todo mundo já procura primeiro.

              O dock do rodapé continua existindo com os quatro atalhos do dia
              a dia; o que saiu de lá foi só o botão de abrir.

              No computador ele não existe: lá a barra lateral abre sozinha com o
              mouse em cima. O lg:hidden fica no invólucro, não no botão — o
              .icon-chip mora fora de @layer e venceria o lg:hidden nele. */}
          <div className="lg:hidden -ml-1.5 shrink-0">
            <button
              type="button"
              className="icon-chip h-11 w-11
                focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
              aria-label="Abrir menu de navegação"
              onClick={() => window.dispatchEvent(new Event(OPEN_NAV_EVENT))}
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
          </div>

          <div className="min-w-0" data-tour="page-header">
            {crumb && (
              <p className="hidden lg:flex items-center gap-1 text-caption font-medium text-n-500 mb-1">
                <Link href="/dashboard" className="hover:text-heading transition-ui">Painel</Link>
                <ChevronRight className="h-3.5 w-3.5 text-n-300" aria-hidden />
                <span>{crumb}</span>
              </p>
            )}
            <h1 className="text-h3 lg:text-h2 text-heading truncate">{resolvedTitle}</h1>
            {resolvedSubtitle && !scrolled && (
              <p className="hidden lg:block text-caption text-n-500 mt-1 max-w-2xl truncate">
                {resolvedSubtitle}
              </p>
            )}
          </div>
        </div>

        <Link
          href="/dashboard"
          aria-label="Lume — ir para o Início"
          className="rounded-chip focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
        >
          <LumeLogo variant="wine" className="h-6 max-w-none" />
        </Link>

        {/* Ações em disco, sem rótulo disputando com o título. O botão de
            atualizar os dados saiu daqui: as telas já se atualizam sozinhas
            depois de cada ação, e ele só tirava espaço da logo. */}
        <div className="flex items-center gap-2 justify-self-end">
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

          {/* No celular o avatar é a porta das configurações (perfil, foto,
              regras da agenda): é o canto em que todo app guarda "sua conta". */}
          {role === 'super_admin' ? (
            <span title={`${userName} · ${userEmail}`} className="lg:hidden ml-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-wine-50 text-wine-700">
              <ShieldAlert className="h-5 w-5" />
            </span>
          ) : (
            <Link
              href="/dashboard/settings"
              title={`${userName} · ${userEmail}`}
              aria-label="Sua conta e configurações"
              className="lg:hidden ml-0.5 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
            >
              <Avatar name={userName} src={avatarUrl} size="sm" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
