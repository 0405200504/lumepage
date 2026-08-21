import { Sora, Inter, Cormorant_Garamond } from 'next/font/google';

/**
 * Tipografia da LP (o painel usa Manrope).
 *
 * As variáveis ficam escopadas na casca `.lp-page` — nada disso vaza pro resto
 * do app. Mora aqui porque duas telas montam essa casca: a página de vendas
 * (app/page.tsx) e o paywall de trial vencido (PlanosOverlay).
 *
 * Só pode ser importado por Server Components (next/font não roda no cliente).
 */

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-lp-sora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-lp-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['italic', 'normal'],
  variable: '--font-lp-cormorant',
  display: 'swap',
});

/** Classes das três variáveis de fonte, pra aplicar na casca `.lp-page`. */
export const lpFontVars = `${sora.variable} ${inter.variable} ${cormorant.variable}`;
