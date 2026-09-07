/**
 * ============================================================================
 * LUME · Modelos prontos ("looks") da página pública
 * ============================================================================
 * Um LOOK é a página inteira já decidida: layout + paleta + dupla de fontes +
 * cantos. É o que a profissional realmente quer escolher — ela não pensa
 * "quero o layout editorial com a paleta vinho-noturno e a fonte Bodoni",
 * ela pensa "quero AQUELE, o escuro bonito".
 *
 * Os três ingredientes continuam existindo separados (templates, palettes,
 * fonts) e podem ser trocados um a um depois. O look é só um atalho — e é o
 * que multiplica 6 layouts em 22 páginas visualmente diferentes sem escrever
 * um único componente novo.
 *
 * Arquivo PURO (sem React / sem servidor).
 */

import type { SiteTheme } from '@/types/site';
import { getTemplateMeta, type SiteTemplateMeta } from './templates';
import { getPalette, SITE_PALETTES, type SitePalette } from './palettes';
import { getFontPair, type SiteFontPair } from './fonts';
import type { NicheId } from './presets';
import { lighten, mix, luminance } from './theme';

export type LookVibe = 'elegante' | 'clean' | 'acolhedor' | 'ousado' | 'escuro' | 'doce';

export const LOOK_VIBE_LABEL: Record<LookVibe, string> = {
  elegante: 'Elegante',
  clean: 'Clean',
  acolhedor: 'Acolhedor',
  ousado: 'Ousado',
  escuro: 'Escuro',
  doce: 'Doce',
};

export interface SiteLook {
  id: string;
  name: string;
  /** Uma frase curta que descreve o clima — é o que vende o card. */
  tagline: string;
  vibe: LookVibe;
  templateId: string;
  paletteId: string;
  fontPairId: string;
  radius: SiteTheme['radius'];
  /** Nichos em que este look costuma cair bem (usado para recomendar). */
  niches: NicheId[];
}

