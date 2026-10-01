// Gera as telas de abertura do iPhone em public/splash/ — o primeiro quadro
// da cortina de abertura (#lume-splash em app/globals.css), sem a marca.
// Contexto em lib/ui/appleStartupImages.ts.
//
// Como rodar:
//   node scripts/gerar-splash-ios.mts
//
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { IPHONE_SCREENS, startupImagePath } from '../lib/ui/appleStartupImages.ts';

// = background de #lume-splash:
//   radial-gradient(120% 90% at 50% 42%, #4a1424 0%, #3b0c1b 55%, #2e0813 100%)
// Mudou lá, mude aqui e rode de novo.
const SIZE_X = 1.2;
const SIZE_Y = 0.9;
const AT_X = 0.5;
const AT_Y = 0.42;
const STOPS: Array<[number, [number, number, number]]> = [
  [0, [0x4a, 0x14, 0x24]],
  [0.55, [0x3b, 0x0c, 0x1b]],
  [1, [0x2e, 0x08, 0x13]],
];

/** Cor no raio `t` do degradê (interpolação em sRGB, como o CSS faz com hex). */
function colorAt(t: number): [number, number, number] {
  if (t >= 1) return STOPS[STOPS.length - 1][1];
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    if (t <= p1) {
      const [p0, c0] = STOPS[i - 1];
      const f = (t - p0) / (p1 - p0);
      return [0, 1, 2].map((k) => c0[k] + (c1[k] - c0[k]) * f) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

mkdirSync(new URL('../public/splash/', import.meta.url), { recursive: true });

for (const screen of IPHONE_SCREENS) {
  const width = screen.w * screen.dpr;
  const height = screen.h * screen.dpr;
  const rx = SIZE_X * width;
  const ry = SIZE_Y * height;
  const cx = AT_X * width;
  const cy = AT_Y * height;

  const px = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    const dy = (y + 0.5 - cy) / ry;
    for (let x = 0; x < width; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const [r, g, b] = colorAt(Math.sqrt(dx * dx + dy * dy));
      const i = (y * width + x) * 3;
      px[i] = Math.round(r);
      px[i + 1] = Math.round(g);
      px[i + 2] = Math.round(b);
    }
  }

  const out = fileURLToPath(new URL(`../public${startupImagePath(screen)}`, import.meta.url));
  await sharp(px, { raw: { width, height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toFile(out);
  console.log(startupImagePath(screen));
}
