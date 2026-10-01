/**
 * ============================================================================
 * LUME · SiteConfig — defaults, saneamento e normalização
 * ============================================================================
 * Tudo que entra no banco passa por aqui. Duas garantias:
 *
 *  1. SEGURANÇA — todo texto é limpo de HTML/scripts e cortado no limite, e
 *     toda URL é validada (só http/https; `javascript:`/`data:` são recusados).
 *     O que a cliente vê na página pública é texto, nunca marcação.
 *
 *  2. TROCA DE TEMPLATE SEM PERDA — `normalizeConfig` completa qualquer campo
 *     faltante com o default. Config antiga, config de outro template ou JSON
 *     truncado continuam renderizando: o conteúdo é da profissional, o desenho
 *     é do template.
 *
 * Puro (sem servidor): o editor usa os mesmos defaults do renderer.
 */

import type {
  SiteConfig, SiteContent, SiteIdentity, SiteSectionId, SiteSections,
  SiteTheme, SiteSeo, SiteGalleryItem, SiteBeforeAfterItem,
  SiteTestimonialItem, SiteFaqItem, SiteStatItem,
  SiteLinks, SiteLinkItem, SiteLinkKind, SiteLinkStyle,
} from '@/types/site';
import { SITE_SECTION_IDS, SITE_REQUIRED_SECTIONS } from '@/types/site';
import { getTemplateMeta } from './templates';
import { safeHex } from './theme';
import { isValidFontPairId } from './fonts';

// ============================================================================
// Limites de tamanho (também usados pelo editor para mostrar o contador)
// ============================================================================

export const LIMITS = {
  eyebrow: 40,
  headline: 90,
  highlight: 40,
  subheadline: 220,
  cta: 32,
  title: 90,
  text: 1200,
  short: 120,
  caption: 90,
  testimonial: 600,
  answer: 800,
  name: 60,
  statValue: 12,
  statLabel: 28,
  url: 600,
  maxGallery: 40,
  maxBeforeAfter: 20,
  maxTestimonials: 24,
  maxFaq: 20,
  maxStats: 4,
  linkLabel: 40,
  bio: 160,
  maxLinks: 12,
} as const;

// ============================================================================
// Saneamento
// ============================================================================

/**
 * Texto puro: sem tags, sem entidades perigosas, sem caracteres de controle.
 * Não tentamos "permitir HTML seguro" — a página não precisa de HTML do usuário,
 * então a resposta certa é remover, não filtrar.
 */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/<[^>]*>/g, '')                  // qualquer tag
    .replace(/[<>]/g, '')                     // sobras de tag quebrada
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '') // controle (mantém \n e \t)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

/**
 * URL de imagem. Só http(s) absoluto ou caminho relativo do próprio app.
 * `javascript:`, `data:` e `vbscript:` são recusados (viram string vazia).
 */
export function cleanUrl(value: unknown, max = LIMITS.url): string {
  if (typeof value !== 'string') return '';
  const v = value.trim().slice(0, max);
  if (!v) return '';
  if (v.startsWith('/') && !v.startsWith('//')) return v; // caminho interno
  try {
    const u = new URL(v);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.toString();
  } catch {
    return '';
  }
}

/** Só dígitos (WhatsApp/telefone). */
export function cleanDigits(value: unknown, max = 20): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\D/g, '').slice(0, max);
}

/** Instagram sem "@", sem URL, só o handle. */
export function cleanHandle(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9._]/g, '')
    .slice(0, 40);
}

export function cleanEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  const v = value.trim().toLowerCase().slice(0, 160);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : '';
}

let idSeq = 0;
function newId(prefix: string): string {
  idSeq += 1;
  return `${prefix}-${Date.now().toString(36)}${idSeq.toString(36)}`;
}

function cleanId(value: unknown, prefix: string): string {
  const v = typeof value === 'string' ? value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : '';
  return v || newId(prefix);
}

// ============================================================================
// Defaults
// ============================================================================

