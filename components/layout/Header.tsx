'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { User, ShieldAlert } from 'lucide-react';

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
  const meta = ROUTE_META[pathname];
  const resolvedTitle = title ?? meta?.title ?? 'Lume';
  const resolvedSubtitle = subtitle ?? meta?.subtitle;

  return (
    <header className="flex justify-between items-center gap-3 glass border-b border-gray-150 px-4 sm:px-6 py-4 sm:py-5 pt-safe sticky top-0 z-30 select-none">
      <div className="min-w-0">
        <h2 className="text-lg sm:text-xl font-black text-ink tracking-tight leading-tight truncate">{resolvedTitle}</h2>
        {resolvedSubtitle && <p className="text-xs text-gray-450 mt-1 max-w-2xl line-clamp-1 sm:line-clamp-none">{resolvedSubtitle}</p>}
      </div>

      <div className="flex items-center gap-3 shrink-0 bg-paper/70 border border-gray-150 rounded-2xl p-2 sm:p-2.5 shadow-soft">
        {/* Avatar/Icon */}
        <div className="h-9 w-9 bg-wine-700/6 text-forest rounded-xl flex items-center justify-center font-bold shrink-0">
          {role === 'super_admin' ? (
            <ShieldAlert className="h-5 w-5 text-forest" />
          ) : (
            <User className="h-5 w-5 text-forest" />
          )}
        </div>

        {/* User Info — oculto em telas pequenas (já visível na barra lateral) */}
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
