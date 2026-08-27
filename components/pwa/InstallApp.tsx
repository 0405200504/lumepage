'use client';

import React, { useEffect, useState } from 'react';
import { Download, Share, Plus, X, Check, Smartphone, MoreVertical } from 'lucide-react';

/**
 * Evento beforeinstallprompt (Chrome/Edge/Android). Não existe no lib.dom padrão.
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ se identifica como Mac com toque
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS;
}

function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

/**
 * Botão "Instalar app" para a tela de login.
 * - Android/Chrome/Edge: dispara o prompt nativo de instalação ou mostra guia.
 * - iOS/Safari: abre um guia visual (Compartilhar → Adicionar à Tela de Início).
 * - Já instalado (standalone): não renderiza nada.
 */
export default function InstallApp() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const [android, setAndroid] = useState(false);
  const [showIosSheet, setShowIosSheet] = useState(false);
  const [showAndroidSheet, setShowAndroidSheet] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIos(isIOS());
    setAndroid(isAndroid());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setShowIosSheet(false);
      setShowAndroidSheet(false);
    };

    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  // Evita flash de conteúdo no SSR e some se já instalado
  if (!mounted || installed) return null;

  // Em desktop sem o evento capturado e fora de mobile, não mostra.
  // Permite mostrar no Android e iOS sempre.
  if (!ios && !android && !deferred) return null;

  const handleClick = async () => {
    if (ios) {
      setShowIosSheet(true);
      return;
    }
    // Se tiver prompt nativo (Android Chrome/Edge)
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
      setDeferred(null);
      return;
    }
    // Fallback Android caso não haja prompt capturado
    if (android) {
      setShowAndroidSheet(true);
      return;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="tap flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-wine-700/15 text-wine-700 text-label font-bold rounded-2xl shadow-soft hover:bg-wine-50 transition-ui"
      >
        <Download className="h-4 w-4" />
        <span>Instalar app no celular</span>
      </button>

      {/* Guia de instalação no iOS */}
      {ios && showIosSheet && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm"
            onClick={() => setShowIosSheet(false)}
          />
          <div className="relative z-10 w-full sm:max-w-sm bg-surface rounded-t-4xl sm:rounded-4xl p-7 safe-sheet shadow-glow animate-slide-up">
            <button
              type="button"
              onClick={() => setShowIosSheet(false)}
              className="tap absolute top-5 right-5 p-1.5 rounded-xl text-n-600 hover:bg-n-50"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 surface-wine text-white rounded-3xl flex items-center justify-center shadow-soft ring-hairline">
                <Smartphone className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-h3 font-semibold text-ink tracking-tight">Instalar a Lume</h3>
              <p className="mt-1 text-caption text-n-600 leading-relaxed max-w-[18rem]">
                Adicione à tela de início para abrir como um app, em tela cheia.
              </p>
            </div>

            <ol className="mt-6 space-y-3">
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">1</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5 flex-wrap">
                  Toque em <Share className="h-4 w-4 text-wine-700 inline" /> <strong>Compartilhar</strong> na barra do Safari
                </span>
              </li>
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">2</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5 flex-wrap">
                  Escolha <span className="inline-flex items-center gap-1"><Plus className="h-4 w-4 text-wine-700" /></span> <strong>Adicionar à Tela de Início</strong>
                </span>
              </li>
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">3</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5">
                  Confirme em <Check className="h-4 w-4 text-ok inline" /> <strong>Adicionar</strong>
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosSheet(false)}
              className="tap mt-6 w-full py-3.5 surface-wine text-white text-label font-bold rounded-2xl shadow-soft transition-ui"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* Guia de instalação no Android */}
      {android && showAndroidSheet && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm"
            onClick={() => setShowAndroidSheet(false)}
          />
          <div className="relative z-10 w-full sm:max-w-sm bg-surface rounded-t-4xl sm:rounded-4xl p-7 safe-sheet shadow-glow animate-slide-up">
            <button
              type="button"
              onClick={() => setShowAndroidSheet(false)}
              className="tap absolute top-5 right-5 p-1.5 rounded-xl text-n-600 hover:bg-n-50"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 surface-wine text-white rounded-3xl flex items-center justify-center shadow-soft ring-hairline">
                <Smartphone className="h-7 w-7" />
              </div>
              <h3 className="mt-4 text-h3 font-semibold text-ink tracking-tight">Instalar a Lume</h3>
              <p className="mt-1 text-caption text-n-600 leading-relaxed max-w-[18rem]">
                Adicione à tela inicial para abrir como um app, em tela cheia.
              </p>
            </div>

            <ol className="mt-6 space-y-3">
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">1</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5 flex-wrap">
                  Toque em <MoreVertical className="h-4 w-4 text-wine-700 inline" /> <strong>Menu</strong> no canto superior
                </span>
              </li>
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">2</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5 flex-wrap">
                  Escolha <span className="inline-flex items-center gap-1"><Download className="h-4 w-4 text-wine-700" /></span> <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>
                </span>
              </li>
              <li className="flex items-center gap-3 bg-n-50 border border-n-200 rounded-2xl p-3.5">
                <span className="h-7 w-7 shrink-0 rounded-full surface-wine text-white text-caption font-semibold flex items-center justify-center">3</span>
                <span className="text-caption text-ink font-semibold flex items-center gap-1.5">
                  Confirme em <Check className="h-4 w-4 text-ok inline" /> <strong>Instalar / Adicionar</strong>
                </span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowAndroidSheet(false)}
              className="tap mt-6 w-full py-3.5 surface-wine text-white text-label font-bold rounded-2xl shadow-soft transition-ui"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
}
