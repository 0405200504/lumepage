/**
 * Assinatura sonora da Lume — o "tim" da abertura do app.
 *
 * É SINTETIZADO na hora (Web Audio), não é um arquivo: um mp3 de 40 kB no
 * caminho crítico do primeiro paint, servido pelo service worker, chegaria
 * atrasado justamente na única vez em que ele precisa tocar. Aqui o som sai
 * de osciladores — custo zero de rede, toca no mesmo quadro.
 *
 * O timbre: um sopro curto que sobe (a luz "acendendo") e, por cima, um
 * arpejo de sino em Ré maior com um pouco de espaço (delay realimentado).
 * Cabe em ~1,6 s, que é a duração da animação da marca.
 *
 * IMPORTANTE — política de autoplay: navegador só deixa tocar som sem gesto
 * do usuário em alguns contextos (PWA instalado, aba com histórico de
 * engajamento). Quando bloqueia, o AudioContext nasce suspenso e nada soa.
 * Isso é ESPERADO e silencioso: a animação continua, ninguém vê erro.
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
    const t0 = ctx.currentTime + 0.02;

    const master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);

    // Espaço: delay curto realimentado e abafado. Faz as vezes de uma sala
    // pequena sem precisar carregar impulso de reverb.
    const delay = ctx.createDelay(0.6);
    delay.delayTime.value = 0.17;
    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = 2600;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.26;
    const wet = ctx.createGain();
    wet.gain.value = 0.22;
    delay.connect(damp);
    damp.connect(feedback);
    feedback.connect(delay);
    damp.connect(wet);
    wet.connect(master);

    // Tudo entra por aqui: vai seco para o master e molhado para o delay.
    const bus = ctx.createGain();
    bus.gain.value = 1;
    bus.connect(master);
    bus.connect(delay);

    /* — 1. sopro que sobe (a luz acendendo) — */
    const dur = 0.9;
    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(300, t0);
    band.frequency.exponentialRampToValueAtTime(3800, t0 + 0.55);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.0001, t0);
    noiseGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.28);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(bus);
    noise.start(t0);
    noise.stop(t0 + dur + 0.05);

    /* — 2. sino: uma nota = duas senoides levemente desafinadas + 3ª harmônica — */
    const voice = (freq: number, at: number, peak: number, decay: number) => {
      for (const cents of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = cents;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(peak / 2, at + 0.012); // ataque de sino: quase instantâneo
        g.gain.exponentialRampToValueAtTime(0.0001, at + decay);
        osc.connect(g);
        g.connect(bus);
        osc.start(at);
        osc.stop(at + decay + 0.05);
      }
      // Brilho: a harmônica que faz soar "sino" e não "apito".
      const shine = ctx.createOscillator();
      shine.type = 'triangle';
      shine.frequency.value = freq * 3.01;
      const sg = ctx.createGain();
      sg.gain.setValueAtTime(0.0001, at);
      sg.gain.exponentialRampToValueAtTime(peak * 0.16, at + 0.01);
      sg.gain.exponentialRampToValueAtTime(0.0001, at + decay * 0.45);
      shine.connect(sg);
      sg.connect(bus);
      shine.start(at);
      shine.stop(at + decay);
    };

    // Ré maior subindo — D5, F#5, A5 e a oitava fechando.
    const arp = [587.33, 739.99, 880.0, 1174.66];
    arp.forEach((freq, i) => {
      voice(freq, t0 + 0.22 + i * 0.105, 0.17 - i * 0.025, i === arp.length - 1 ? 1.7 : 1.25);
    });
    // Corpo grave por baixo (D3), para o acorde não ficar fino no celular.
    voice(146.83, t0 + 0.2, 0.1, 1.9);
  } catch {
    /* qualquer nó indisponível: sem som, sem erro na tela */
  }

  // O contexto é descartável: um por abertura. Sem isso o Chrome acumula
  // contextos e passa a recusar novos ("max hardware contexts reached").
  window.setTimeout(() => {
    void ctx.close().catch(() => {});
  }, 3200);
}
