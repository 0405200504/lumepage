/**
 * ============================================================================
 * LUME · Paletas prontas da página pública
 * ============================================================================
 * Escolher 4 cores em um seletor hexadecimal é tarefa de designer. Aqui a
 * profissional escolhe UMA paleta com nome ("Nude & Vinho", "Noite & Ouro") e
 * as 4 cores entram casadas — inclusive as escuras, porque `themeToCssVars`
 * detecta fundo escuro e inverte as superfícies sozinho.
 *
 * O seletor de cor manual continua existindo, escondido atrás de "ajuste fino":
 * quem quiser a cor exata da marca ainda consegue.
 *
 * Arquivo PURO (sem React / sem servidor).
 */

import type { SiteTheme } from '@/types/site';

export type PaletteGroupId = 'nude' | 'quente' | 'fria' | 'escura' | 'vibrante';

export const PALETTE_GROUP_LABEL: Record<PaletteGroupId, string> = {
  nude: 'Nude & neutras',
  quente: 'Quentes e acolhedoras',
  fria: 'Frias e serenas',
  escura: 'Escuras e luxuosas',
  vibrante: 'Vibrantes e modernas',
};

export interface SitePalette {
  id: string;
  name: string;
  group: PaletteGroupId;
  /** Em uma linha: para quem essa combinação funciona. */
  bestFor: string;
  colors: Pick<SiteTheme, 'primary' | 'secondary' | 'background' | 'foreground'>;
}

