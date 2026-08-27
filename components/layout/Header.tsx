'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { RefreshCw, HelpCircle, ChevronRight, ShieldAlert } from 'lucide-react';
import { OPEN_ONBOARDING_EVENT } from '@/components/onboarding/OnboardingTour';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';

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
  '/dashboard/whatsapp': { title: 'WhatsApp', crumb: 'Clientes' },
  '/dashboard/whatsapp/conversas': { title: 'Conversas', crumb: 'Clientes' },
};

/**
 * Topbar de 64px.
 *
 * Fundo transparente sobre o off-white da aplicação; o blur e a borda
 * inferior só entram DEPOIS de 8px de rolagem — em repouso a barra não
 * desenha uma linha que não precisa existir.
 *
 * No celular ela colapsa: em repouso mostra saudação em duas linhas; ao
 * rolar, encolhe para 52px com o título e as ações.
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
      className="sticky top-0 z-30 select-none pt-safe transition-ui
        data-[scrolled]:border-b data-[scrolled]:border-line
        data-[scrolled]:bg-bg/80 data-[scrolled]:backdrop-blur-[20px]"
    >
      <div
        className="flex items-center gap-3 px-4 lg:px-8 max-w-[1400px] mx-auto w-full
          h-[76px] data-[scrolled]:h-[52px] lg:h-16 lg:data-[scrolled]:h-16 transition-[height] duration-[220ms] ease-out"
        data-scrolled={scrolled || undefined}
      >
        <div className="min-w-0 flex-1" data-tour="page-header">
          {crumb && (
            <p className="hidden lg:flex items-center gap-1 text-caption text-n-500 mb-0.5">
              <Link href="/dashboard" className="hover:text-heading transition-ui">Painel</Link>
              <ChevronRight className="h-4 w-4" aria-hidden />
              <span>{crumb}</span>
            </p>
          )}
          <h1 className="text-h2 text-heading truncate">{resolvedTitle}</h1>
          {resolvedSubtitle && !scrolled && (
            <p className="hidden lg:block text-caption text-n-500 mt-0.5 max-w-2xl truncate">
              {resolvedSubtitle}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {role === 'professional' && (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              aria-label="Rever o tutorial de boas-vindas"
              title="Rever o tutorial de boas-vindas"
              onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
              leadingIcon={<HelpCircle className="h-5 w-5" />}
            />
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => startRefresh(() => router.refresh())}
            disabled={isRefreshing}
            title="Atualizar os dados sem recarregar a página"
            leadingIcon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            className="max-lg:w-9 max-lg:px-0"
          >
            <span className="hidden lg:inline">{isRefreshing ? 'Atualizando…' : 'Atualizar'}</span>
          </Button>

          <span title={`${userName} · ${userEmail}`} className="lg:hidden">
            {role === 'super_admin' ? (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-wine-50 text-wine-700">
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
