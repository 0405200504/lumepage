// Gera as telas de abertura do iPhone em public/splash/ — o primeiro quadro
// da cortina de abertura (#lume-splash em lib/ui/splashScene.ts), sem a
// estrela: só o bordô chapado (SPLASH_BG). Contexto em lib/ui/appleStartupImages.ts.
//
// Como rodar:
//   node scripts/gerar-splash-ios.mts
//
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { IPHONE_SCREENS, startupImagePath } from '../lib/ui/appleStartupImages.ts';
import { SPLASH_BG } from '../lib/ui/splashBg.ts';

mkdirSync(new URL('../public/splash/', import.meta.url), { recursive: true });

for (const screen of IPHONE_SCREENS) {
  const width = screen.w * screen.dpr;
  const height = screen.h * screen.dpr;
  const out = fileURLToPath(new URL(`../public${startupImagePath(screen)}`, import.meta.url));
  await sharp({ create: { width, height, channels: 3, background: SPLASH_BG } })
    // Cor chapada: com paleta o PNG fica com poucas centenas de bytes.
    .png({ compressionLevel: 9, palette: true, colors: 2 })
    .toFile(out);
  console.log(startupImagePath(screen));
}
