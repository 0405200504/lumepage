'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, MicOff, X, Minimize2, Maximize2, Keyboard, PhoneOff } from 'lucide-react';
import { VoiceOrb, type OrbState } from './VoiceOrb';
import { screenHref } from '@/lib/assistant/screens';

/**
 * Conversa por VOZ com a assistente — o "Jarvis" do Lume.
 *
 * O áudio vai direto do navegador para a OpenAI Realtime por WebRTC: a
 * profissional fala, a assistente responde falando, sem apertar nada. A
 * CONEXÃO passa pelo servidor (/api/voice/connect), que confere o teto de
 * gasto do mês, dá um prazo à conversa e guarda o ID da chamada para poder
 * encerrá-la. Cada resposta tem o consumo informado (/api/voice/usage); as
 * ferramentas rodam em /api/voice/tool como a profissional logada.
 *
 * Duas formas:
 *   · tela cheia — a esfera, a frase da vez e os controles;
 *   · pílula     — quando a assistente abre uma tela (ou ela minimiza), a
 *                  conversa continua numa pílula no rodapé enquanto ela vê
 *                  a agenda, a lista de clientes etc.
 */

type Phase = 'connecting' | 'ready' | 'listening' | 'thinking' | 'speaking' | 'error';

interface RealtimeItem {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
}
interface RealtimeEvent {
  type: string;
  delta?: string;
  transcript?: string;
  error?: { message?: string };
  response?: { status?: string; output?: RealtimeItem[]; usage?: unknown };
}

/** Tudo o que UMA abertura da conversa criou — e que só ela encerra. */
interface VoiceRun {
  cancelled: boolean;
  pc: RTCPeerConnection | null;
  dc: RTCDataChannel | null;
  mic: MediaStream | null;
  ac: AudioContext | null;
  audio: HTMLAudioElement | null;
  wake: { release: () => Promise<void> } | null;
  /** ID da chamada na OpenAI (vem do servidor). */
  callId: string | null;
  timers: number[];
}

