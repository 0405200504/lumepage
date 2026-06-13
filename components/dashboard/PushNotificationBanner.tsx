'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';

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

  return (
    <div className="bg-wine-50 border border-gray-150 border-l-4 border-l-wine-700 p-4 rounded-2xl shadow-soft flex items-start sm:items-center justify-between gap-4 animate-fade-up">
      <div className="flex items-center gap-3">
        <div className="bg-white p-2 rounded-full shadow-soft text-wine-700 shrink-0">
          <Bell size={22} />
        </div>
        <div>
          <h3 className="text-ink font-semibold leading-tight">Ativar notificações de agendamentos?</h3>
          <p className="text-gray-450 text-sm mt-0.5">
            Seja avisada na hora, no seu dispositivo, quando uma cliente agendar.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2 sm:mt-0 shrink-0">
        <button
          onClick={handleSubscribe}
          disabled={isSubscribing}
          className="tap bg-wine-700 hover:bg-wine-800 text-white px-4 py-2 rounded-xl font-semibold text-sm transition-all-custom disabled:opacity-50"
        >
          {isSubscribing ? 'Ativando…' : 'Ativar agora'}
        </button>
        <button
          onClick={handleDismiss}
          className="tap p-2 text-gray-450 hover:text-wine-700 hover:bg-wine-100 rounded-full transition-all-custom"
          aria-label="Dispensar"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
