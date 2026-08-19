import React from 'react';
import { headers } from 'next/headers';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { SiteEditor } from '@/components/site/editor/SiteEditor';
import type { PublicService } from '@/components/site/types';
import { normalizeConfig, defaultSiteConfig } from '@/lib/site/config';
import { getTemplateMeta, DEFAULT_TEMPLATE_ID } from '@/lib/site/templates';
import { toPublicServices } from '@/lib/site/publicService';
import { isDemo } from '@/lib/demo';

/**
 * ============================================================================
 * PAINEL · Minha Página
 * ============================================================================
 * Carrega no servidor tudo que o editor precisa e entrega pronto: a página
 * abre já desenhada, sem tela de carregando.
 *
 * Repare no que NÃO é carregado: nada de financeiro, nada de clientes, nada
 * de agendamentos. O editor mexe só em apresentação.
 */

export const metadata = {
  title: 'Minha Página | Lume',
  description: 'Monte seu site e link na bio com agendamento integrado, sem precisar entender de design.',
};

/** URL pública do app — usada para montar o link que a profissional copia. */
async function appUrl(): Promise<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${h.get('x-forwarded-proto') || 'https'}://${host}`;
  } catch { /* fora do contexto de request */ }
  return '';
}

export default async function MinhaPaginaPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [professional, site, allServices, base] = await Promise.all([
    dbService.getProfessionalById(professionalId),
    dbService.getProfessionalSite(professionalId).catch(() => null),
    dbService.getServicesByProfessional(professionalId).catch(() => []),
    appUrl(),
  ]);

  // MESMO recorte da página pública (mesma função): o preview do editor não
  // pode enxergar um campo que a página real não mostraria.
  const services: PublicService[] = toPublicServices(allServices);

  const templateId = site ? getTemplateMeta(site.template_id).id : DEFAULT_TEMPLATE_ID;

  // Sem página ainda: rascunho novo já pré-preenchido com os dados da conta.
  const config = site
    ? normalizeConfig(site.draft_config, templateId, professional ?? undefined)
    : defaultSiteConfig(templateId, professional ?? undefined);

  return (
    <SiteEditor
      professionalId={professionalId}
      initialSlug={professional?.slug ?? ''}
      initialTemplateId={templateId}
      initialConfig={config}
      initialStatus={site?.status ?? 'draft'}
      exists={!!site}
      services={services}
      appUrl={base}
      isDemo={isDemo(professionalId)}
    />
  );
}