export const SITE_PALETTES: SitePalette[] = [
  // ── Nude & neutras ────────────────────────────────────────────────────────
  {
    id: 'nude-vinho',
    name: 'Nude & Vinho',
    group: 'nude',
    bestFor: 'Unhas, nail art e estúdios que querem parecer sofisticados',
    colors: { primary: '#6e2233', secondary: '#c9a88a', background: '#faf7f2', foreground: '#2b2724' },
  },
  {
    id: 'marfim-dourado',
    name: 'Marfim & Dourado',
    group: 'nude',
    bestFor: 'Cílios, sobrancelhas e serviços premium',
    colors: { primary: '#b8956a', secondary: '#8e6d47', background: '#fdfcfa', foreground: '#1c1917' },
  },
  {
    id: 'rose-champagne',
    name: 'Rosé & Champagne',
    group: 'nude',
    bestFor: 'Salões, lash e tudo que pede um clima romântico',
    colors: { primary: '#875f46', secondary: '#d3ba9c', background: '#f7f2e9', foreground: '#2c2a29' },
  },
  {
    id: 'mocha',
    name: 'Mocha Cremoso',
    group: 'nude',
    bestFor: 'Marcas neutras e atemporais, sem cor forte nenhuma',
    colors: { primary: '#7a5c4e', secondary: '#c9b3a3', background: '#f7f2ee', foreground: '#2a221e' },
  },
  {
    id: 'preto-branco',
    name: 'Preto & Branco',
    group: 'nude',
    bestFor: 'Quem quer o visual mais minimalista possível',
    colors: { primary: '#1a1a1a', secondary: '#8a8a8a', background: '#ffffff', foreground: '#141414' },
  },

  {
    id: 'perola-grafite',
    name: 'Pérola & Grafite',
    group: 'nude',
    bestFor: 'Quem quer o visual mais sóbrio e profissional possível, sem cor forte',
    colors: { primary: '#3a3a3a', secondary: '#b9ada0', background: '#f6f3ee', foreground: '#262626' },
  },
  {
    id: 'caramelo',
    name: 'Caramelo & Off-white',
    group: 'nude',
    bestFor: 'Cabelo, bronzeamento e estúdios de clima quente e discreto',
    colors: { primary: '#8a5a2e', secondary: '#d9b991', background: '#fbf8f3', foreground: '#2a241f' },
  },
  {
    id: 'bordo-marfim',
    name: 'Bordô & Marfim',
    group: 'nude',
    bestFor: 'Unhas e estúdios que querem ar de grife clássica',
    colors: { primary: '#5a1c2c', secondary: '#a88d6d', background: '#fcfaf6', foreground: '#2a2224' },
  },
  // ── Quentes ───────────────────────────────────────────────────────────────
  {
    id: 'terracota',
    name: 'Terracota & Barro',
    group: 'quente',
    bestFor: 'Massagem, spa, terapias e estética natural',
    colors: { primary: '#8c4a3e', secondary: '#3b2e2a', background: '#f9f8f6', foreground: '#1c1a19' },
  },
  {
    id: 'areia-bronze',
    name: 'Areia & Bronze',
    group: 'quente',
    bestFor: 'Portfólio forte, com títulos grandes e muita foto',
    colors: { primary: '#8c7853', secondary: '#2a2826', background: '#f8f7f5', foreground: '#2a2826' },
  },
  {
    id: 'cafe-creme',
    name: 'Café & Creme',
    group: 'quente',
    bestFor: 'Cabelo, coloração e estúdios com pegada aconchegante',
    colors: { primary: '#4a3729', secondary: '#a98467', background: '#f6f1ea', foreground: '#2a211b' },
  },
  {
    id: 'coral-suave',
    name: 'Coral Suave',
    group: 'quente',
    bestFor: 'Depilação, maquiagem e públicos mais jovens',
    colors: { primary: '#c1533f', secondary: '#e8a598', background: '#fff8f4', foreground: '#2e211d' },
  },

  {
    id: 'chocolate-pessego',
    name: 'Chocolate & Pêssego',
    group: 'quente',
    bestFor: 'Maquiagem, sobrancelha e quem gosta de tom de pele quente',
    colors: { primary: '#4a2c22', secondary: '#e3a98f', background: '#fbf5f0', foreground: '#2b1f1a' },
  },
  {
    id: 'ambar-linho',
    name: 'Âmbar & Linho',
    group: 'quente',
    bestFor: 'Spa, massagem e terapias com clima de luz de fim de tarde',
    colors: { primary: '#8f5f1e', secondary: '#cdb48e', background: '#faf6ef', foreground: '#2d2619' },
  },
  // ── Frias ─────────────────────────────────────────────────────────────────
  {
    id: 'sage',
    name: 'Verde Sálvia',
    group: 'fria',
    bestFor: 'Clínicas de estética, skincare e procedimentos',
    colors: { primary: '#718a7a', secondary: '#819888', background: '#faf9f6', foreground: '#2d312f' },
  },
  {
    id: 'azul-noite',
    name: 'Azul Sereno',
    group: 'fria',
    bestFor: 'Podologia, fisioterapia e serviços de saúde',
    colors: { primary: '#24405e', secondary: '#8aa7bf', background: '#f5f7fa', foreground: '#1b2430' },
  },
  {
    id: 'lavanda',
    name: 'Lavanda',
    group: 'fria',
    bestFor: 'Relaxamento, aromaterapia e bem-estar',
    colors: { primary: '#6b5b8c', secondary: '#b6a6cb', background: '#f8f6fb', foreground: '#2b2733' },
  },
  {
    id: 'oliva',
    name: 'Oliva & Linho',
    group: 'fria',
    bestFor: 'Estética natural, produtos orgânicos e terapias',
    colors: { primary: '#5a6b3f', secondary: '#a3b18a', background: '#f7f7f2', foreground: '#2b2f26' },
  },
  {
    id: 'cinza-gelo',
    name: 'Cinza Gelo',
    group: 'fria',
    bestFor: 'Barbearia, estúdio unissex e visual mais técnico',
    colors: { primary: '#46505a', secondary: '#9aa7b4', background: '#f6f8fa', foreground: '#1f262c' },
  },

  {
    id: 'marinho-latao',
    name: 'Marinho & Latão',
    group: 'fria',
    bestFor: 'Clínicas, barbearias e quem quer parecer sério e caro',
    colors: { primary: '#1f2f4a', secondary: '#b0905a', background: '#f7f7f4', foreground: '#1b2130' },
  },
  {
    id: 'floresta-creme',
    name: 'Verde Floresta & Creme',
    group: 'fria',
    bestFor: 'Estética natural, terapias e produtos veganos',
    colors: { primary: '#2f4a3a', secondary: '#b7a989', background: '#f8f6f1', foreground: '#1f2a24' },
  },
  {
    id: 'ardosia-rosa',
    name: 'Ardósia & Rosa Pálido',
    group: 'fria',
    bestFor: 'Moderno e calmo, para quem acha o rosa tradicional demais',
    colors: { primary: '#454d5a', secondary: '#d9b8b4', background: '#f6f5f3', foreground: '#262a31' },
  },
  // ── Escuras ───────────────────────────────────────────────────────────────
  {
    id: 'noite-ouro',
    name: 'Noite & Ouro',
    group: 'escura',
    bestFor: 'Estúdio premium — o fundo escuro faz a foto saltar',
    colors: { primary: '#d4af6a', secondary: '#8f7742', background: '#14110f', foreground: '#f3ece2' },
  },
  {
    id: 'vinho-noturno',
    name: 'Vinho Noturno',
    group: 'escura',
    bestFor: 'Nail art autoral e marcas com personalidade forte',
    colors: { primary: '#c98b98', secondary: '#6e2233', background: '#191113', foreground: '#f5e9ec' },
  },
  {
    id: 'esmeralda-escura',
    name: 'Esmeralda Escura',
    group: 'escura',
    bestFor: 'Spa noturno, massagem e experiências sensoriais',
    colors: { primary: '#7fbfa1', secondary: '#2f5d4a', background: '#0f1714', foreground: '#eaf3ee' },
  },
  {
    id: 'grafite',
    name: 'Grafite & Prata',
    group: 'escura',
    bestFor: 'Barbearia, tatuagem e público masculino',
    colors: { primary: '#c9ccd1', secondary: '#6b7480', background: '#16181c', foreground: '#eceef1' },
  },

  {
    id: 'chocolate-noturno',
    name: 'Chocolate Noturno',
    group: 'escura',
    bestFor: 'Cabelo, barbearia e estúdios de ar aconchegante à noite',
    colors: { primary: '#d9b48f', secondary: '#8a6a4f', background: '#1f1612', foreground: '#f4ebe2' },
  },
  {
    id: 'preto-rose',
    name: 'Preto & Rosé',
    group: 'escura',
    bestFor: 'Lash, nails e makeup com visual de boutique noturna',
    colors: { primary: '#e0aeae', secondary: '#8c5e5e', background: '#141214', foreground: '#f5efef' },
  },
  {
    id: 'marinho-noturno',
    name: 'Marinho Noturno',
    group: 'escura',
    bestFor: 'Clínicas e profissionais que querem autoridade e sofisticação',
    colors: { primary: '#d4bd85', secondary: '#6c7a95', background: '#10172a', foreground: '#eef0f5' },
  },
  // ── Vibrantes ─────────────────────────────────────────────────────────────
  {
    id: 'rosa-moderno',
    name: 'Rosa Moderno',
    group: 'vibrante',
    bestFor: 'Marcas alegres que querem ser lembradas pela cor',
    colors: { primary: '#b8446a', secondary: '#f0c3d2', background: '#fff7fa', foreground: '#2b1e24' },
  },
  {
    id: 'lilas-vibrante',
    name: 'Lilás Vibrante',
    group: 'vibrante',
    bestFor: 'Nail art colorida, maquiagem e público jovem',
    colors: { primary: '#7a4bd6', secondary: '#cbb4f5', background: '#faf7ff', foreground: '#241d33' },
  },
  {
    id: 'turquesa',
    name: 'Turquesa',
    group: 'vibrante',
    bestFor: 'Estética corporal e serviços com clima de verão',
    colors: { primary: '#12776f', secondary: '#8fd4cb', background: '#f3fbfa', foreground: '#122522' },
  },
  {
    id: 'violeta-creme',
    name: 'Violeta & Creme',
    group: 'vibrante',
    bestFor: 'Estética, bem-estar e marcas com personalidade',
    colors: { primary: '#5b3a8e', secondary: '#c7b5e3', background: '#faf8fd', foreground: '#241b33' },
  },
  {
    id: 'terra-mostarda',
    name: 'Terra & Mostarda',
    group: 'vibrante',
    bestFor: 'Tranças, cachos e estúdios com energia e cor',
    colors: { primary: '#a4522a', secondary: '#d9a24a', background: '#fcf8f1', foreground: '#2c2219' },
  },
];

