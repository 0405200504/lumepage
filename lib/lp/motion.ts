/**
 * Sistema de movimento da página de vendas.
 *
 * Traduz o vocabulário de movimento da Apple (WWDC "Designing Fluid
 * Interfaces") para a API do Motion/Framer. A Apple trocou o trio da física
 * (massa/rigidez/amortecimento) por dois parâmetros de designer:
 *
 *   damping  — quanto passa do alvo. 1.0 = assenta sem repique.
 *   response — em quanto tempo (s) o valor alcança o alvo. Não é "duração":
 *              a mola não tem duração fixa, o tempo de assentar emerge dos
 *              parâmetros.
 *
 * No Motion isso vira `bounce` + `duration`: bounce 0 ≡ damping 1.0.
 *
 * Regra de uso: mola criticamente amortecida (bounce 0) em TUDO por padrão.
 * Repique só onde o próprio gesto trouxe inércia — um arrasto solto, um
 * flick. Repique em menu que só apareceu parece defeito; repique em cartão
 * que você jogou parece física.
 */

import type { Transition } from "framer-motion";

export const spring = {
  /** Padrão de interface: entra e assenta, sem repique. (damping 1.0 / response 0.4) */
  ui: { type: "spring", bounce: 0, duration: 0.4 } as Transition,

  /** Resposta imediata — troca de estado, ícone girando. (damping 1.0 / response 0.28) */
  snappy: { type: "spring", bounce: 0, duration: 0.28 } as Transition,

  /** Gaveta / folha que sobe. (damping 0.8 / response 0.3) */
  sheet: { type: "spring", bounce: 0.2, duration: 0.3 } as Transition,

  /** Fim de gesto com inércia: o repique é herdado do arremesso. (damping 0.8 / response 0.4) */
  momentum: { type: "spring", bounce: 0.2, duration: 0.4 } as Transition,
} as const;

/** Fallback pra quem pediu menos movimento: fusão de opacidade, sem deslocamento. */
export const crossFade: Transition = { duration: 0.2, ease: "easeOut" };

/**
 * Onde o gesto vai parar se ninguém interferir — a mesma projeção que a
 * rolagem usa pra desacelerar. Não é a fórmula de livro (v²/2a): é o
 * decaimento exponencial que a Apple publicou no código de exemplo.
 *
 * @param velocity px/s no momento em que o dedo/ponteiro soltou
 * @param decelerationRate 0.998 = rolagem normal; 0.99 = mais curto
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistência progressiva na borda. Parar seco lê como "travou"; resistir
 * cada vez mais lê como "responde, mas acabou".
 *
 * @param overshoot quanto passou do limite
 * @param dimension tamanho da área (referência da resistência)
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Ponto de encaixe mais próximo do destino projetado (não do ponto onde soltou). */
export function nearestSnapPoint(value: number, points: number[]): number {
  return points.reduce((best, p) => (Math.abs(p - value) < Math.abs(best - value) ? p : best), points[0] ?? value);
}

/**
 * Histórico curto de posição/tempo pra estimar velocidade na soltura.
 * O último `pointermove` sozinho mente: um micro-movimento no fim zera uma
 * velocidade que era alta.
 */
export class VelocityTracker {
  private samples: { value: number; time: number }[] = [];

  add(value: number, time = performance.now()) {
    this.samples.push({ value, time });
    // ~100ms de janela bastam; o resto é história velha que suaviza demais.
    const cutoff = time - 100;
    while (this.samples.length > 2 && this.samples[0].time < cutoff) this.samples.shift();
  }

  /** px/s. Zero quando não há amostras suficientes ou o tempo não avançou. */
  get velocity(): number {
    if (this.samples.length < 2) return 0;
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    const dt = last.time - first.time;
    if (dt <= 0) return 0;
    return ((last.value - first.value) / dt) * 1000;
  }

  reset() {
    this.samples = [];
  }
}
