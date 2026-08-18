/**
 * ============================================================================
 * LUME · Registro de templates da página pública
 * ============================================================================
 * Templates são CÓDIGO. Profissionais são REGISTROS no banco.
 *
 * Para adicionar o Template 07 amanhã, bastam 3 passos — sem tocar no editor,
 * no banco ou no renderer:
 *   1. criar components/site/templates/<pasta>/index.tsx
 *   2. registrar o metadado aqui em SITE_TEMPLATES
 *   3. mapear o componente em components/site/SiteRenderer.tsx
 *
 * Este arquivo é PURO (sem imports de servidor nem de React): o editor no
 * cliente e a página pública no servidor usam os mesmos metadados.
 */

import type { SiteSectionId, SiteTheme } from '@/types/site';

export interface SiteTemplateMeta {
  id: string;
  name: string;
  /** Etiqueta curta mostrada no card de escolha. */
  category: string;
  /** Para quem esse visual foi desenhado. */
  bestFor: string;
  description: string;
  /** Folha do Google Fonts usada pelo template (carregada só na página pública). */
  fontsHref: string;
  /** Cores iniciais ao escolher o template (a profissional pode trocar depois). */
  defaultTheme: SiteTheme;
  /** Seções que este template sabe desenhar. As demais são ignoradas. */
  supportedSections: SiteSectionId[];
  /** Miniatura do card — desenhada com as próprias cores, sem arquivo de imagem. */
  preview: {
    background: string;
    surface: string;
    accent: string;
    text: string;
    /** Estilo do mock: muda o desenho da miniatura no seletor. */
    layout: 'split' | 'centered' | 'editorial' | 'cards' | 'stacked';
    /** Fonte de título usada na miniatura. */
    titleFont: string;
  };
}

/** Todas as seções — atalho para templates que desenham o catálogo inteiro. */
const ALL: SiteSectionId[] = [
  'hero', 'stats', 'about', 'services', 'gallery',
  'beforeAfter', 'testimonials', 'faq', 'location', 'contact',
];

export const SITE_TEMPLATES: SiteTemplateMeta[] = [
  {
    id: 'editorial-nude',
    name: 'Editorial Nude',
    category: 'Elegante',
    bestFor: 'Nail designer, manicure, estúdio de unhas',
    description:
      'Creme quente, nude e vinho, com títulos em serifa e itálico. Galeria em mosaico estilo Pinterest e cartões de serviço com foto.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap',
    defaultTheme: {
      primary: '#6e2233',
      secondary: '#c9a88a',
      background: '#faf7f2',
      foreground: '#2b2724',
      radius: 'round',
    },
    supportedSections: ALL,
    preview: {
      background: '#faf7f2', surface: '#ffffff', accent: '#6e2233',
      text: '#2b2724', layout: 'split', titleFont: "'Playfair Display', serif",
    },
  },
  {
    id: 'gold-premium',
    name: 'Gold Premium',
    category: 'Premium',
    bestFor: 'Lash designer, sobrancelhas, estúdio do olhar',
    description:
      'Marfim, dourado e carvão. Tipografia serifada leve, muito respiro entre as seções e um ar de revista de luxo.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Inter:wght@300;400;500&display=swap',
    defaultTheme: {
      primary: '#b8956a',
      secondary: '#8e6d47',
      background: '#fdfcfa',
      foreground: '#1c1917',
      radius: 'sharp',
    },
    supportedSections: ALL,
    preview: {
      background: '#fdfcfa', surface: '#f7f4f0', accent: '#b8956a',
      text: '#1c1917', layout: 'centered', titleFont: "'Cormorant Garamond', serif",
    },
  },
  {
    id: 'terracota',
    name: 'Terracota',
    category: 'Acolhedor',
    bestFor: 'Esteticista, massagista, terapias e bem-estar',
    description:
      'Marrom profundo, terracota e bege areia. Layout clássico e caloroso, com blocos de texto que explicam bem o método de trabalho.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Montserrat:wght@300;400;500;600&display=swap',
    defaultTheme: {
      primary: '#3b2e2a',
      secondary: '#8c4a3e',
      background: '#f9f8f6',
      foreground: '#1c1a19',
      radius: 'sharp',
    },
    supportedSections: ALL,
    preview: {
      background: '#f9f8f6', surface: '#d8cebe', accent: '#8c4a3e',
      text: '#3b2e2a', layout: 'stacked', titleFont: "'Cormorant Garamond', serif",
    },
  },
  {
    id: 'clinic-sage',
    name: 'Clínica Sage',
    category: 'Clean',
    bestFor: 'Clínica de estética, dermato, procedimentos',
    description:
      'Branco, verde-sálvia e bege claro. Visual clínico, calmo e confiável, com blocos bem separados e leitura fácil.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=Inter:wght@300;400;500&display=swap',
    defaultTheme: {
      primary: '#718a7a',
      secondary: '#819888',
      background: '#faf9f6',
      foreground: '#2d312f',
      radius: 'round',
    },
    supportedSections: ALL,
    preview: {
      background: '#faf9f6', surface: '#e1e8e3', accent: '#718a7a',
      text: '#2d312f', layout: 'cards', titleFont: "'Outfit', sans-serif",
    },
  },
  {
    id: 'editorial-bronze',
    name: 'Editorial Bronze',
    category: 'Autoral',
    bestFor: 'Quem quer impacto visual e um site diferente de todos',
    description:
      'Títulos gigantes, layout assimétrico e bronze sobre areia. O visual mais ousado do catálogo — ótimo para portfólio forte.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&family=Montserrat:wght@300;400;500;600&display=swap',
    defaultTheme: {
      primary: '#8c7853',
      secondary: '#2a2826',
      background: '#f8f7f5',
      foreground: '#2a2826',
      radius: 'sharp',
    },
    supportedSections: ALL,
    preview: {
      background: '#f8f7f5', surface: '#efece6', accent: '#8c7853',
      text: '#2a2826', layout: 'editorial', titleFont: "'Playfair Display', serif",
    },
  },
  {
    id: 'rose-champagne',
    name: 'Rosé Champagne',
    category: 'Beauty',
    bestFor: 'Lash, brow, cílios, design de olhar e salões',
    description:
      'Rosé, champagne e off-white com cartões suaves. O mais "beleza" do catálogo: muitos blocos de prova social e antes/depois.',
    fontsHref:
      'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Poppins:wght@300;400;500;600;700&display=swap',
    defaultTheme: {
      primary: '#875f46',
      secondary: '#d3ba9c',
      background: '#f7f2e9',
      foreground: '#2c2a29',
      radius: 'soft',
    },
    supportedSections: ALL,
    preview: {
      background: '#f7f2e9', surface: '#ffffff', accent: '#875f46',
      text: '#2c2a29', layout: 'split', titleFont: "'Playfair Display', serif",
    },
  },
];

/** Template padrão de quem ainda não escolheu (nunca deixa a página sem desenho). */
export const DEFAULT_TEMPLATE_ID = 'editorial-nude';

export function getTemplateMeta(id: string | null | undefined): SiteTemplateMeta {
  return SITE_TEMPLATES.find(t => t.id === id) || SITE_TEMPLATES[0];
}

export function isValidTemplateId(id: unknown): id is string {
  return typeof id === 'string' && SITE_TEMPLATES.some(t => t.id === id);
}
