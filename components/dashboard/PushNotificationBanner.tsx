'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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

export function PushNotificationBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    // Verificar se push manager está disponível
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    // Verificar se já temos permissão concedida
    if (Notification.permission === 'granted') {
      // Opcional: verificar se já existe subscription no SW, caso contrário, refazer
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (!sub) {
            // Permissão concedida, mas não inscrito
            setShowBanner(true);
          }
        });
      });
      return;
    }

    // Se permissão for negada, não mostrar
    if (Notification.permission === 'denied') {
      return;
    }

    // Se a pessoa dispensou o banner nesta sessão
    if (sessionStorage.getItem('pushBannerDismissed')) {
      return;
    }

    // Caso padrão: perguntar
    setShowBanner(true);
  }, []);

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    try {
      // 1. Pedir permissão ao usuário
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setShowBanner(false);
        setIsSubscribing(false);
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

      setShowBanner(false);
    } catch (error) {
      console.error('Erro na inscrição push:', error);
      alert('Não foi possível ativar as notificações no momento.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('pushBannerDismissed', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  /* Toast dispensável, NÃO faixa no fluxo.
     Como faixa, ela empurrava o conteúdo principal para baixo toda vez que
     aparecia — a profissional abria o painel e o faturamento tinha mudado de
     lugar. Aqui ela flutua: acima da tab bar no celular, no canto inferior
     direito no desktop, e não desloca um pixel do que está atrás. */
  return (
    <div
      role="status"
      className="fixed z-45 no-print toast-in
        left-4 right-4 bottom-[calc(76px+env(safe-area-inset-bottom))]
        lg:left-auto lg:right-6 lg:bottom-6 lg:w-[380px]"
    >
      <div className="card p-4 flex items-start gap-3">
        <span className="icon-chip" data-accent="true" aria-hidden>
          <Bell className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-label font-semibold text-heading leading-snug">
            Ativar notificações de agendamentos?
          </h3>
          <p className="text-caption text-n-500 mt-0.5">
            Seja avisada na hora, no seu aparelho, quando uma cliente agendar.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={handleSubscribe} loading={isSubscribing}>
              {isSubscribing ? 'Ativando…' : 'Ativar agora'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleDismiss}>
              Agora não
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="Dispensar"
          className="tap shrink-0 h-8 w-8 -mt-1 -mr-1 inline-flex items-center justify-center rounded-chip text-n-500 hover:bg-n-100 hover:text-heading transition-ui focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
