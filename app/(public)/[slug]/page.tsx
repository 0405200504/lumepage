import React from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { dbService } from '@/lib/supabase/db';
import { SiteRenderer } from '@/components/site/SiteRenderer';
import type { PublicService } from '@/components/site/types';
import { normalizeConfig } from '@/lib/site/config';
import { getTemplateMeta } from '@/lib/site/templates';
import { normalizeSlug, RESERVED_SLUGS } from '@/lib/site/slug';
import { toPublicServices } from '@/lib/site/publicService';
import type { Professional } from '@/types/database';
import type { SiteConfig } from '@/types/site';

/**
 * ============================================================================
 * PÁGINA PÚBLICA · lume.com.br/<slug>
 * ============================================================================
 * "Seu negócio inteiro em um único link." Este é o link.
 *
 * Renderização dinâmica de propósito: os serviços vêm da tabela `services` a
 * cada visita, então mudar preço, duração ou desativar um serviço no painel
 * reflete na página imediatamente — sem republicar e sem deploy.
 *
 * O que sai daqui é um recorte mínimo: `toPublicServices` monta objetos novos
 * com 5 campos. Custo interno (`cost_cents`), flags e ids de tenant nunca
 * chegam ao HTML porque nunca entram no objeto.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

interface Loaded {
  professional: Professional;
  config: SiteConfig;
  templateId: string;
  services: PublicService[];
}

/**
 * Resolve a página publicada de um slug. Devolve null (→ 404) se:
 * o slug é reservado, a profissional não existe/está inativa, ou a página
 * ainda não foi publicada. Rascunho NUNCA aparece aqui.
 */
async function loadSite(rawSlug: string): Promise<Loaded | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug || RESERVED_SLUGS.has(slug)) return null;

  // Slugs antigos podem ter maiúsculas; tenta o que veio e depois o normalizado.
  let professional = await dbService.getProfessionalBySlug(rawSlug).catch(() => null);
  if (!professional && rawSlug !== slug) {
    professional = await dbService.getProfessionalBySlug(slug).catch(() => null);
  }
  if (!professional || professional.status !== 'active') return null;

  const site = await dbService.getPublishedSiteByProfessional(professional.id).catch(() => null);
  if (!site || !site.published_config) return null;

  const templateId = getTemplateMeta(site.template_id).id;
  const config = normalizeConfig(site.published_config, templateId, professional);

  const services = toPublicServices(
    await dbService.getServicesByProfessional(professional.id).catch(() => []),
  );

  return { professional, config, templateId, services };
}

/** URL absoluta do próprio app (para as imagens de Open Graph). */
async function baseUrl(): Promise<string> {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (fromEnv) return fromEnv;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${h.get('x-forwarded-proto') || 'https'}://${host}`;
  } catch { /* fora do contexto de request */ }
  return '';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const loaded = await loadSite(slug);
  if (!loaded) return { title: 'Página não encontrada | Lume', robots: { index: false, follow: false } };

  const { config, professional } = loaded;
  const brand = config.identity.studioName || professional.brand_name || professional.name;
  const role = config.identity.role;
  const city = config.identity.city;

  const title = config.seo.title || [brand, role, city].filter(Boolean).join(' — ');
  const description =
    config.seo.description ||
    config.content.hero.subheadline ||
    `Conheça o trabalho de ${brand} e agende seu horário online, em poucos toques.`;

  const image = config.seo.ogImageUrl || config.content.hero.imageUrl || config.identity.photoUrl;
  const base = await baseUrl();
  const url = base ? `${base}/${professional.slug}` : undefined;

  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    openGraph: {
      type: 'website',
      locale: 'pt_BR',
      siteName: brand,
      title,
      description,
      url,
      images: image ? [{ url: image, alt: brand }] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function PublicSitePage({ params }: PageProps) {
  const { slug } = await params;
  const loaded = await loadSite(slug);
  if (!loaded) notFound();

  const { professional, config, templateId, services } = loaded;
  const meta = getTemplateMeta(templateId);

  return (
    <>
      {/* Fontes do template. O React 19 iça estas tags para o <head>; carregar
          só aqui evita empurrar as fontes da página pública para dentro do app. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="stylesheet" href={meta.fontsHref} />

      <SiteRenderer
        slug={professional.slug}
        templateId={templateId}
        config={config}
        services={services}
      />
    </>
  );
}
