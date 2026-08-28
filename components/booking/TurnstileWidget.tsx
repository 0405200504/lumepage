'use client';

import React, { useEffect, useRef } from 'react';

const DEFAULT_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADpTBlyHh2xfwgge';

export const turnstileConfigured = !!DEFAULT_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

let scriptLoading: Promise<void> | null = null;
function loadScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scriptLoading;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  className?: string;
}

/**
 * Widget do Cloudflare Turnstile.
 * Renderiza a verificação de segurança invisível / gerenciada da Cloudflare.
 */
export default function TurnstileWidget({
  onVerify,
  siteKey = DEFAULT_SITE_KEY,
  theme = 'auto',
  className = '',
}: TurnstileWidgetProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;

    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: siteKey,
          theme: theme,
          callback: (token: string) => onVerify(token),
        });
      } catch (err) {
        console.warn('[TurnstileWidget]', err);
      }
    });

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
      }
    };
  }, [onVerify, siteKey, theme]);

  if (!siteKey) return null;
  return <div ref={ref} className={`flex justify-center my-2.5 min-h-[45px] ${className}`} />;
}
