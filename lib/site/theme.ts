/**
 * ============================================================================
 * LUME · Tokens de tema da página pública
 * ============================================================================
 * A profissional escolhe 4 cores. Aqui derivamos o resto (hover, superfícies,
 * texto sobre o acento, bordas) de forma coerente — e, principalmente, com
 * LEGIBILIDADE GARANTIDA: o texto que vai por cima de uma cor é sempre
 * escolhido pelo contraste real, nunca chutado.
 *
 * Puro (sem React / sem servidor): serve o preview no editor e a página pública.
 */

import type { SiteTheme } from '@/types/site';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Valida um hex e devolve SEMPRE a forma canônica: 6 dígitos, minúsculo —
 * inclusive quando cai no fallback. Sem isso, `#6E2233` vindo de um lugar e
 * `#6e2233` de outro seriam a mesma cor com duas grafias, e qualquer
 * comparação de "mudou?" daria falso positivo.
 */
export function safeHex(value: unknown, fallback: string): string {
  const canonical = (hex: string) => (hex.length === 4
    ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex).toLowerCase();

  if (typeof value === 'string') {
    const v = value.trim();
    if (HEX.test(v)) return canonical(v);
  }
  const f = (fallback || '').trim();
  return HEX.test(f) ? canonical(f) : '#000000';
}

function toRgb(hex: string): [number, number, number] {
  const h = safeHex(hex, '#000000').slice(1);
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

/** Luminância relativa (WCAG) — base para decidir texto claro ou escuro. */
export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razão de contraste WCAG entre duas cores (1 a 21). */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * Texto que fica legível EM CIMA de `bg`. Testa as duas opções reais do tema
 * (o claro do fundo e o escuro do texto) e devolve a de maior contraste, com
 * branco/preto como rede de segurança.
 */
export function readableOn(bg: string, light = '#ffffff', dark = '#111111'): string {
  const cLight = contrast(bg, light);
  const cDark = contrast(bg, dark);
  if (Math.max(cLight, cDark) < 4.5) {
    // Nenhuma das cores do tema serve: cai no par máximo (branco/preto).
    return contrast(bg, '#ffffff') >= contrast(bg, '#000000') ? '#ffffff' : '#000000';
  }
  return cLight >= cDark ? light : dark;
}

export function mix(a: string, b: string, amount: number): string {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return toHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function darken(hex: string, amount = 0.15): string {
  return mix(hex, '#000000', amount);
}

export function lighten(hex: string, amount = 0.15): string {
  return mix(hex, '#ffffff', amount);
}

/** `rgba()` a partir de um hex — usado em sombras e véus sobre imagem. */
export function alpha(hex: string, a: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`;
}

const RADIUS_SCALE: Record<SiteTheme['radius'], { sm: string; md: string; lg: string; pill: string }> = {
  sharp: { sm: '2px', md: '4px', lg: '6px', pill: '4px' },
  soft: { sm: '6px', md: '12px', lg: '18px', pill: '999px' },
  round: { sm: '10px', md: '18px', lg: '28px', pill: '999px' },
};

/**
 * Converte o tema em variáveis CSS. O template inteiro se pinta a partir daqui,
 * então trocar a cor no editor repinta tudo sem tocar em uma linha de CSS.
 */
export function themeToCssVars(theme: SiteTheme): React.CSSProperties {
  const background = safeHex(theme.background, '#faf7f2');
  const foreground = safeHex(theme.foreground, '#2b2724');
  const primary = safeHex(theme.primary, '#6e2233');
  const secondary = safeHex(theme.secondary, '#c9a88a');

  // Superfície: um degrau acima do fundo, no sentido que der mais separação.
  const bgIsDark = luminance(background) < 0.35;
  const surface = bgIsDark ? lighten(background, 0.08) : '#ffffff';
  const surfaceAlt = bgIsDark ? lighten(background, 0.14) : mix(background, foreground, 0.05);

  // A cor do texto por cima do acento nunca é chutada.
  const onPrimary = readableOn(primary, background, foreground);
  const onSecondary = readableOn(secondary, background, foreground);

  // "primary sobre o fundo" — se a escolha da profissional some no fundo dela
  // (ex.: bege sobre creme), escurecemos só para TEXTO, sem mudar os botões.
  let primaryText = primary;
  let guard = 0;
  while (contrast(primaryText, background) < 4.5 && guard < 12) {
    primaryText = bgIsDark ? lighten(primaryText, 0.1) : darken(primaryText, 0.1);
    guard++;
  }

  const radius = RADIUS_SCALE[theme.radius] || RADIUS_SCALE.soft;

  return {
    '--lume-bg': background,
    // Variantes com transparência já calculadas aqui, em rgba(). Poderiam ser
    // color-mix() no CSS, mas essa função só existe em Safari 16.2+/Chrome 111+
    // — e a página pública abre no celular que a cliente tiver. Resolvendo em
    // JS, o resultado é o mesmo em qualquer navegador.
    '--lume-bg-blur': alpha(background, 0.92),
    '--lume-overlay': alpha(foreground, 0.45),
    '--lume-surface': surface,
    '--lume-surface-alt': surfaceAlt,
    '--lume-fg': foreground,
    '--lume-fg-soft': alpha(foreground, 0.72),
    '--lume-fg-faint': alpha(foreground, 0.5),
    '--lume-primary': primary,
    '--lume-primary-text': primaryText,
    '--lume-primary-hover': bgIsDark ? lighten(primary, 0.12) : darken(primary, 0.12),
    '--lume-primary-soft': alpha(primary, 0.1),
    '--lume-on-primary': onPrimary,
    '--lume-on-primary-soft': alpha(onPrimary, 0.85),
    '--lume-on-primary-faint': alpha(onPrimary, 0.65),
    '--lume-on-primary-line': alpha(onPrimary, 0.5),
    '--lume-on-primary-veil': alpha(onPrimary, 0.15),
    '--lume-secondary': secondary,
    '--lume-secondary-soft': alpha(secondary, 0.18),
    '--lume-on-secondary': onSecondary,
    '--lume-line': alpha(foreground, 0.12),
    '--lume-line-strong': alpha(foreground, 0.22),
    '--lume-shadow': alpha(primary, 0.28),
    '--lume-r-sm': radius.sm,
    '--lume-r-md': radius.md,
    '--lume-r-lg': radius.lg,
    '--lume-r-pill': radius.pill,
  } as React.CSSProperties;
}
