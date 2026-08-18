/**
 * ============================================================================
 * LUME · Recorte público de um serviço
 * ============================================================================
 * Fica isolado aqui, num arquivo só, porque é a fronteira entre o que é da
 * profissional e o que a cliente pode ver.
 *
 * A regra é montar um objeto NOVO com os campos permitidos — nunca repassar a
 * linha do banco filtrando o que não pode. Assim, uma coluna nova em `services`
 * (um custo, uma comissão, uma nota interna) não vaza para a página só porque
 * alguém esqueceu de atualizar um filtro: ela simplesmente não é copiada.
 *
 * Fora daqui, ninguém deve montar esse objeto à mão.
 */

import type { Service } from '@/types/database';
import type { PublicService } from '@/components/site/types';

/** Campos que a página pública pode mostrar. Nada de custo, flags ou ids de tenant. */
export function toPublicService(service: Service): PublicService {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    priceCents: service.price_cents,
    durationMinutes: service.duration_minutes,
    imageUrl: service.image_url ?? null,
  };
}

/**
 * Serviços que entram na página: ativos E marcados como visíveis para a cliente.
 * Mesmo critério de /agendar/<slug> — uma regra só, um comportamento só.
 */
export function toPublicServices(services: Service[]): PublicService[] {
  return services
    .filter(s => s.is_active && s.client_visible !== false)
    .map(toPublicService);
}
