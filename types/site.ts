/**
 * ============================================================================
 * LUME · "Minha Página" — contrato de dados do site/link na bio
 * ============================================================================
 * REGRA CENTRAL: este arquivo descreve APENAS APRESENTAÇÃO.
 *
 * Serviços, clientes, agendamentos, horários e financeiro NÃO moram aqui —
 * continuam nos módulos existentes da Lume e são lidos direto de lá na hora de
 * renderizar. Se a profissional muda o preço em /dashboard/services, a página
 * pública muda junto, porque a página nunca guardou cópia desse dado.
 *
 * Consequência prática: trocar de template NÃO perde conteúdo. O SiteConfig
 * pertence à profissional; o template é só o componente que o desenha.
 */

/** Seções que uma página pode ter. Cada template desenha as que suporta. */
export type SiteSectionId =
  | 'hero'
  | 'stats'
  | 'about'
  | 'services'
  | 'gallery'
  | 'beforeAfter'
  | 'testimonials'
  | 'faq'
  | 'location'
  | 'contact';

export const SITE_SECTION_IDS: SiteSectionId[] = [
  'hero', 'stats', 'about', 'services', 'gallery',
  'beforeAfter', 'testimonials', 'faq', 'location', 'contact',
];

export const SITE_SECTION_LABEL: Record<SiteSectionId, string> = {
  hero: 'Capa (hero)',
  stats: 'Números / prova social',
  about: 'Sobre mim',
  services: 'Serviços',
  gallery: 'Galeria de trabalhos',
  beforeAfter: 'Antes e depois',
  testimonials: 'Depoimentos',
  faq: 'Perguntas frequentes',
  location: 'Onde me encontrar',
  contact: 'Contato e agendamento',
};

/** Seções que a profissional NÃO pode desligar (a página perderia sentido). */
export const SITE_REQUIRED_SECTIONS: SiteSectionId[] = ['hero'];

// ============================================================================
// Identidade
// ============================================================================

export interface SiteIdentity {
  /** Nome da profissional (ex.: "Marina Alves"). */
  professionalName: string;
  /** Nome do estúdio/marca (ex.: "Marina Alves Nails"). */
  studioName: string;
  /** Profissão exibida na capa (ex.: "Nail Designer"). */
  role: string;
  logoUrl: string;
  /** Retrato da profissional (capa e "sobre mim"). */
  photoUrl: string;
  city: string;
  address: string;
  /** Só dígitos com DDI (5511999990000). */
  whatsapp: string;
  phone: string;
  /** Sem "@". */
  instagram: string;
  email: string;
}

// ============================================================================
// Tema
// ============================================================================

/**
 * Cores da página. `primary`/`secondary` são a escolha da profissional; as
 * demais têm default por template e variações coerentes são derivadas em
 * lib/site/theme.ts (nunca deixamos texto sobre fundo ilegível).
 */
export interface SiteTheme {
  primary: string;
  secondary: string;
  background: string;
  foreground: string;
  /** Cantos: reto, suave ou bem arredondado. */
  radius: 'sharp' | 'soft' | 'round';
}

// ============================================================================
// Conteúdo por seção
// ============================================================================

export interface SiteGalleryItem {
  id: string;
  url: string;
  caption: string;
}

export interface SiteBeforeAfterItem {
  id: string;
  beforeUrl: string;
  afterUrl: string;
  title: string;
  description: string;
}

export interface SiteTestimonialItem {
  id: string;
  name: string;
  photoUrl: string;
  text: string;
  /** 0 = não exibir estrelas. */
  rating: number;
}

export interface SiteFaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface SiteStatItem {
  id: string;
  value: string;
  label: string;
}

export interface SiteContent {
  hero: {
    eyebrow: string;
    headline: string;
    /** Trecho do headline destacado em itálico/cor de acento. */
    highlight: string;
    subheadline: string;
    ctaPrimary: string;
    ctaSecondary: string;
    imageUrl: string;
  };
  stats: { items: SiteStatItem[] };
  about: {
    eyebrow: string;
    title: string;
    highlight: string;
    text: string;
    imageUrl: string;
    cta: string;
  };
  services: {
    eyebrow: string;
    title: string;
    highlight: string;
    subtitle: string;
    showPrices: boolean;
    showDuration: boolean;
  };
  gallery: {
    eyebrow: string;
    title: string;
    highlight: string;
    items: SiteGalleryItem[];
  };
  beforeAfter: {
    eyebrow: string;
    title: string;
    highlight: string;
    items: SiteBeforeAfterItem[];
  };
  testimonials: {
    eyebrow: string;
    title: string;
    highlight: string;
    items: SiteTestimonialItem[];
  };
  faq: {
    eyebrow: string;
    title: string;
    highlight: string;
    items: SiteFaqItem[];
  };
  location: {
    eyebrow: string;
    title: string;
    highlight: string;
    hours: string;
    note: string;
  };
  contact: {
    eyebrow: string;
    title: string;
    highlight: string;
    text: string;
    cta: string;
  };
  footer: {
    note: string;
  };
}

// ============================================================================
// SEO
// ============================================================================

export interface SiteSeo {
  title: string;
  description: string;
  /** Imagem de compartilhamento (WhatsApp/Instagram). Vazio = usa a da capa. */
  ogImageUrl: string;
}

// ============================================================================
// Config completa
// ============================================================================

export interface SiteSections {
  /** Ordem de exibição. Seções fora da lista não aparecem. */
  order: SiteSectionId[];
  enabled: Record<SiteSectionId, boolean>;
}

export interface SiteConfig {
  /** Versão do formato — permite migrar configs antigas sem quebrar. */
  version: 1;
  identity: SiteIdentity;
  theme: SiteTheme;
  content: SiteContent;
  sections: SiteSections;
  seo: SiteSeo;
}

export type SiteStatus = 'draft' | 'published' | 'unpublished';

/** Linha da tabela professional_sites (migração v30). */
export interface ProfessionalSite {
  id: string;
  professional_id: string;
  template_id: string;
  status: SiteStatus;
  draft_config: SiteConfig;
  published_config: SiteConfig | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
