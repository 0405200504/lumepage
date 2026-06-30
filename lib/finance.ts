import { Appointment, Service } from '@/types/database';

/** Índice rápido de serviços por id (para resolver multi-serviço e custos). */
export type ServicesById = Record<string, Service | undefined>;

export function indexServices(services: Service[]): ServicesById {
  const map: ServicesById = {};
  for (const s of services) map[s.id] = s;
  return map;
}

/**
 * Receita (em centavos) de UM atendimento — REGRA ÚNICA de faturamento.
 *
 * Considera multi-serviço: soma o preço de TODOS os serviços do agendamento
 * (`service_ids`), com fallbacks graciosos para o serviço primário embutido
 * (`service`) ou para o índice de serviços passado.
 */
export function appointmentRevenueCents(a: Appointment, byId?: ServicesById): number {
  const ids = a.service_ids && a.service_ids.length ? a.service_ids : (a.service_id ? [a.service_id] : []);

  if (ids.length > 1 || byId) {
    let sum = 0;
    let resolvedAny = false;
    for (const id of ids) {
      // Preferimos o relacionamento embutido quando bate; senão o índice.
      const svc = (a.services?.find(s => s.id === id)) || byId?.[id] || (a.service?.id === id ? a.service : undefined);
      if (svc) { sum += svc.price_cents; resolvedAny = true; }
    }
    if (resolvedAny) return sum;
  }
  // Fallback final: serviço primário embutido.
  return a.service?.price_cents ?? byId?.[a.service_id]?.price_cents ?? 0;
}

/** Custo variável (insumos) de UM atendimento, somando `cost_cents` dos serviços.
 *  Retorna 0 quando a coluna ainda não existe (migration v24 não rodou). */
export function appointmentCostCents(a: Appointment, byId?: ServicesById): number {
  const ids = a.service_ids && a.service_ids.length ? a.service_ids : (a.service_id ? [a.service_id] : []);
  let sum = 0;
  for (const id of ids) {
    const svc = (a.services?.find(s => s.id === id)) || byId?.[id] || (a.service?.id === id ? a.service : undefined);
    sum += svc?.cost_cents ?? 0;
  }
  return sum;
}

/**
 * Faturamento de serviços — usado na aba Início e na aba Contas para os
 * números sempre baterem. Considera confirmados e concluídos (faturamento
 * aprovado). Passe (year, month0) para filtrar um mês específico; omita para o total.
 */
export function serviceRevenueCents(
  appointments: Appointment[],
  year?: number,
  month0?: number,
  byId?: ServicesById,
): number {
  return appointments
    .filter(a => a.status === 'completed' || a.status === 'confirmed')
    .filter(a => {
      if (year === undefined || month0 === undefined) return true;
      const [y, m] = a.date.split('-').map(Number);
      return y === year && m === month0 + 1;
    })
    .reduce((sum, a) => sum + appointmentRevenueCents(a, byId), 0);
}
