'use client';

import { useEffect } from 'react';

/**
 * Registra o Service Worker para habilitar a instalação como app (PWA)
 * e o funcionamento offline básico. Sem UI.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        /* registro falhou silenciosamente — app continua funcionando */
      });
    };
    // A hidratação pode chegar depois do `load` — aí o evento já passou e o
    // service worker nunca seria registrado (nem a abertura instantânea).
    if (document.readyState === 'complete') {
      onLoad();
      return;
    }
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