export const SITE_LOOKS: SiteLook[] = [
  // ── Editorial Nude ────────────────────────────────────────────────────────
  {
    id: 'nude-editorial',
    name: 'Nude Editorial',
    tagline: 'Creme, vinho e serifa em itálico. O clássico da beleza.',
    vibe: 'elegante',
    templateId: 'editorial-nude', paletteId: 'nude-vinho', fontPairId: 'playfair-inter', radius: 'round',
    niches: ['nails', 'general'],
  },
  {
    id: 'boutique-mocha',
    name: 'Boutique Mocha',
    tagline: 'Neutro do início ao fim, com letra de vitrine antiga.',
    vibe: 'elegante',
    templateId: 'editorial-nude', paletteId: 'mocha', fontPairId: 'marcellus-karla', radius: 'soft',
    niches: ['nails', 'esthetics', 'general'],
  },
  {
    id: 'nails-noturno',
    name: 'Nails Noturno',
    tagline: 'Fundo escuro e rosa antigo — a foto do trabalho salta da tela.',
    vibe: 'escuro',
    templateId: 'editorial-nude', paletteId: 'vinho-noturno', fontPairId: 'bodoni-jost', radius: 'soft',
    niches: ['nails', 'lashes_brows'],
  },

  // ── Gold Premium ──────────────────────────────────────────────────────────
  {
    id: 'ouro-discreto',
    name: 'Ouro Discreto',
    tagline: 'Marfim, dourado e muito respiro. Ar de revista de luxo.',
    vibe: 'elegante',
    templateId: 'gold-premium', paletteId: 'marfim-dourado', fontPairId: 'cormorant-inter', radius: 'sharp',
    niches: ['lashes_brows', 'esthetics'],
  },
  {
    id: 'suite-champagne',
    name: 'Suíte Champagne',
    tagline: 'Rosé e champanhe com letra romana. Delicado e caro.',
    vibe: 'elegante',
    templateId: 'gold-premium', paletteId: 'rose-champagne', fontPairId: 'marcellus-karla', radius: 'soft',
    niches: ['lashes_brows', 'general'],
  },
  {
    id: 'black-gold',
    name: 'Black & Gold',
    tagline: 'Preto profundo com dourado. O mais premium do catálogo.',
    vibe: 'escuro',
    templateId: 'gold-premium', paletteId: 'noite-ouro', fontPairId: 'bodoni-jost', radius: 'sharp',
    niches: ['lashes_brows', 'hair', 'general'],
  },
  {
    id: 'esmeralda-noturna',
    name: 'Esmeralda Noturna',
    tagline: 'Verde escuro e sereno. Clima de spa depois do expediente.',
    vibe: 'escuro',
    templateId: 'gold-premium', paletteId: 'esmeralda-escura', fontPairId: 'cormorant-inter', radius: 'sharp',
    niches: ['massage_spa', 'esthetics'],
  },

  // ── Terracota ─────────────────────────────────────────────────────────────
  {
    id: 'spa-terracota',
    name: 'Spa Terracota',
    tagline: 'Barro, bege e texto que explica o método com calma.',
    vibe: 'acolhedor',
    templateId: 'terracota', paletteId: 'terracota', fontPairId: 'cormorant-montserrat', radius: 'sharp',
    niches: ['massage_spa', 'esthetics'],
  },
  {
    id: 'refugio-oliva',
    name: 'Refúgio Oliva',
    tagline: 'Verde-oliva e serifa macia. Natural sem parecer amador.',
    vibe: 'acolhedor',
    templateId: 'terracota', paletteId: 'oliva', fontPairId: 'fraunces-nunito', radius: 'soft',
    niches: ['massage_spa', 'esthetics', 'general'],
  },
  {
    id: 'cafe-cuidado',
    name: 'Café & Cuidado',
    tagline: 'Tons de café com serifa cheia. Aconchego de casa.',
    vibe: 'acolhedor',
    templateId: 'terracota', paletteId: 'cafe-creme', fontPairId: 'dmserif-dmsans', radius: 'soft',
    niches: ['hair', 'massage_spa'],
  },
  {
    id: 'coral-suave',
    name: 'Coral Suave',
    tagline: 'Coral quente e leve, para quem não quer nada sério demais.',
    vibe: 'doce',
    templateId: 'terracota', paletteId: 'coral-suave', fontPairId: 'fraunces-nunito', radius: 'round',
    niches: ['general', 'esthetics'],
  },

  // ── Clínica Sage ──────────────────────────────────────────────────────────
  {
    id: 'clinica-sage',
    name: 'Clínica Sage',
    tagline: 'Branco e verde-sálvia. Calmo, clínico e confiável.',
    vibe: 'clean',
    templateId: 'clinic-sage', paletteId: 'sage', fontPairId: 'outfit-inter', radius: 'round',
    niches: ['esthetics', 'massage_spa'],
  },
  {
    id: 'derma-azul',
    name: 'Derma Azul',
    tagline: 'Azul sereno e sans geométrica. Cara de consultório sério.',
    vibe: 'clean',
    templateId: 'clinic-sage', paletteId: 'azul-noite', fontPairId: 'outfit-inter', radius: 'soft',
    niches: ['esthetics', 'general'],
  },
  {
    id: 'gelo-editorial',
    name: 'Gelo Editorial',
    tagline: 'Cinza gelo com serifa moderna. Neutro e atual.',
    vibe: 'clean',
    templateId: 'clinic-sage', paletteId: 'cinza-gelo', fontPairId: 'dmserif-dmsans', radius: 'round',
    niches: ['hair', 'general'],
  },
  {
    id: 'lavanda-serena',
    name: 'Lavanda Serena',
    tagline: 'Lilás claro e letra arredondada. Leve e relaxante.',
    vibe: 'doce',
    templateId: 'clinic-sage', paletteId: 'lavanda', fontPairId: 'quicksand-nunito', radius: 'round',
    niches: ['massage_spa', 'general'],
  },

  // ── Editorial Bronze ──────────────────────────────────────────────────────
  {
    id: 'bronze-editorial',
    name: 'Bronze Editorial',
    tagline: 'Títulos gigantes, layout torto de propósito. Puro portfólio.',
    vibe: 'ousado',
    templateId: 'editorial-bronze', paletteId: 'areia-bronze', fontPairId: 'playfair-montserrat', radius: 'sharp',
    niches: ['hair', 'nails'],
  },
  {
    id: 'alta-costura',
    name: 'Alta Costura',
    tagline: 'Preto no branco com contraste de revista de moda.',
    vibe: 'ousado',
    templateId: 'editorial-bronze', paletteId: 'preto-branco', fontPairId: 'bodoni-jost', radius: 'sharp',
    niches: ['hair', 'general'],
  },
  {
    id: 'grafite-studio',
    name: 'Grafite Studio',
    tagline: 'Cinza escuro e sans limpa. Funciona para público masculino.',
    vibe: 'escuro',
    templateId: 'editorial-bronze', paletteId: 'grafite', fontPairId: 'outfit-inter', radius: 'sharp',
    niches: ['hair', 'general'],
  },

  // ── Rosé Champagne ────────────────────────────────────────────────────────
  {
    id: 'rose-classico',
    name: 'Rosé Clássico',
    tagline: 'Rosé, cartões suaves e muita prova social. O mais "beleza".',
    vibe: 'doce',
    templateId: 'rose-champagne', paletteId: 'rose-champagne', fontPairId: 'playfair-poppins', radius: 'soft',
    niches: ['lashes_brows', 'general', 'nails'],
  },
  {
    id: 'doce-lilas',
    name: 'Doce Lilás',
    tagline: 'Lilás vibrante com tudo arredondado. Jovem e alegre.',
    vibe: 'doce',
    templateId: 'rose-champagne', paletteId: 'lilas-vibrante', fontPairId: 'quicksand-nunito', radius: 'round',
    niches: ['nails', 'general'],
  },
  {
    id: 'rosa-moderno',
    name: 'Rosa Moderno',
    tagline: 'Rosa forte e sans geométrica. Impossível de esquecer.',
    vibe: 'ousado',
    templateId: 'rose-champagne', paletteId: 'rosa-moderno', fontPairId: 'outfit-inter', radius: 'round',
    niches: ['nails', 'lashes_brows', 'general'],
  },
  {
    id: 'verao-turquesa',
    name: 'Verão Turquesa',
    tagline: 'Turquesa clarinho com ar de praia. Fresco e diferente.',
    vibe: 'doce',
    templateId: 'rose-champagne', paletteId: 'turquesa', fontPairId: 'outfit-inter', radius: 'round',
    niches: ['esthetics', 'general'],
  },
];

