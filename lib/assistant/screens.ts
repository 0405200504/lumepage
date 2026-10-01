/**
 * Telas que a assistente de voz pode abrir no aparelho. Fica sem dependência
 * nenhuma de propósito: o servidor descreve a ferramenta com estas chaves e o
 * navegador as traduz em rota — os dois importam daqui.
 */
export const SCREENS = {
  inicio: '/dashboard',
  agenda: '/dashboard/agenda',
  agendamentos: '/dashboard/appointments',
  lista_de_espera: '/dashboard/waitlist',
  tarefas: '/dashboard/tasks',
  contatos: '/dashboard/clients',
  financeiro: '/dashboard/finance',
  servicos: '/dashboard/services',
  disponibilidade: '/dashboard/availability',
  configuracoes: '/dashboard/settings',
} as const;

export type ScreenKey = keyof typeof SCREENS;

/** Rota da tela; a agenda aceita o dia em ?data=YYYY-MM-DD. */
export function screenHref(screen: string, date?: string): string | null {
  if (!Object.prototype.hasOwnProperty.call(SCREENS, screen)) return null;
  const base = SCREENS[screen as ScreenKey];
  if (screen === 'agenda' && date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return `${base}?data=${date}`;
  return base;
}
