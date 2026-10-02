'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '0x4AAAAAADpTBlyHh2xfwgge';

export const turnstileConfigured = !!DEFAULT_SITE_KEY;

/**
 * Token do widget para mandar junto com o formulário.
 *
 * O token nasce logo depois da página carregar; quem clica em "Entrar" antes
 * disso não pode ser barrada por um token vazio. `waitForToken` espera até
 * ~2,5 s por ele e devolve o que tiver — o servidor decide (e só exige quando
 * TURNSTILE_SECRET_KEY está configurada).
 */
export function useTurnstileToken() {
  const ref = useRef('');
  const [token, setToken] = useState('');
  const onVerify = useCallback((t: string) => {
    ref.current = t;
    setToken(t);
  }, []);
  const waitForToken = useCallback(async (maxMs = 2500): Promise<string> => {
    const until = Date.now() + maxMs;
    while (!ref.current && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return ref.current;
  }, []);
  return { token, onVerify, waitForToken };
}

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

let scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    // Se o script já existe no documento
    const existing = document.querySelector('script[src*="turnstile/v0/api.js"]');
    if (existing) {
      if (window.turnstile) {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = (e) => reject(e);
    document.head.appendChild(script);
  });

  return scriptLoadingPromise;
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  siteKey?: string;
  theme?: 'light' | 'dark' | 'auto';
  action?: string;
  /** 'interaction-only' = invisível, só aparece se a Cloudflare pedir um desafio */
  appearance?: 'always' | 'execute' | 'interaction-only';
  /** 'flexible' = ocupa a largura do contêiner */
  size?: 'normal' | 'flexible' | 'compact';
  className?: string;
}

/**
 * Widget do Cloudflare Turnstile ultra estável.
 * Mantém o ciclo de vida fixo mesmo quando o componente pai renderiza ao digitar.
 */
export default function TurnstileWidget({
  onVerify,
  siteKey = DEFAULT_SITE_KEY,
  theme = 'auto',
  action,
  appearance = 'always',
  size = 'normal',
  className = '',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !siteKey || !containerRef.current) return;

    let isSubscribed = true;

    loadTurnstileScript()
      .then(() => {
        if (!isSubscribed || !containerRef.current || !window.turnstile) return;

        // Se já foi renderizado anteriormente neste elemento, remove antes
        if (widgetIdRef.current) {
          try {
            window.turnstile.remove(widgetIdRef.current);
            widgetIdRef.current = null;
          } catch {
            /* noop */
          }
        }

        // Limpa o container para garantir que não haja iframes duplicados
        containerRef.current.innerHTML = '';

        try {
          const id = window.turnstile.render(containerRef.current, {
            sitekey: siteKey,
            theme: theme,
            appearance,
            size,
            ...(action ? { action } : {}),
            callback: (token: string) => {
              if (isSubscribed && onVerifyRef.current) {
                onVerifyRef.current(token);
              }
            },
            'error-callback': (err: unknown) => {
              console.warn('[Cloudflare Turnstile] Erro de verificação:', err);
            },
            'expired-callback': () => {
              if (isSubscribed && onVerifyRef.current) {
                onVerifyRef.current('');
              }
            },
            'refresh-expired': 'auto',
            retry: 'auto',
          });

          widgetIdRef.current = id;
        } catch (renderError) {
          console.warn('[Cloudflare Turnstile] Falha ao renderizar widget:', renderError);
        }
      })
      .catch((scriptErr) => {
        console.warn('[Cloudflare Turnstile] Falha ao carregar script:', scriptErr);
      });

    return () => {
      isSubscribed = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
          widgetIdRef.current = null;
        } catch {
          /* noop */
        }
      }
    };
  }, [mounted, siteKey, theme, action, appearance, size]);

  if (!siteKey) return null;

  // Invisível não reserva espaço: o widget só ganha altura se houver desafio.
  const reserve = appearance === 'interaction-only' ? '' : 'my-3 min-h-[65px]';

  return (
    <div className={`flex justify-center ${reserve} ${className}`}>
      <div ref={containerRef} className={size === 'flexible' ? 'w-full' : undefined} />
    </div>
  );
}
