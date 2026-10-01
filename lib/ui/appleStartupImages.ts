/**
 * TELAS DE ABERTURA DO IPHONE (apple-touch-startup-image)
 *
 * Sem elas, o app instalado no iPhone mostra uma tela BRANCA do toque no
 * ícone até a página pintar — e só então vem a cortina vinho da abertura
 * (components/ui/AppSplash). Era a "piscada" antes da animação.
 *
 * Cada PNG é o primeiro quadro da cortina: o cetim do login com a vinheta de
 * #lume-splash (app/globals.css), sem a marca. O iPhone mostra o PNG, a
 * página pinta o mesmo quadro por cima e a estrela acende — sem emenda visível.
 *
 * O iOS só usa a imagem se o tamanho bater EXATO com a tela, por isso uma
 * por aparelho. Gerar de novo (mudou o fundo da cortina, saiu iPhone novo):
 *   node scripts/gerar-splash-ios.mts
 */

/** Telas em pontos CSS, retrato (o manifesto trava em retrato). */
export const IPHONE_SCREENS = [
  { w: 320, h: 568, dpr: 2 }, // SE (1ª geração)
  { w: 375, h: 667, dpr: 2 }, // SE (2ª/3ª), 8
  { w: 414, h: 736, dpr: 3 }, // 8 Plus
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12 mini, 13 mini
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14, 16e
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  { w: 402, h: 874, dpr: 3 }, // 16 Pro, 17, 17 Pro
  { w: 420, h: 912, dpr: 3 }, // Air
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max, 17 Pro Max
] as const;

export type IphoneScreen = (typeof IPHONE_SCREENS)[number];

export const startupImagePath = (s: IphoneScreen) =>
  `/splash/iphone-${s.w * s.dpr}x${s.h * s.dpr}.png`;

/** Formato de `metadata.appleWebApp.startupImage`. */
export const APPLE_STARTUP_IMAGES = IPHONE_SCREENS.map((s) => ({
  url: startupImagePath(s),
  media: `(device-width: ${s.w}px) and (device-height: ${s.h}px) and (-webkit-device-pixel-ratio: ${s.dpr}) and (orientation: portrait)`,
}));
