import { Appointment, Service } from '@/types/database';

/** IDs de serviço de um agendamento (multi-serviço com fallback no service_id primário). */
export function serviceIdsOf(appt: Pick<Appointment, 'service_id' | 'service_ids'>): string[] {
  if (appt.service_ids && appt.service_ids.length) return appt.service_ids;
  return appt.service_id ? [appt.service_id] : [];
}

/** Resolve os objetos Service de um agendamento a partir da lista completa de serviços. */
export function resolveAppointmentServices(
  appt: Pick<Appointment, 'service_id' | 'service_ids' | 'service'>,
  allServices: Service[]
): Service[] {
  const ids = serviceIdsOf(appt);
  const byId = new Map(allServices.map(s => [s.id, s]));
  const resolved = ids.map(id => byId.get(id)).filter(Boolean) as Service[];
  // Fallback: usa a relação `service` já carregada quando a lista não tem o item
  if (resolved.length === 0 && appt.service) return [appt.service];
  return resolved;
}

export function sumDurationMinutes(services: Pick<Service, 'duration_minutes'>[]): number {
  return services.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
}

export function sumPriceCents(services: Pick<Service, 'price_cents'>[]): number {
  return services.reduce((sum, s) => sum + (s.price_cents || 0), 0);
}

/** Nomes dos serviços juntos, ex.: "Lash Lifting + Design". */
export function formatServiceNames(services: Pick<Service, 'name'>[]): string {
  return services.map(s => s.name).join(' + ');
}