/** Dados mínimos da conta usados para pré-preencher a página (nada é perguntado duas vezes). */
export interface SiteSeedProfessional {
  name?: string | null;
  brand_name?: string | null;
  city?: string | null;
  address?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
  logo_url?: string | null;
  profile_image_url?: string | null;
  public_bio?: string | null;
  description?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

function defaultIdentity(prof?: SiteSeedProfessional): SiteIdentity {
  return {
    professionalName: cleanText(prof?.name, LIMITS.name),
    studioName: cleanText(prof?.brand_name || prof?.name, LIMITS.name),
    role: '',
    logoUrl: cleanUrl(prof?.logo_url),
    photoUrl: cleanUrl(prof?.profile_image_url),
    city: cleanText(prof?.city, LIMITS.short),
    address: cleanText(prof?.address, LIMITS.short),
    whatsapp: cleanDigits(prof?.whatsapp),
    phone: cleanDigits(prof?.whatsapp),
    instagram: cleanHandle(prof?.instagram),
    email: cleanEmail(prof?.email),
  };
}

function defaultContent(prof?: SiteSeedProfessional): SiteContent {
  const brand = cleanText(prof?.brand_name || prof?.name, LIMITS.name) || 'meu estúdio';
  const bio = cleanText(prof?.public_bio || prof?.description, LIMITS.text);

  return {
    hero: {
      eyebrow: cleanText(prof?.city, LIMITS.eyebrow),
      headline: 'Um cuidado feito',
      highlight: 'sob medida para você.',
      subheadline:
        'Atendimento com hora marcada, técnica apurada e um resultado que combina com quem você é.',
      ctaPrimary: 'Agendar meu horário',
      ctaSecondary: 'Ver trabalhos',
      imageUrl: cleanUrl(prof?.profile_image_url),
    },
    stats: {
      items: [
        { id: 'stat-1', value: '+500', label: 'Atendimentos' },
        { id: 'stat-2', value: '5.0', label: 'De avaliação' },
        { id: 'stat-3', value: '+5 anos', label: 'De experiência' },
      ],
    },
    about: {
      eyebrow: 'Sobre mim',
      title: 'Prazer, sou',
      highlight: cleanText(prof?.name, LIMITS.highlight) || 'a profissional daqui.',
      text:
        bio ||
        'Trabalho com hora marcada, em um ambiente tranquilo, com produtos de alta performance. Aqui você não escolhe só um procedimento: a gente constrói junto um resultado bonito, durável e do seu jeito.',
      imageUrl: cleanUrl(prof?.profile_image_url),
      cta: 'Quero ser atendida',
    },
    services: {
      eyebrow: 'O que eu faço',
      title: 'Serviços pensados para',
      highlight: 'a sua rotina.',
      subtitle: 'Escolha o que faz sentido para você e agende em poucos toques.',
      showPrices: true,
      showDuration: true,
    },
    gallery: {
      eyebrow: 'Portfólio',
      title: 'Trabalhos que falam',
      highlight: 'por si.',
      items: [],
    },
    beforeAfter: {
      eyebrow: 'Resultados',
      title: 'Antes e',
      highlight: 'depois.',
      items: [],
    },
    testimonials: {
      eyebrow: 'Depoimentos',
      title: 'Quem senta na cadeira,',
      highlight: 'volta.',
      items: [],
    },
    faq: {
      eyebrow: 'Dúvidas',
      title: 'Perguntas',
      highlight: 'frequentes.',
      items: [],
    },
    location: {
      eyebrow: 'Onde me encontrar',
      title: 'Venha me',
      highlight: 'visitar.',
      hours: 'Segunda a sábado, das 9h às 19h',
      note: '',
    },
    contact: {
      eyebrow: 'Vamos marcar?',
      title: 'Reserve o seu',
      highlight: 'horário.',
      text: `Atendimento com hora marcada em ${brand}. Escolha o serviço, o dia e o horário — a confirmação é na hora.`,
      cta: 'Agendar agora',
    },
    footer: { note: '' },
  };
}

function defaultSections(): SiteSections {
  const enabled = {} as Record<SiteSectionId, boolean>;
  for (const id of SITE_SECTION_IDS) enabled[id] = true;
  // Seções que só fazem sentido com conteúdo entram desligadas.
  enabled.beforeAfter = false;
  enabled.faq = false;
  return { order: [...SITE_SECTION_IDS], enabled };
}

/**
 * Links padrão da página "só links". Os quatro botões inteligentes já nascem
 * ligados — mas só APARECEM se a identidade tiver o dado (sem WhatsApp, o
 * botão de WhatsApp não é desenhado; ver `resolveLinks`).
 */
export const LINK_KIND_LABEL: Record<SiteLinkKind, string> = {
  book: 'Agendar horário',
  whatsapp: 'Falar no WhatsApp',
  instagram: 'Me seguir no Instagram',
  maps: 'Como chegar',
  custom: 'Link',
};

export function defaultLinkItems(): SiteLinkItem[] {
  return [
    { id: 'link-book', kind: 'book', label: LINK_KIND_LABEL.book, url: '', enabled: true },
    { id: 'link-whatsapp', kind: 'whatsapp', label: LINK_KIND_LABEL.whatsapp, url: '', enabled: true },
    { id: 'link-instagram', kind: 'instagram', label: LINK_KIND_LABEL.instagram, url: '', enabled: true },
    { id: 'link-maps', kind: 'maps', label: LINK_KIND_LABEL.maps, url: '', enabled: true },
  ];
}

export function defaultLinks(prof?: SiteSeedProfessional): SiteLinks {
  return {
    mode: 'site',
    bio: cleanText(prof?.public_bio || prof?.description, LIMITS.bio),
    style: 'pill',
    showServices: true,
    items: defaultLinkItems(),
  };
}

function defaultSeo(prof?: SiteSeedProfessional): SiteSeo {
  const brand = cleanText(prof?.brand_name || prof?.name, LIMITS.title);
  return {
    title: brand,
    description: cleanText(prof?.public_bio || prof?.description, 160),
    ogImageUrl: cleanUrl(prof?.profile_image_url),
  };
}

/** Config inicial de uma profissional que acabou de abrir "Minha Página". */
export function defaultSiteConfig(templateId: string, prof?: SiteSeedProfessional): SiteConfig {
  const meta = getTemplateMeta(templateId);
  const theme: SiteTheme = {
    ...meta.defaultTheme,
    // Se a profissional já tem cor de marca no cadastro, ela vem pré-preenchida.
    primary: prof?.primary_color ? safeHex(prof.primary_color, meta.defaultTheme.primary) : meta.defaultTheme.primary,
    secondary: prof?.secondary_color ? safeHex(prof.secondary_color, meta.defaultTheme.secondary) : meta.defaultTheme.secondary,
  };

  return {
    version: 1,
    identity: defaultIdentity(prof),
    theme,
    content: defaultContent(prof),
    sections: defaultSections(),
    links: defaultLinks(prof),
    seo: defaultSeo(prof),
  };
}

// ============================================================================
// Normalização (config vinda do banco/cliente → config sempre válida)
// ============================================================================

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const str = (v: unknown, fallback: string, max: number) => {
  if (typeof v !== 'string') return fallback;
  // String vazia enviada de propósito (a profissional apagou o texto) é respeitada.
  if (v.trim() === '') return '';
  return cleanText(v, max) || fallback;
};

function normalizeGallery(items: unknown): SiteGalleryItem[] {
  return arr(items).slice(0, LIMITS.maxGallery).map((raw) => {
    const it = obj(raw);
    return {
      id: cleanId(it.id, 'img'),
      url: cleanUrl(it.url),
      caption: cleanText(it.caption, LIMITS.caption),
    };
  }).filter(i => !!i.url);
}

function normalizeBeforeAfter(items: unknown): SiteBeforeAfterItem[] {
  return arr(items).slice(0, LIMITS.maxBeforeAfter).map((raw) => {
    const it = obj(raw);
    return {
      id: cleanId(it.id, 'ba'),
      beforeUrl: cleanUrl(it.beforeUrl),
      afterUrl: cleanUrl(it.afterUrl),
      title: cleanText(it.title, LIMITS.short),
      description: cleanText(it.description, LIMITS.short),
    };
  }).filter(i => !!i.beforeUrl && !!i.afterUrl);
}

function normalizeTestimonials(items: unknown): SiteTestimonialItem[] {
  return arr(items).slice(0, LIMITS.maxTestimonials).map((raw) => {
    const it = obj(raw);
    const rating = Number(it.rating);
    return {
      id: cleanId(it.id, 'dep'),
      name: cleanText(it.name, LIMITS.name),
      photoUrl: cleanUrl(it.photoUrl),
      text: cleanText(it.text, LIMITS.testimonial),
      rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 5,
    };
  }).filter(i => !!i.text);
}

function normalizeFaq(items: unknown): SiteFaqItem[] {
  return arr(items).slice(0, LIMITS.maxFaq).map((raw) => {
    const it = obj(raw);
    return {
      id: cleanId(it.id, 'faq'),
      question: cleanText(it.question, LIMITS.short),
      answer: cleanText(it.answer, LIMITS.answer),
    };
  }).filter(i => !!i.question && !!i.answer);
}

function normalizeStats(items: unknown, fallback: SiteStatItem[]): SiteStatItem[] {
  const list = arr(items).slice(0, LIMITS.maxStats).map((raw) => {
    const it = obj(raw);
    return {
      id: cleanId(it.id, 'stat'),
      value: cleanText(it.value, LIMITS.statValue),
      label: cleanText(it.label, LIMITS.statLabel),
    };
  }).filter(i => !!i.value);
  return list.length ? list : fallback;
}

function normalizeSections(raw: unknown, fallback: SiteSections): SiteSections {
  const s = obj(raw);
  const valid = new Set<string>(SITE_SECTION_IDS);

  const order: SiteSectionId[] = [];
  for (const id of arr(s.order)) {
    if (typeof id === 'string' && valid.has(id) && !order.includes(id as SiteSectionId)) {
      order.push(id as SiteSectionId);
    }
  }
  // Seção nova lançada depois que a config foi salva entra no fim, nunca some.
  for (const id of SITE_SECTION_IDS) if (!order.includes(id)) order.push(id);

  const rawEnabled = obj(s.enabled);
  const enabled = {} as Record<SiteSectionId, boolean>;
  for (const id of SITE_SECTION_IDS) {
    enabled[id] = bool(rawEnabled[id], fallback.enabled[id]);
  }
  // Seções obrigatórias não podem ser desligadas (a página ficaria sem topo).
  for (const id of SITE_REQUIRED_SECTIONS) enabled[id] = true;

  return { order, enabled };
}

const LINK_KINDS: SiteLinkKind[] = ['book', 'whatsapp', 'instagram', 'maps', 'custom'];
const LINK_STYLES: SiteLinkStyle[] = ['pill', 'card', 'outline'];

function normalizeLinks(raw: unknown, fallback: SiteLinks): SiteLinks {
  const l = obj(raw);
  const mode = l.mode === 'links' ? 'links' : 'site';
  const style = LINK_STYLES.includes(l.style as SiteLinkStyle) ? (l.style as SiteLinkStyle) : fallback.style;

  const items: SiteLinkItem[] = [];
  const seenSmart = new Set<SiteLinkKind>();
  for (const rawItem of arr(l.items).slice(0, LIMITS.maxLinks * 2)) {
    const it = obj(rawItem);
    const kind = LINK_KINDS.includes(it.kind as SiteLinkKind) ? (it.kind as SiteLinkKind) : 'custom';
    // Botão inteligente só existe uma vez — dois "Agendar" seriam confusos.
    if (kind !== 'custom') {
      if (seenSmart.has(kind)) continue;
      seenSmart.add(kind);
    }
    const url = kind === 'custom' ? cleanUrl(it.url) : '';
    // Link livre sem destino válido não vai para a página (seria um botão morto).
    if (kind === 'custom' && !url) continue;
    items.push({
      id: cleanId(it.id, 'link'),
      kind,
      label: cleanText(it.label, LIMITS.linkLabel) || LINK_KIND_LABEL[kind],
      url,
      enabled: bool(it.enabled, true),
    });
    if (items.length >= LIMITS.maxLinks) break;
  }

  // Config antiga (sem `items`) ou lista apagada: volta aos quatro padrão.
  // Mas se a profissional desligou alguns de propósito, respeitamos a lista dela.
  const finalItems = Array.isArray(l.items) ? items : fallback.items;

  return {
    mode,
    bio: str(l.bio, fallback.bio, LIMITS.bio),
    style,
    showServices: bool(l.showServices, fallback.showServices),
    items: finalItems,
  };
}

function normalizeTheme(raw: unknown, fallback: SiteTheme): SiteTheme {
  const t = obj(raw);
  const radius = t.radius;
  return {
    primary: safeHex(t.primary, fallback.primary),
    secondary: safeHex(t.secondary, fallback.secondary),
    background: safeHex(t.background, fallback.background),
    foreground: safeHex(t.foreground, fallback.foreground),
    radius: radius === 'sharp' || radius === 'soft' || radius === 'round' ? radius : fallback.radius,
    // Config gravada antes das duplas de fontes existirem não tem este campo:
    // ela cai no par padrão do template e a página continua idêntica.
    fontPair: isValidFontPairId(t.fontPair) ? t.fontPair : fallback.fontPair,
  };
}

/**
 * Devolve SEMPRE um SiteConfig completo e seguro, a partir de qualquer entrada.
 * É o único caminho de escrita e de leitura da config — chamado antes de gravar
 * no banco e de novo antes de renderizar (defesa em profundidade).
 */
export function normalizeConfig(
  raw: unknown,
  templateId: string,
  prof?: SiteSeedProfessional,
): SiteConfig {
  const base = defaultSiteConfig(templateId, prof);
  const c = obj(raw);
  const identity = obj(c.identity);
  const content = obj(c.content);
  const seo = obj(c.seo);

  const hero = obj(content.hero);
  const stats = obj(content.stats);
  const about = obj(content.about);
  const services = obj(content.services);
  const gallery = obj(content.gallery);
  const beforeAfter = obj(content.beforeAfter);
  const testimonials = obj(content.testimonials);
  const faq = obj(content.faq);
  const location = obj(content.location);
  const contact = obj(content.contact);
  const footer = obj(content.footer);

  const B = base.content;

  return {
    version: 1,
    identity: {
      professionalName: str(identity.professionalName, base.identity.professionalName, LIMITS.name),
      studioName: str(identity.studioName, base.identity.studioName, LIMITS.name),
      role: str(identity.role, base.identity.role, LIMITS.short),
      logoUrl: identity.logoUrl !== undefined ? cleanUrl(identity.logoUrl) : base.identity.logoUrl,
      photoUrl: identity.photoUrl !== undefined ? cleanUrl(identity.photoUrl) : base.identity.photoUrl,
      city: str(identity.city, base.identity.city, LIMITS.short),
      address: str(identity.address, base.identity.address, LIMITS.short),
      whatsapp: identity.whatsapp !== undefined ? cleanDigits(identity.whatsapp) : base.identity.whatsapp,
      phone: identity.phone !== undefined ? cleanDigits(identity.phone) : base.identity.phone,
      instagram: identity.instagram !== undefined ? cleanHandle(identity.instagram) : base.identity.instagram,
      email: identity.email !== undefined ? cleanEmail(identity.email) : base.identity.email,
    },
    theme: normalizeTheme(c.theme, base.theme),
    content: {
      hero: {
        eyebrow: str(hero.eyebrow, B.hero.eyebrow, LIMITS.eyebrow),
        headline: str(hero.headline, B.hero.headline, LIMITS.headline),
        highlight: str(hero.highlight, B.hero.highlight, LIMITS.highlight),
        subheadline: str(hero.subheadline, B.hero.subheadline, LIMITS.subheadline),
        ctaPrimary: str(hero.ctaPrimary, B.hero.ctaPrimary, LIMITS.cta) || B.hero.ctaPrimary,
        ctaSecondary: str(hero.ctaSecondary, B.hero.ctaSecondary, LIMITS.cta),
        imageUrl: hero.imageUrl !== undefined ? cleanUrl(hero.imageUrl) : B.hero.imageUrl,
      },
      stats: { items: normalizeStats(stats.items, B.stats.items) },
      about: {
        eyebrow: str(about.eyebrow, B.about.eyebrow, LIMITS.eyebrow),
        title: str(about.title, B.about.title, LIMITS.title),
        highlight: str(about.highlight, B.about.highlight, LIMITS.highlight),
        text: str(about.text, B.about.text, LIMITS.text),
        imageUrl: about.imageUrl !== undefined ? cleanUrl(about.imageUrl) : B.about.imageUrl,
        cta: str(about.cta, B.about.cta, LIMITS.cta),
      },
      services: {
        eyebrow: str(services.eyebrow, B.services.eyebrow, LIMITS.eyebrow),
        title: str(services.title, B.services.title, LIMITS.title),
        highlight: str(services.highlight, B.services.highlight, LIMITS.highlight),
        subtitle: str(services.subtitle, B.services.subtitle, LIMITS.subheadline),
        showPrices: bool(services.showPrices, B.services.showPrices),
        showDuration: bool(services.showDuration, B.services.showDuration),
      },
      gallery: {
        eyebrow: str(gallery.eyebrow, B.gallery.eyebrow, LIMITS.eyebrow),
        title: str(gallery.title, B.gallery.title, LIMITS.title),
        highlight: str(gallery.highlight, B.gallery.highlight, LIMITS.highlight),
        items: normalizeGallery(gallery.items),
      },
      beforeAfter: {
        eyebrow: str(beforeAfter.eyebrow, B.beforeAfter.eyebrow, LIMITS.eyebrow),
        title: str(beforeAfter.title, B.beforeAfter.title, LIMITS.title),
        highlight: str(beforeAfter.highlight, B.beforeAfter.highlight, LIMITS.highlight),
        items: normalizeBeforeAfter(beforeAfter.items),
      },
      testimonials: {
        eyebrow: str(testimonials.eyebrow, B.testimonials.eyebrow, LIMITS.eyebrow),
        title: str(testimonials.title, B.testimonials.title, LIMITS.title),
        highlight: str(testimonials.highlight, B.testimonials.highlight, LIMITS.highlight),
        items: normalizeTestimonials(testimonials.items),
      },
      faq: {
        eyebrow: str(faq.eyebrow, B.faq.eyebrow, LIMITS.eyebrow),
        title: str(faq.title, B.faq.title, LIMITS.title),
        highlight: str(faq.highlight, B.faq.highlight, LIMITS.highlight),
        items: normalizeFaq(faq.items),
      },
      location: {
        eyebrow: str(location.eyebrow, B.location.eyebrow, LIMITS.eyebrow),
        title: str(location.title, B.location.title, LIMITS.title),
        highlight: str(location.highlight, B.location.highlight, LIMITS.highlight),
        hours: str(location.hours, B.location.hours, LIMITS.short),
        note: str(location.note, B.location.note, LIMITS.subheadline),
      },
      contact: {
        eyebrow: str(contact.eyebrow, B.contact.eyebrow, LIMITS.eyebrow),
        title: str(contact.title, B.contact.title, LIMITS.title),
        highlight: str(contact.highlight, B.contact.highlight, LIMITS.highlight),
        text: str(contact.text, B.contact.text, LIMITS.subheadline),
        cta: str(contact.cta, B.contact.cta, LIMITS.cta) || B.contact.cta,
      },
      footer: { note: str(footer.note, B.footer.note, LIMITS.short) },
    },
    sections: normalizeSections(c.sections, base.sections),
    links: normalizeLinks(c.links, base.links),
    seo: {
      title: str(seo.title, base.seo.title, LIMITS.title),
      description: str(seo.description, base.seo.description, 160),
      ogImageUrl: seo.ogImageUrl !== undefined ? cleanUrl(seo.ogImageUrl) : base.seo.ogImageUrl,
    },
  };
}

/**
 * Seções que serão realmente desenhadas: ligadas pela profissional, suportadas
 * pelo template e (para as de lista) com conteúdo. Uma galeria vazia não vira
 * um buraco na página.
 */
export function resolveVisibleSections(
  config: SiteConfig,
  supported: SiteSectionId[],
  opts: { hasServices: boolean },
): SiteSectionId[] {
  const supportedSet = new Set(supported);
  return config.sections.order.filter((id) => {
    if (!supportedSet.has(id)) return false;
    if (!config.sections.enabled[id]) return false;
    switch (id) {
      case 'services': return opts.hasServices;
      case 'gallery': return config.content.gallery.items.length > 0;
      case 'beforeAfter': return config.content.beforeAfter.items.length > 0;
      case 'testimonials': return config.content.testimonials.items.length > 0;
      case 'faq': return config.content.faq.items.length > 0;
      case 'stats': return config.content.stats.items.length > 0;
      case 'location': return !!(config.identity.address || config.identity.city || config.content.location.hours);
      default: return true;
    }
  });
}


// ============================================================================
// Página de links — destino real de cada botão
// ============================================================================

export interface ResolvedLink {
  id: string;
  kind: SiteLinkKind;
  label: string;
  /** null = abre o agendamento (não é navegação). */
  href: string | null;
  external: boolean;
}

/**
 * Transforma a lista configurada nos botões que REALMENTE aparecem: ligados e
 * com destino. O WhatsApp sem número e o mapa sem endereço somem sozinhos — a
 * profissional não precisa lembrar de desligar o que não tem.
 */
export function resolveLinks(config: SiteConfig): ResolvedLink[] {
  const i = config.identity;
  const digits = (i.whatsapp || '').replace(/\D/g, '');
  const wa = digits.length >= 10
    ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}?text=${encodeURIComponent(`Olá! Vim pela sua página e gostaria de falar com ${i.studioName || 'você'}.`)}`
    : null;
  const ig = i.instagram ? `https://instagram.com/${i.instagram.replace(/^@/, '')}` : null;
  const mapsQuery = [i.address, i.city].filter(Boolean).join(', ');
  const maps = mapsQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}` : null;

  const out: ResolvedLink[] = [];
  for (const item of config.links.items) {
    if (!item.enabled) continue;
    switch (item.kind) {
      case 'book':
        out.push({ id: item.id, kind: 'book', label: item.label, href: null, external: false });
        break;
      case 'whatsapp':
        if (wa) out.push({ id: item.id, kind: 'whatsapp', label: item.label, href: wa, external: true });
        break;
      case 'instagram':
        if (ig) out.push({ id: item.id, kind: 'instagram', label: item.label, href: ig, external: true });
        break;
      case 'maps':
        if (maps) out.push({ id: item.id, kind: 'maps', label: item.label, href: maps, external: true });
        break;
      case 'custom':
        if (item.url) out.push({ id: item.id, kind: 'custom', label: item.label, href: item.url, external: true });
        break;
    }
  }
  return out;
}