export function getLook(id: string | null | undefined): SiteLook | undefined {
  return SITE_LOOKS.find(l => l.id === id);
}

/** Ingredientes já resolvidos — o editor não precisa cruzar três listas. */
export interface ResolvedLook {
  look: SiteLook;
  template: SiteTemplateMeta;
  palette: SitePalette;
  font: SiteFontPair;
  theme: SiteTheme;
}

export function resolveLook(look: SiteLook): ResolvedLook {
  const template = getTemplateMeta(look.templateId);
  const palette = getPalette(look.paletteId) || SITE_PALETTES[0];
  const font = getFontPair(look.fontPairId);
  return {
    look,
    template,
    palette,
    font,
    theme: { ...palette.colors, radius: look.radius, fontPair: font.id },
  };
}

export function resolvedLooks(): ResolvedLook[] {
  return SITE_LOOKS.map(resolveLook);
}

/**
 * Qual look corresponde ao estado atual (para marcar o card selecionado).
 * Devolve undefined assim que a profissional mexe em qualquer ingrediente —
 * o que é correto: a página deixou de ser aquele modelo pronto.
 */
export function matchLook(templateId: string, theme: SiteTheme): SiteLook | undefined {
  const eq = (a: string, b: string) => (a || '').toLowerCase() === (b || '').toLowerCase();
  return SITE_LOOKS.find(l => {
    if (l.templateId !== templateId) return false;
    if (l.radius !== theme.radius) return false;
    if (l.fontPairId !== theme.fontPair) return false;
    const p = getPalette(l.paletteId);
    return !!p
      && eq(p.colors.primary, theme.primary)
      && eq(p.colors.secondary, theme.secondary)
      && eq(p.colors.background, theme.background)
      && eq(p.colors.foreground, theme.foreground);
  });
}

/** Ordena os looks pondo os do nicho da profissional na frente. */
export function looksForNiche(niche: NicheId | undefined): ResolvedLook[] {
  const all = resolvedLooks();
  if (!niche) return all;
  const inNiche = all.filter(r => r.look.niches.includes(niche));
  const rest = all.filter(r => !r.look.niches.includes(niche));
  return [...inNiche, ...rest];
}

/**
 * Cores derivadas para a MINIATURA do card. É a mesma lógica de superfície do
 * `themeToCssVars` (um degrau acima do fundo, no sentido que dá mais
 * separação), duplicada aqui em versão mínima porque a miniatura é HTML solto
 * no editor, não uma página renderizada com as variáveis do tema.
 */
export function lookSwatch(theme: SiteTheme): { surface: string; line: string; isDark: boolean } {
  const isDark = luminance(theme.background) < 0.35;
  return {
    surface: isDark ? lighten(theme.background, 0.08) : '#ffffff',
    line: mix(theme.background, theme.foreground, isDark ? 0.25 : 0.12),
    isDark,
  };
}
