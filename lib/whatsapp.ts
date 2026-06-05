import { Appointment } from '@/types/database';

/** Formata "YYYY-MM-DD" para "DD/MM/AAAA" sem problemas de fuso. */
export function formatDateBR(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Normaliza um número para o formato wa.me (apenas dígitos, com DDI 55). */
export function normalizeWhatsapp(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  if (!digits) return '';
  // Remove zeros à esquerda
  digits = digits.replace(/^0+/, '');
  // Adiciona DDI do Brasil se faltar
  if (!digits.startsWith('55')) digits = '55' + digits;
  return digits;
}

/** Preenche os placeholders da mensagem ({nome}, {servico}, {data}, {horario}, {motivo}). */
export function fillTemplate(
  template: string,
  vars: { nome?: string; servico?: string; data?: string; horario?: string; motivo?: string }
): string {
  return (template || '')
    .replace(/\{nome\}/g, vars.nome ?? '')
    .replace(/\{servico\}/g, vars.servico ?? '')
    .replace(/\{data\}/g, vars.data ?? '')
    .replace(/\{horario\}/g, vars.horario ?? '')
    .replace(/\{motivo\}/g, vars.motivo ?? '');
}

const DEFAULT_REMINDER =
  'Oi, {nome}! 💛 Passando para lembrar do seu horário de {servico} no dia {data} às {horario}. ' +
  'Posso confirmar a sua presença? Qualquer imprevisto, me avise com antecedência. Até lá!';

/** Monta a URL wa.me com a mensagem de lembrete pronta para o agendamento. */
export function buildReminderLink(
  appointment: Appointment,
  template?: string
): string {
  const phone = normalizeWhatsapp(appointment.client_whatsapp);
  const msg = fillTemplate(template || DEFAULT_REMINDER, {
    nome: appointment.client_name?.split(' ')[0] || appointment.client_name,
    servico: appointment.service?.name || 'seu procedimento',
    data: formatDateBR(appointment.date),
    horario: appointment.start_time?.substring(0, 5),
  });
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/** Monta a URL wa.me com uma mensagem livre. */
export function buildWhatsappLink(rawPhone: string, message: string): string {
  const phone = normalizeWhatsapp(rawPhone);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
