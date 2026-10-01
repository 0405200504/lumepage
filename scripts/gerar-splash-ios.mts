// Gera as telas de abertura do iPhone em public/splash/ — o primeiro quadro
// da cortina de abertura (#lume-splash em app/globals.css), sem a marca: o
// cetim do login (LUME_SATIN_MOBILE) em "cover" com a folga de 6% da
// cortina, e a vinheta dela por cima. Contexto em lib/ui/appleStartupImages.ts.
//
// Como rodar:
//   node scripts/gerar-splash-ios.mts
//
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { IPHONE_SCREENS, startupImagePath } from '../lib/ui/appleStartupImages.ts';
import { LUME_SATIN_MOBILE } from '../lib/ui/lumeSplashData.ts';

// = .lume-splash__satin { inset: -6% }: o tecido cobre uma caixa 12% maior
//   que a tela, centrada. Mudou lá, mude aqui e rode de novo.
const OVERSCAN = 1.12;

// = .lume-splash__vignette:
//   radial-gradient(90% 72% at 50% 46%, transparent 38%, rgba(14,2,8,.58) 100%)
const VIGNETTE = { cx: 0.5, cy: 0.46, rx: 0.9, ry: 0.72, from: 0.38, alpha: 0.58, color: '#0e0208' };

const satin = Buffer.from(LUME_SATIN_MOBILE.split(',')[1], 'base64');

mkdirSync(new URL('../public/splash/', import.meta.url), { recursive: true });

for (const screen of IPHONE_SCREENS) {
  const width = screen.w * screen.dpr;
  const height = screen.h * screen.dpr;
  const boxW = Math.round(width * OVERSCAN);
  const boxH = Math.round(height * OVERSCAN);

  // Elipse de 90% × 72% centrada em (50%, 46%): o círculo unitário do SVG
  // esticado por gradientTransform, em unidades da caixa.
  const vignette = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <defs>
        <radialGradient id="v" cx="${VIGNETTE.cx}" cy="${VIGNETTE.cy}" r="0.5" fx="${VIGNETTE.cx}" fy="${VIGNETTE.cy}"
          gradientTransform="translate(${VIGNETTE.cx} ${VIGNETTE.cy}) scale(${VIGNETTE.rx * 2} ${VIGNETTE.ry * 2}) translate(${-VIGNETTE.cx} ${-VIGNETTE.cy})">
          <stop offset="${VIGNETTE.from}" stop-color="${VIGNETTE.color}" stop-opacity="0"/>
          <stop offset="1" stop-color="${VIGNETTE.color}" stop-opacity="${VIGNETTE.alpha}"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>`,
  );

  const out = fileURLToPath(new URL(`../public${startupImagePath(screen)}`, import.meta.url));
  await sharp(satin)
    .resize(boxW, boxH, { fit: 'cover', position: 'centre' })
    .extract({ left: Math.round((boxW - width) / 2), top: Math.round((boxH - height) / 2), width, height })
    .composite([{ input: vignette, blend: 'over' }])
    // PNG com paleta: o cetim é quase monocromático, 192 cores bastam e o
    // arquivo cai de ~1 MB para ~400 kB.
    .png({ compressionLevel: 9, palette: true, colors: 192, dither: 0.6 })
    .toFile(out);
  console.log(startupImagePath(screen));
}
