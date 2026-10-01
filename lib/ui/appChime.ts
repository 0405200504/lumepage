/**
 * Assinatura sonora da Lume — duas notas de vidro na abertura do painel.
 *
 * É SINTETIZADO na hora (Web Audio), não é um arquivo: um mp3 no caminho
 * crítico do primeiro paint chegaria atrasado justamente na única vez em que
 * precisa tocar. Aqui o som sai de osciladores — custo zero de rede, toca no
 * mesmo quadro da animação.
 *
 * O timbre: uma nota e, 120 ms depois, a quinta acima — Mi e Si —, cada uma
 * com um sobretom curto que dá o "vidro", e um grave discreto por baixo para
 * não ficar fino no celular. Um pouco de sala (delay curto realimentado).
 * A cauda acaba em ~1 s, logo depois da cortina (900 ms).
 *
 * IMPORTANTE — política de autoplay: navegador só deixa tocar som depois de
 * um gesto da pessoa na página. Vindo do login (clique em "Acessar Painel" e
 * navegação de cliente) o gesto já aconteceu e o som sai. Numa abertura fria
 * do app instalado, sem toque antes, o AudioContext nasce suspenso e nada
 * soa. Isso é ESPERADO e silencioso: a animação continua, ninguém vê erro.
 */

/** Preferência da profissional. Ausente = ligado. */
const PREF_KEY = 'lume:som-abertura';

export function isChimeEnabled(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) !== '0';
  } catch {
    return true; // modo privativo / storage bloqueado
  }
}

export function setChimeEnabled(on: boolean): void {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    /* sem persistência: vale só para esta sessão */
  }
}

type Ctor = typeof AudioContext;

/* Mi5 → Si5 (quinta justa) e Mi3 de corpo. Mudou aqui, mude a prévia em
   scripts/ (o .wav de referência é gerado com estes mesmos números). */
const NOTA_1 = 659.25;
const NOTA_2 = 987.77;
const GRAVE = 164.81;

export function playAppChime(): void {
  if (typeof window === 'undefined') return;

  const Ctx: Ctor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext;
  if (!Ctx) return;

  let ctx: AudioContext;
  try {
    ctx = new Ctx();
  } catch {
    return;
  }
  // Se o navegador bloqueou, resume() falha e o som simplesmente não sai.
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});

  try {
    const t0 = ctx.currentTime + 0.03;

    const master = ctx.createGain();
    master.gain.value = 0.7;
    master.connect(ctx.destination);

    // Sala: delay curto realimentado e abafado.
    const delay = ctx.createDelay(0.5);
    delay.delayTime.value = 0.14;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 3000;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    const wet = ctx.createGain();
    wet.gain.value = 0.18;
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(wet);
    wet.connect(master);

    // Tudo entra por aqui: seco para o master, molhado para o delay.
    const bus = ctx.createGain();
    bus.connect(master);
    bus.connect(delay);

    /** Uma nota de vidro: senoide com ataque macio e cauda longa, mais o
     *  2º parcial (uma oitava acima), fraco e curto — é ele que faz "vidro"
     *  em vez de "apito". */
    const nota = (freq: number, at: number, peak: number, decay: number) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(peak, at + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
      osc.connect(g);
      g.connect(bus);
      osc.start(at);
      osc.stop(at + decay + 0.05);

      const parcial = ctx.createOscillator();
      parcial.type = 'sine';
      parcial.frequency.value = freq * 2.002;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.0001, at);
      pg.gain.exponentialRampToValueAtTime(peak * 0.22, at + 0.01);
      pg.gain.exponentialRampToValueAtTime(0.0001, at + decay * 0.35);
      parcial.connect(pg);
      pg.connect(bus);
      parcial.start(at);
      parcial.stop(at + decay);
    };

    nota(NOTA_1, t0, 0.2, 0.85);
    nota(NOTA_2, t0 + 0.12, 0.15, 0.95);
    nota(GRAVE, t0, 0.07, 0.8);
  } catch {
    /* qualquer nó indisponível: sem som, sem erro na tela */
  }

  // O contexto é descartável: um por abertura. Sem isso o Chrome acumula
  // contextos e passa a recusar novos ("max hardware contexts reached").
  window.setTimeout(() => {
    void ctx.close().catch(() => {});
  }, 2000);
}