export const DEFAULT_PALETTE_ID = 'nude-vinho';

export function getPalette(id: string | null | undefined): SitePalette | undefined {
  return SITE_PALETTES.find(p => p.id === id);
}

/** Agrupa as paletas para o editor mostrar em blocos com título. */
export function palettesByGroup(): { group: PaletteGroupId; label: string; items: SitePalette[] }[] {
  const order: PaletteGroupId[] = ['nude', 'quente', 'fria', 'escura', 'vibrante'];
  return order.map(g => ({
    group: g,
    label: PALETTE_GROUP_LABEL[g],
    items: SITE_PALETTES.filter(p => p.group === g),
  }));
}

/**
 * Qual paleta corresponde ao tema atual (para marcar o card selecionado).
 * Compara as 4 cores; devolve undefined se a profissional ajustou na mão.
 */
export function matchPalette(theme: Pick<SiteTheme, 'primary' | 'secondary' | 'background' | 'foreground'>): SitePalette | undefined {
  const eq = (a: string, b: string) => (a || '').toLowerCase() === (b || '').toLowerCase();
  return SITE_PALETTES.find(p =>
    eq(p.colors.primary, theme.primary)
    && eq(p.colors.secondary, theme.secondary)
    && eq(p.colors.background, theme.background)
    && eq(p.colors.foreground, theme.foreground));
}
