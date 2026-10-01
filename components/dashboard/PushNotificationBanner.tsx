'use client';

import { useState, useEffect, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { SPLASH_EXIT_MS, SPLASH_SCENE_MS } from '@/lib/ui/splashScene';

// Função auxiliar para converter a base64 VAPID public key para Uint8Array
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/** Pausa entre a abertura sumir e o convite chegar: o painel aparece
 *  primeiro, e a mensagem chega por cima dele. */
const ARRIVE_AFTER_SPLASH_MS = 700;
/** Duração da saída (push-invite-rise / push-invite-away em globals.css). */
const LEAVE_MS = 300;
/** Quanto tempo o "Notificações ativadas" fica na tela antes de sair. */
const DONE_MS = 2000;
/** Arrastar para cima além disto dispensa, como no iPhone. */
const SWIPE_DISMISS_PX = 36;

/**
 * Chama `cb` quando a abertura do app (components/ui/AppSplash) terminar —
 * sem isso o convite chegaria por trás da cortina e a profissional só o
 * veria já parado. O SplashRunner marca o fim com data-splash="off" no
 * <html>; se a marca não vier, o relógio da cena serve de teto.
 */
function afterSplash(cb: () => void): () => void {
  const html = document.documentElement;
  if (html.dataset.splash === 'off') {
    const t = window.setTimeout(cb, ARRIVE_AFTER_SPLASH_MS);
    return () => window.clearTimeout(t);
  }

  let arrive = 0;
  const go = () => {
    observer.disconnect();
    window.clearTimeout(ceiling);
    arrive = window.setTimeout(cb, ARRIVE_AFTER_SPLASH_MS);
  };
  const observer = new MutationObserver(() => {
    if (html.dataset.splash === 'off') go();
  });
  observer.observe(html, { attributes: true, attributeFilter: ['data-splash'] });
  const ceiling = window.setTimeout(go, SPLASH_SCENE_MS + SPLASH_EXIT_MS + 600);

  return () => {
    observer.disconnect();
    window.clearTimeout(ceiling);
    window.clearTimeout(arrive);
  };
}

type Phase = 'hidden' | 'shown' | 'leaving';

export function PushNotificationBanner() {
  const [phase, setPhase] = useState<Phase>('hidden');
  const [activated, setActivated] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const timers = useRef<number[]>([]);
  const drag = useRef<{ id: number; y0: number; dy: number } | null>(null);

  useEffect(() => {
    // Verificar se push manager está disponível
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    let cancelled = false;
    let stopWaiting: (() => void) | undefined;
    const show = () => {
      if (!cancelled) stopWaiting = afterSplash(() => setPhase('shown'));
    };
    const cleanup = () => {
      cancelled = true;
      stopWaiting?.();
    };

    // Verificar se já temos permissão concedida
    if (Notification.permission === 'granted') {
      // Permissão concedida, mas sem subscription no SW: refazer
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (!sub) show();
        });
      return cleanup;
    }

    // Se permissão for negada, não mostrar
    if (Notification.permission === 'denied') {
      return;
    }

    // Se a pessoa dispensou o convite nesta sessão
    if (sessionStorage.getItem('pushBannerDismissed')) {
      return;
    }

    // Caso padrão: perguntar
    show();
    return cleanup;
  }, []);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  const leave = () => {
    setPhase((p) => (p === 'shown' ? 'leaving' : p));
    later(() => setPhase('hidden'), LEAVE_MS);
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      // 1. Pedir permissão ao usuário
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        leave();
        return;
      }

      // 2. Obter Service Worker
      const reg = await navigator.serviceWorker.ready;

      // 3. Obter chave pública
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key não configurada no ambiente.');
      }
      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      // 4. Inscrever-se no PushManager
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      // 5. Enviar para a nossa API
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });

      if (!res.ok) {
        throw new Error('Falha ao salvar inscrição no servidor.');
      }

      // Confirma antes de sair — sumir calado deixava a dúvida se tinha dado certo.
      setActivated(true);
      later(leave, DONE_MS);
    } catch (error) {
      console.error('Erro na inscrição push:', error);
      alert('Não foi possível ativar as notificações no momento.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pushBannerDismissed', 'true');
    leave();
  };

  /* Arrastar para cima dispensa (toque). Para baixo, resiste. Ao soltar
     antes do limite, volta com mola. Mouse usa o X e o "Agora não". */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' || phase !== 'shown' || activated) return;
    if ((e.target as HTMLElement).closest('button')) return;
    drag.current = { id: e.pointerId, y0: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = 'none';
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.dy = e.clientY - d.y0;
    e.currentTarget.style.transform = `translateY(${d.dy < 0 ? d.dy : d.dy * 0.25}px)`;
  };
  const onPointerEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.dy < -SWIPE_DISMISS_PX) {
      // A saída parte de onde o dedo largou (o transform inline).
      handleDismiss();
      return;
    }
    e.currentTarget.style.transition = 'transform 280ms var(--ease-spring)';
    e.currentTarget.style.transform = '';
  };

  if (phase === 'hidden') return null;

  /* Mensagem do app, NÃO faixa no fluxo: flutua no topo (celular) ou no
     canto superior direito (computador), acima do header (z-30) e da
     barra lateral (z-40), abaixo de modais e do menu (z-50). Não desloca
     um pixel do que está atrás. Visual em .push-invite (globals.css). */
  return (
    <div
      role="status"
      aria-live="polite"
      data-leaving={phase === 'leaving' ? '' : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      className="push-invite fixed z-45 no-print
        left-2 right-2 mx-auto max-w-[440px] top-[calc(env(safe-area-inset-top)+0.5rem)]
        lg:left-auto lg:right-6 lg:top-6 lg:mx-0 lg:w-[384px] lg:max-w-none"
    >
      <div className="flex items-center gap-2">
        <LumeLogo variant="light" className="h-[25px] lg:h-[23px] -my-0.5 -ml-0.5" />
        <span className="ml-auto text-caption text-white/60">agora</span>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="tap hidden lg:inline-grid ml-1.5 h-[26px] w-[26px] place-items-center rounded-full bg-white/10 text-white/85 hover:bg-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.4} />
        </button>
      </div>

      {activated ? (
        <div className="push-invite__pop mt-2.5 flex items-center gap-3">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-white text-wine-700" aria-hidden>
            <Check className="h-[18px] w-[18px]" strokeWidth={2.8} />
          </span>
          <div className="min-w-0">
            <p className="text-body font-semibold leading-snug">Notificações ativadas</p>
            <p className="text-body-sm leading-[1.42] text-white/85">
              Você será avisada a cada novo agendamento.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-2 space-y-0.5">
            <p className="text-body font-semibold leading-snug">Ative as notificações</p>
            <p className="text-body-sm leading-[1.42] text-white/85">
              Seja avisada na hora, no seu aparelho, quando uma cliente agendar.
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isSubscribing}
              className="tap flex-1 inline-flex h-9 items-center justify-center gap-2 rounded-full bg-white px-4 text-body-sm font-semibold text-wine-800 hover:bg-wine-50 disabled:cursor-progress focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {isSubscribing && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {isSubscribing ? 'Ativando…' : 'Ativar agora'}
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="tap inline-flex h-9 items-center rounded-full bg-white/10 px-4 text-body-sm font-semibold text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Agora não
            </button>
          </div>
          {/* Alça: diz "dá para arrastar", como nas mensagens do iPhone. */}
          <span aria-hidden className="mx-auto mt-3 -mb-1 block h-1 w-[38px] rounded-full bg-white/30 lg:hidden" />
        </>
      )}
    </div>
  );
}
