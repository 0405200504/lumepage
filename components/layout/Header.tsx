'use client';

import React, { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { User, ShieldAlert, RefreshCw, HelpCircle } from 'lucide-react';
import { OPEN_ONBOARDING_EVENT } from '@/components/onboarding/OnboardingTour';

interface HeaderProps {
  /** Opcionais: se omitidos, o título é derivado da rota atual (usado no app do profissional).
   *  O admin continua passando title/subtitle explicitamente. */
  title?: string;
  subtitle?: string;
  userName: string;
  userEmail: string;
  role: 'super_admin' | 'professional';
}

// Mapa rota → título/subtítulo (app do profissional).
const ROUTE_META: Record<string, { title: string; subtitle?: string }> = {
  '/dashboard': {
    title: 'Início',
    subtitle: 'Acompanhe suas estatísticas operacionais de hoje e os próximos atendimentos marcados.',
  },
  '/dashboard/agenda': {
    title: 'Agenda',
    subtitle: 'Ano, mês e semana — agendamentos, feriados e tarefas (arraste para remarcar).',
  },
  '/dashboard/appointments': {
    title: 'Gestão de Agendamentos',
    subtitle: 'Acompanhe, aprove e gerencie os horários agendados pelos seus clientes finais.',
  },
  '/dashboard/waitlist': {
    title: 'Lista de Espera',
    subtitle: 'Clientes aguardando horário — contate, encaixe ou organize as solicitações.',
  },
  '/dashboard/availability': {
    title: 'Disponibilidade Semanal',
    subtitle: 'Configure o seu horário de funcionamento regular e intervalo de almoço para cada dia da semana.',
  },
  '/dashboard/blocks': {
    title: 'Bloqueio de Horários',
    subtitle: 'Feche dias específicos ou horas do expediente para folgas, imprevistos ou atendimentos externos.',
  },
  '/dashboard/clients': {
    title: 'Carteira de Clientes',
    subtitle: 'Acompanhe histórico, reative clientes sumidas e monitore faltas para fidelizar mais.',
  },
  '/dashboard/finance': {
    title: 'Contas',
    subtitle: 'Seu controle financeiro completo: o que entrou, o que saiu, lucro e quanto sobrou.',
  },
  '/dashboard/services': {
    title: 'Catálogo de Serviços',
    subtitle: 'Defina os procedimentos, tempos de duração e os valores exibidos para os seus clientes na página de agendamentos.',
  },
  '/dashboard/settings': {
    title: 'Configurações da Conta',
    subtitle: 'Customize suas informações de contato, regras comerciais para novos agendamentos e cores de marca.',
  },
  '/dashboard/tasks': {
    title: 'Tarefas & Notas',
    subtitle: 'Anote o que é importante. Com data e horário, a tarefa aparece na sua Agenda.',
  },
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  userName,
  userEmail,
  role,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const handleRefresh = () => startRefresh(() => router.refresh());
  const meta = ROUTE_META[pathname];
  const resolvedTitle = title ?? meta?.title ?? 'Lume';
  const resolvedSubtitle = subtitle ?? meta?.subtitle;

  return (
    <header className="flex justify-between items-center gap-3 glass hairline-b px-4 sm:px-6 py-3.5 sm:py-5 pt-safe sticky top-0 z-30 select-none">
      <div className="min-w-0" data-tour="page-header">
        <h2 className="text-xl font-black text-ink tracking-tight leading-tight truncate">{resolvedTitle}</h2>
        {/* Subtítulo descritivo só no desktop — no celular o header fica enxuto, cara de app */}
        {resolvedSubtitle && <p className="hidden sm:block text-xs text-gray-450 mt-1 max-w-2xl">{resolvedSubtitle}</p>}
      </div>

      {/* Rever tutorial — reabre o tour de boas-vindas (só no app do profissional) */}
      {role === 'professional' && (
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(OPEN_ONBOARDING_EVENT))}
          title="Rever o tutorial de boas-vindas"
          aria-label="Rever tutorial"
          className="shrink-0 ml-auto inline-flex items-center justify-center h-9 w-9 rounded-full sm:rounded-xl bg-paper/80 border border-gray-150 text-forest shadow-soft hover:bg-white hover:border-wine-700/20 hover:shadow-md hover:text-wine-700 transition-all-custom"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      )}

      {/* Botão de atualizar — recarrega os dados sem recarregar a página (router.refresh) */}
      <button
        type="button"
        onClick={handleRefresh}
        disabled={isRefreshing}
        title="Atualizar dados sem recarregar a página"
        aria-label="Atualizar"
        className="shrink-0 ml-auto inline-flex items-center justify-center gap-2 h-9 px-2.5 sm:px-3.5 rounded-full sm:rounded-xl bg-paper/80 border border-gray-150 text-forest shadow-soft hover:bg-white hover:border-wine-700/20 hover:shadow-md hover:text-wine-700 transition-all-custom disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline text-xs font-bold">{isRefreshing ? 'Atualizando…' : 'Atualizar'}</span>
      </button>

      {/* No mobile: só o avatar limpo (estilo app). No desktop: caixa com nome/email. */}
      <div className="flex items-center gap-0 sm:gap-3 shrink-0 sm:bg-paper/80 sm:border sm:border-gray-150 rounded-full sm:rounded-2xl p-0 sm:p-2.5 sm:shadow-soft">
        <div className="h-9 w-9 bg-gradient-to-br from-wine-700/12 to-wine-500/8 ring-1 ring-wine-700/10 text-forest rounded-full sm:rounded-xl flex items-center justify-center font-bold shrink-0">
          {role === 'super_admin' ? (
            <ShieldAlert className="h-5 w-5 text-forest" />
          ) : (
            <User className="h-5 w-5 text-forest" />
          )}
        </div>

        <div className="text-left hidden sm:block">
          <p className="text-xs font-bold text-ink leading-none">{userName}</p>
          <span className="text-[10px] text-gray-450 mt-1 block truncate max-w-[150px]" title={userEmail}>
            {userEmail}
          </span>
        </div>
      </div>
    </header>
  );
};
export default Header;
