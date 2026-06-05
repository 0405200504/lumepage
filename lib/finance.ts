import { Appointment } from '@/types/database';

/**
 * Faturamento de serviços — REGRA ÚNICA usada na aba Início e na aba Contas
 * para os números sempre baterem.
 *
 * Considera atendimentos confirmados e concluídos (faturamento aprovado).
 * Passe (year, month0) para filtrar um mês específico; omita para o total.
 */
export function serviceRevenueCents(
  appointments: Appointment[],
  year?: number,
  month0?: number
): number {
  return appointments
    .filter(a => a.status === 'completed' || a.status === 'confirmed')
    .filter(a => {
      if (year === undefined || month0 === undefined) return true;
      const [y, m] = a.date.split('-').map(Number);
      return y === year && m === month0 + 1;
    })
    .reduce((sum, a) => sum + (a.service?.price_cents || 0), 0);
}