function teardown(run: VoiceRun) {
  if (!run.cancelled && run.callId) {
    // Avisa o servidor para encerrar e fechar a conta da chamada. Beacon:
    // chega mesmo com a aba fechando.
    const body = JSON.stringify({ callId: run.callId });
    if (!navigator.sendBeacon?.('/api/voice/end', body)) {
      void fetch('/api/voice/end', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }
  run.cancelled = true;
  run.timers.forEach((t) => window.clearTimeout(t));
  run.timers = [];
  try { run.dc?.close(); } catch { /* já fechado */ }
  try { run.pc?.getSenders().forEach((snd) => snd.track?.stop()); run.pc?.close(); } catch { /* já fechado */ }
  run.mic?.getTracks().forEach((t) => t.stop());
  if (run.audio) run.audio.srcObject = null;
  void run.ac?.close().catch(() => {});
  void run.wake?.release().catch(() => {});
  run.dc = null; run.pc = null; run.mic = null; run.ac = null; run.wake = null;
}

const STATUS_LABEL: Record<Phase, string> = {
  connecting: 'Conectando…',
  ready: 'Pode falar',
  listening: 'Ouvindo…',
  thinking: 'Pensando…',
  speaking: '',
  error: '',
};

/** RMS (0–1, com ganho) do que um analisador está ouvindo agora. */
function levelOf(an: AnalyserNode | null, buf: Float32Array<ArrayBuffer> | null) {
  if (!an || !buf) return 0;
  an.getFloatTimeDomainData(buf);
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.min(1, Math.sqrt(sum / buf.length) * 4.5);
}

export const VoiceMode: React.FC<{
  onClose: () => void;
  /** Troca para o chat de texto. */
  onSwitchToText: () => void;
}> = ({ onClose, onSwitchToText }) => {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('connecting');
  const [mini, setMini] = useState(false);
  const [muted, setMuted] = useState(false);
  const [caption, setCaption] = useState<{ who: 'user' | 'assistant'; text: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [vw, setVw] = useState(390);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  // A conversa ativa. Cada abertura é dona dos próprios recursos e responde
  // pelo próprio canal: no modo de desenvolvimento o React monta o efeito
  // duas vezes, e com recursos compartilhados as duas aberturas viravam
  // duas conversas ao mesmo tempo, uma respondendo pelo canal da outra.
  const runRef = useRef<VoiceRun | null>(null);
  const micAn = useRef<AnalyserNode | null>(null);
  const outAn = useRef<AnalyserNode | null>(null);
  const micBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const outBuf = useRef<Float32Array<ArrayBuffer> | null>(null);
  const phaseRef = useRef<Phase>('connecting');
  const assistantText = useRef('');
  // Último som (dela ou da assistente); o vigia de silêncio compara com ele.
  const lastActivity = useRef(0);

  const setPh = (p: Phase) => { phaseRef.current = p; setPhase(p); };

  /** Manda um evento pelo canal da conversa ativa. */
  const send = useCallback((ev: Record<string, unknown>) => {
    const dc = runRef.current?.dc;
    if (dc && dc.readyState === 'open') dc.send(JSON.stringify(ev));
  }, []);

  // Encerra a conversa ativa: chamada, microfone, áudio, tela acesa.
  const hangUp = useCallback(() => {
    if (runRef.current) teardown(runRef.current);
    runRef.current = null;
  }, []);

  const end = useCallback(() => { hangUp(); onClose(); }, [hangUp, onClose]);

  // Ferramentas pedidas pela voz: navegar roda aqui; o resto, no servidor.
  const runTool = useCallback(async (name: string, rawArgs: string) => {
    let args: Record<string, unknown> = {};
    try { args = rawArgs ? JSON.parse(rawArgs) : {}; } catch { /* argumentos vazios */ }

    if (name === 'openScreen') {
      const href = screenHref(String(args.screen ?? ''), typeof args.date === 'string' ? args.date : undefined);
      if (!href) return { success: false, error: 'Tela desconhecida.' };
      router.push(href);
      setMini(true); // a conversa segue na pílula, com a tela à vista
      return { success: true, opened: args.screen };
    }

    try {
      const res = await fetch('/api/voice/tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, args }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.changedData) router.refresh(); // a tela aberta mostra o que mudou
      return data?.result ?? { success: false, error: data?.error || 'Falha ao executar.' };
    } catch {
      return { success: false, error: 'Sem conexão para executar a ação.' };
    }
  }, [router]);

  /** O servidor mandou parar (teto do mês ou prazo): mostra o motivo e desliga. */
  const stopWith = useCallback((message: string) => {
    hangUp();
    setErrorMsg(message);
    setPh('error');
    setMini(false);
  }, [hangUp]);

  const onEvent = useCallback(async (ev: RealtimeEvent, run: VoiceRun, reply: (ev: Record<string, unknown>) => void) => {
    if (ev.type === 'input_audio_buffer.speech_started' || ev.type === 'output_audio_buffer.started') {
      lastActivity.current = Date.now();
    }
    // Consumo de cada resposta → servidor (soma no teto do mês).
    if (ev.type === 'response.done' && run.callId && ev.response?.usage) {
      void fetch('/api/voice/usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: run.callId, usage: ev.response.usage }),
      })
        .then((r) => r.json())
        .then((d) => { if (d?.stop && !run.cancelled) stopWith(d.message || 'A conversa foi encerrada.'); })
        .catch(() => {});
    }
    switch (ev.type) {
      case 'input_audio_buffer.speech_started':
        setPh('listening');
        break;
      case 'input_audio_buffer.speech_stopped':
        setPh('thinking');
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (ev.transcript?.trim()) setCaption({ who: 'user', text: ev.transcript.trim() });
        break;
      case 'response.created':
        assistantText.current = '';
        break;
      case 'response.output_audio_transcript.delta':
        assistantText.current += ev.delta ?? '';
        setCaption({ who: 'assistant', text: assistantText.current });
        break;
      case 'output_audio_buffer.started':
        setPh('speaking');
        break;
      case 'output_audio_buffer.stopped':
      case 'output_audio_buffer.cleared':
        if (phaseRef.current === 'speaking') setPh('ready');
        break;
      case 'response.done': {
        const calls = (ev.response?.output ?? []).filter((o) => o.type === 'function_call' && o.call_id && o.name);
        if (calls.length === 0) {
          if (phaseRef.current === 'thinking') setPh('ready');
          break;
        }
        setPh('thinking');
        for (const c of calls) {
          const output = await runTool(c.name!, c.arguments ?? '');
          reply({ type: 'conversation.item.create', item: { type: 'function_call_output', call_id: c.call_id, output: JSON.stringify(output) } });
        }
        reply({ type: 'response.create' });
        break;
      }
      case 'error':
        console.warn('[voz] erro da sessão:', ev.error?.message);
        break;
    }
  }, [runTool, stopWith]);

  // Abre a conversa assim que o componente monta (o toque que o abriu é o
  // gesto que libera microfone e áudio).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVw(window.innerWidth);

    const run: VoiceRun = { cancelled: false, pc: null, dc: null, mic: null, ac: null, audio: null, wake: null, callId: null, timers: [] };
    runRef.current = run;
    const reply = (ev: Record<string, unknown>) => {
      if (!run.cancelled && run.dc?.readyState === 'open') run.dc.send(JSON.stringify(ev));
    };

    // Áudio criado já no gesto: o iPhone só deixa tocar som assim.
    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', '');
    run.audio = audio;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    const ac = AC ? new AC() : null;
    run.ac = ac;
    void ac?.resume().catch(() => {});

    const start = async () => {
      try {
        const mic = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        run.mic = mic;
        if (run.cancelled) return teardown(run);
        if (ac) {
          const an = ac.createAnalyser(); an.fftSize = 512;
          ac.createMediaStreamSource(mic).connect(an);
          micAn.current = an; micBuf.current = new Float32Array(an.fftSize);
        }

        const pc = new RTCPeerConnection();
        run.pc = pc;
        pc.ontrack = (e) => {
          const stream = e.streams[0];
          audio.srcObject = stream;
          void audio.play().catch(() => {});
          if (ac) {
            const an = ac.createAnalyser(); an.fftSize = 512;
            ac.createMediaStreamSource(stream).connect(an);
            outAn.current = an; outBuf.current = new Float32Array(an.fftSize);
          }
        };
        pc.onconnectionstatechange = () => {
          if (!run.cancelled && (pc.connectionState === 'failed' || pc.connectionState === 'disconnected')) {
            setErrorMsg('A conexão caiu. Toque em encerrar e abra de novo.');
            setPh('error');
          }
        };
        mic.getTracks().forEach((t) => pc.addTrack(t, mic));

        const dc = pc.createDataChannel('oai-events');
        run.dc = dc;
        let firstName = '';
        dc.onmessage = (m) => {
          if (run.cancelled) return;
          try { void onEvent(JSON.parse(m.data), run, reply); } catch { /* evento ilegível */ }
        };
        dc.onopen = () => {
          if (run.cancelled) return;
          setPh('ready');
          lastActivity.current = Date.now();
          // Ela fala primeiro, como quem atende: cumprimento curto pelo nome.
          reply({
            type: 'response.create',
            response: { instructions: `Cumprimente ${firstName || 'a profissional'} pelo primeiro nome numa frase bem curta, diga que é a Ana e pergunte em que pode ajudar.` },
          });
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        // A oferta vai para o NOSSO servidor: ele confere o teto, fala com a
        // OpenAI e devolve a resposta com o ID e o prazo da chamada.
        const r = await fetch('/api/voice/connect', {
          method: 'POST',
          body: offer.sdp,
          headers: { 'Content-Type': 'application/sdp' },
        });
        const conn = await r.json().catch(() => ({}));
        if (!r.ok || !conn.sdp) throw new Error(conn.error || 'Não foi possível falar com a Ana agora.');
        run.callId = conn.callId;
        firstName = conn.firstName || '';
        if (typeof conn.minutesLeftMonth === 'number') setMinutesLeft(conn.minutesLeftMonth);
        if (run.cancelled) return teardown(run);
        await pc.setRemoteDescription({ type: 'answer', sdp: conn.sdp });

        // Prazo da conversa: 20 s antes ela avisa; no prazo, desliga.
        const msLeft = new Date(conn.deadlineAt).getTime() - Date.now();
        run.timers.push(window.setTimeout(() => {
          reply({ type: 'response.create', response: { instructions: 'Avise em uma frase curta que o tempo desta conversa está acabando e que dá para abrir outra depois.' } });
        }, Math.max(0, msLeft - 20_000)));
        run.timers.push(window.setTimeout(() => {
          if (!run.cancelled) stopWith('O tempo desta conversa acabou. É só abrir de novo para continuar.');
        }, Math.max(0, msLeft)));
        // Silêncio longo (ninguém fala há 90 s): desliga para não gastar à toa.
        const watch = () => {
          if (run.cancelled) return;
          if (Date.now() - lastActivity.current > 90_000) { stopWith('Desliguei porque ficamos um tempo em silêncio.'); return; }
          run.timers.push(window.setTimeout(watch, 5_000));
        };
        run.timers.push(window.setTimeout(watch, 5_000));

        // Tela acesa durante a conversa (mãos ocupadas no atendimento).
        try {
          const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
          run.wake = (await wl?.request('screen')) ?? null;
          if (run.cancelled) teardown(run);
        } catch { /* sem wake lock: tudo bem */ }
      } catch (e: unknown) {
        if (run.cancelled) return teardown(run);
        const name = e instanceof Error ? e.name : '';
        setErrorMsg(
          name === 'NotAllowedError' || name === 'PermissionDeniedError'
            ? 'O microfone está bloqueado. Libere o acesso ao microfone nas configurações do navegador e tente de novo.'
            : e instanceof Error && e.message ? e.message : 'Não foi possível abrir a conversa por voz.',
        );
        setPh('error');
      }
    };
    void start();
    return () => {
      teardown(run);
      if (runRef.current === run) runRef.current = null;
    };
    // Uma conversa por montagem: onEvent só usa callbacks estáveis.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Com a pílula no rodapé, os botões flutuantes da tela (o "+" da agenda,
  // a assistente da Início) sobem a altura dela em vez de ficar por baixo.
  useEffect(() => {
    const root = document.documentElement;
    if (mini) root.style.setProperty('--voice-pill-h', '4.5rem');
    else root.style.removeProperty('--voice-pill-h');
    return () => { root.style.removeProperty('--voice-pill-h'); };
  }, [mini]);

  const toggleMute = () => {
    const next = !muted;
    runRef.current?.mic?.getAudioTracks().forEach((t) => { t.enabled = !next; });
    setMuted(next);
  };

  // Tocar na esfera enquanto ela fala: interrompe e passa a vez.
  const interrupt = () => {
    if (phaseRef.current !== 'speaking') return;
    send({ type: 'response.cancel' });
    send({ type: 'output_audio_buffer.clear' });
    setPh('ready');
  };

  const getLevel = useCallback(() => {
    const p = phaseRef.current;
    if (p === 'speaking') return levelOf(outAn.current, outBuf.current);
    if (p === 'ready' || p === 'listening') return levelOf(micAn.current, micBuf.current) * 0.8;
    return 0.05;
  }, []);

  const orbState: OrbState = muted ? 'muted' : phase === 'error' ? 'connecting' : phase;
  const status = muted && phase !== 'error' ? 'Microfone desligado' : STATUS_LABEL[phase];

  /* ---------------- PÍLULA (minimizada) ---------------- */
  if (mini) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[calc(1rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full bg-[#1d0910]/95 text-white shadow-[var(--shadow-lg)] backdrop-blur-md w-[min(calc(100vw-2rem),28rem)]">
          <button type="button" onClick={() => setMini(false)} aria-label="Abrir a conversa em tela cheia" className="rounded-full overflow-hidden shrink-0">
            <VoiceOrb size={44} state={orbState} getLevel={getLevel} compact />
          </button>
          <p className="min-w-0 flex-1 text-body-sm truncate pr-1">
            {phase === 'error' ? errorMsg : caption?.text ? (caption.who === 'user' ? `“${caption.text}”` : caption.text) : status || 'Conversa por voz'}
          </p>
          <button type="button" onClick={toggleMute} aria-label={muted ? 'Ligar o microfone' : 'Desligar o microfone'} className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => setMini(false)} aria-label="Tela cheia" className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={end} aria-label="Encerrar a conversa" className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-danger text-white">
            <PhoneOff className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- TELA CHEIA ---------------- */
  const orbSize = Math.min(Math.round(vw * 0.86), 420);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Conversa por voz com a Ana"
      className="fixed inset-0 z-50 flex flex-col text-white select-none animate-fade-up"
      style={{ background: 'radial-gradient(120% 80% at 50% 38%, #3b0c1b 0%, #22060f 55%, #120207 100%)' }}
    >
      <div className="shrink-0 pt-safe">
        <div className="flex items-center justify-between h-14 px-2">
          <button type="button" onClick={() => setMini(true)} aria-label="Minimizar e continuar falando" className="h-11 w-11 inline-flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <Minimize2 className="h-5 w-5" />
          </button>
          <div className="text-center">
            <p className="text-label font-semibold text-white/80">Ana</p>
            {minutesLeft !== null && phase !== 'error' && (
              <p className="text-micro text-white/45 mt-0.5">cerca de {minutesLeft} min de voz neste mês</p>
            )}
          </div>
          <button type="button" onClick={end} aria-label="Fechar" className="h-11 w-11 inline-flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6">
        <button type="button" onClick={interrupt} aria-label={phase === 'speaking' ? 'Interromper a Ana' : 'Ana'} className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white/60">
          <VoiceOrb size={orbSize} state={orbState} getLevel={getLevel} />
        </button>

        <div className="mt-2 min-h-[6.5rem] max-w-md text-center" aria-live="polite">
          {phase === 'error' ? (
            <p className="text-body text-white/85">{errorMsg}</p>
          ) : (
            <>
              {status && <p className="text-caption font-semibold uppercase tracking-[0.12em] text-white/55 mb-2">{status}</p>}
              {caption?.text && (
                <p className={`text-body leading-relaxed line-clamp-4 ${caption.who === 'user' ? 'text-white/65 italic' : 'text-white'}`}>
                  {caption.who === 'user' ? `“${caption.text}”` : caption.text}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="shrink-0 pb-[calc(1.5rem+env(safe-area-inset-bottom))] flex items-center justify-center gap-4">
        <button type="button" onClick={onSwitchToText} aria-label="Escrever em vez de falar" className="h-14 w-14 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-ui">
          <Keyboard className="h-6 w-6" />
        </button>
        <button type="button" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? 'Ligar o microfone' : 'Desligar o microfone'} className={`h-16 w-16 inline-flex items-center justify-center rounded-full transition-ui ${muted ? 'bg-white text-wine-700' : 'bg-white/10 text-white hover:bg-white/20'}`}>
          {muted ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
        </button>
        <button type="button" onClick={end} aria-label="Encerrar a conversa" className="h-14 w-14 inline-flex items-center justify-center rounded-full bg-danger text-white hover:opacity-90 transition-ui">
          <PhoneOff className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default VoiceMode;
