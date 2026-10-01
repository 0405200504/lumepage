import { brl } from '@/lib/format';

/**
 * Textos das notificações da profissional, no formato "venda aprovada":
 * título curto em cima e o valor embaixo. O ícone é o do app instalado
 * (no iPhone não dá para trocar por notificação).
 */
export interface PushPayload {
  title: string;
  body: string;
  /** Tela que abre no toque. */
  url?: string;
  /** Mesma tag = a notificação nova substitui a anterior em vez de empilhar. */
  tag?: string;
}

const firstName = (name?: string | null) => (name || '').trim().split(/\s+/)[0] || '';

const congrats = (name?: string | null) => {
  const n = firstName(name);
  return n ? `Parabéns, ${n}!` : 'Parabéns!';
};

/** Agendamento novo da cliente (página pública ou robô do WhatsApp). */
export function newBookingPush(input: {
  priceCents: number;
  serviceNames: string[];
  date: string; // YYYY-MM-DD
}): PushPayload {
  const services = input.serviceNames.join(' + ');
  return {
    title: 'Novo agendamento!',
    // "Design de sobrancelha: R$ 150,00". Serviço sem preço (ex.: "sob consulta") fica só com o nome.
    body: input.priceCents > 0 ? `${services}: ${brl(input.priceCents)}` : services,
    url: `/dashboard/agenda?data=${input.date}`,
  };
}

/** Resumo do fim do dia. */
export function dailyRevenuePush(name: string | null | undefined, cents: number, todayISO: string): PushPayload {
  return {
    title: congrats(name),
    body: `Hoje você faturou ${brl(cents)}`,
    url: '/dashboard',
    tag: `faturamento-dia-${todayISO}`,
  };
}

/** Resumo da semana (domingo a sábado, como a agenda), no sábado à noite. */
export function weeklyRevenuePush(name: string | null | undefined, cents: number, saturdayISO: string): PushPayload {
  return {
    title: congrats(name),
    body: `Essa semana você faturou ${brl(cents)}`,
    url: '/dashboard',
    tag: `faturamento-semana-${saturdayISO}`,
  };
}
