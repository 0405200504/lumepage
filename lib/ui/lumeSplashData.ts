/**
 * Dados da ABERTURA DO APP (lib/ui/splashScene) — embutidos para pintar no
 * primeiro quadro sem esperar rede nem cache do service worker.
 *
 * LUME_STAR_A / LUME_STAR_B: as duas metades da estrela — o símbolo é
 * formado por dois "L" encaixados — como caminhos SVG traçados da arte
 * oficial (viewBox 0 0 237 220). Vetor, não máscara: nítido em qualquer
 * tamanho, aceita o reflexo cromado e não há imagem a decodificar antes do
 * primeiro quadro.
 *
 * O cetim do login e o "lume" traçado saíram daqui quando a abertura virou
 * só a estrela sobre bordô chapado (git: 10ecaec tem os dois).
 */
export const LUME_STAR_A =
  'M3.54,111.50 9.50,110.07 25.00,107.93 103.75,97.75 105.75,96.66 107.64,94.00 108.72,89.50 126.04,8.25 127.05,4.00 127.75,3.53 127.78,13.25 122.55,99.50 121.82,106.50 119.50,109.60 117.50,110.83 113.75,111.79 6.75,111.86Z';
export const LUME_STAR_B =
  'M232.80,112.00 231.50,112.75 141.00,125.06 137.25,127.05 135.04,130.75 127.75,171.34 121.00,203.96 119.74,212.50 118.25,217.28 117.79,215.50 117.91,210.75 121.49,120.00 122.03,116.75 124.10,114.00 127.75,112.00 130.75,111.79 229.75,111.54Z';
