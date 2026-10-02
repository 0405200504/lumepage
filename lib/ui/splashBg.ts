/**
 * O bordô da abertura — num módulo sem dependências porque o script que gera
 * as telas de abertura do iPhone (scripts/gerar-splash-ios.mts) roda no Node
 * puro, que não resolve os imports sem extensão de lib/ui/splashScene.ts.
 *
 * É a cor da cortina (lib/ui/splashScene), do background_color/theme_color
 * do manifesto (app/manifest.ts), das telas de abertura do iPhone
 * (public/splash) e da cortina do login (components/auth/LoginCurtain).
 * Mudou aqui: rodar `node scripts/gerar-splash-ios.mts` e subir a versão do
 * CACHE em public/sw.js.
 */
export const SPLASH_BG = '#4a0e22';
