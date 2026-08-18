'use client';

/**
 * ============================================================================
 * LUME · SiteRenderer — o único lugar que sabe transformar dados em página
 * ============================================================================
 *
 *   template escolhido + SiteConfig + serviços reais  →  página pública
 *
 * Usado nos DOIS lados, com o mesmo componente e os mesmos dados:
 *   • /<slug>            → a página que a cliente abre
 *   • /dashboard/site    → o preview ao vivo dentro do editor
 *
 * Por isso o que a profissional vê enquanto edita é literalmente o que vai
 * para o ar — não existe uma segunda implementação para divergir.
 *
 * O botão "Agendar" NÃO agenda aqui: ele abre o BookingModal, que é o mesmo
 * fluxo de /agendar/<slug>, com o mesmo motor de horários, as mesmas regras de
 * disponibilidade e a mesma trava de concorrência. Nenhuma linha de lógica de
 * agendamento foi reescrita.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { SiteConfig } from '@/types/site';
import type { PublicService, TemplateComponent } from './types';
import { getTemplateMeta } from '@/lib/site/templates';
import { normalizeConfig, resolveVisibleSections } from '@/lib/site/config';
import { BookingModal } from '@/components/booking/BookingModal';

import EditorialNude from './templates/EditorialNude';
import GoldPremium from './templates/GoldPremium';
import Terracota from './templates/Terracota';
import ClinicSage from './templates/ClinicSage';
import EditorialBronze from './templates/EditorialBronze';
import RoseChampagne from './templates/RoseChampagne';

/**
 * Único ponto de ligação entre o id do template (banco) e o componente (código).
 * Adicionar o Template 07 = criar o componente, registrar em lib/site/templates.ts
 * e acrescentar UMA linha aqui. Editor, banco e página pública não mudam.
 */
const REGISTRY: Record<string, TemplateComponent> = {
  'editorial-nude': EditorialNude,
  'gold-premium': GoldPremium,
  'terracota': Terracota,
  'clinic-sage': ClinicSage,
  'editorial-bronze': EditorialBronze,
  'rose-champagne': RoseChampagne,
};

interface SiteRendererProps {
  /** Slug da profissional — é por ele que o modal carrega o agendamento real. */
  slug: string;
  templateId: string;
  config: SiteConfig;
  services: PublicService[];
  /** true no editor: sem botão flutuante e sem abrir o agendamento de verdade. */
  preview?: boolean;
}

export function SiteRenderer({ slug, templateId, config, services, preview }: SiteRendererProps) {
  const [booking, setBooking] = useState<{ open: boolean; serviceIds?: string[] }>({ open: false });

  const meta = getTemplateMeta(templateId);
  const Template = REGISTRY[meta.id] || REGISTRY['editorial-nude'];

  // Normaliza de novo na renderização (defesa em profundidade): mesmo que uma
  // config antiga ou incompleta esteja gravada, a página desenha sem quebrar.
  const safeConfig = useMemo(() => normalizeConfig(config, meta.id), [config, meta.id]);

  const sections = useMemo(
    () => resolveVisibleSections(safeConfig, meta.supportedSections, { hasServices: services.length > 0 }),
    [safeConfig, meta.supportedSections, services.length],
  );

  const onBook = useCallback((serviceId?: string) => {
    if (preview) return; // no editor o CTA é ilustrativo — não abre o agendamento
    setBooking({ open: true, serviceIds: serviceId ? [serviceId] : undefined });
  }, [preview]);

  return (
    <>
      <Template config={safeConfig} services={services} sections={sections} onBook={onBook} preview={preview} />

      {!preview && (
        <BookingModal
          professionalSlug={slug}
          isOpen={booking.open}
          onClose={() => setBooking({ open: false })}
          initialServiceIds={booking.serviceIds}
        />
      )}
    </>
  );
}

export default SiteRenderer;
