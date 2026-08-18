'use client';

/**
 * ============================================================================
 * Preview responsivo de verdade
 * ============================================================================
 * O preview roda dentro de um <iframe> e o React desenha lá dentro via portal.
 *
 * Por que iframe: os templates são mobile-first e usam `@media (min-width: …)`.
 * Media query mede a JANELA, não o elemento. Se o preview fosse só uma <div>
 * estreita dentro do painel, o navegador continuaria aplicando o CSS de
 * desktop e o "preview mobile" mostraria um layout que a cliente nunca veria.
 * Dentro do iframe, 390px de largura são 390px de viewport — o mesmo que o
 * celular enxerga.
 *
 * O portal mantém tudo num único React: alterar um campo repinta o preview no
 * mesmo frame, sem recarregar nem sincronizar estado entre janelas.
 */

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type PreviewDevice = 'mobile' | 'desktop';

const WIDTH: Record<PreviewDevice, number> = {
  mobile: 390,   // iPhone 14/15 — a largura mais comum vinda do link na bio
  desktop: 1280,
};

export function PreviewFrame({ device, fontsHref, children }: {
  device: PreviewDevice;
  fontsHref: string;
  children: React.ReactNode;
}) {
  const holderRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [doc, setDoc] = useState<Document | null>(null);
  const [scale, setScale] = useState(1);

  const width = WIDTH[device];

  // O documento do iframe só existe depois da montagem.
  useEffect(() => {
    const d = frameRef.current?.contentDocument;
    if (!d) return;
    d.documentElement.lang = 'pt-BR';
    d.body.style.margin = '0';
    d.body.style.background = 'transparent';
    setDoc(d);
  }, []);

  // Fontes do template escolhido, dentro do iframe.
  useEffect(() => {
    if (!doc || !fontsHref) return;
    const id = 'lume-template-fonts';
    doc.getElementById(id)?.remove();
    const link = doc.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = fontsHref;
    doc.head.appendChild(link);
  }, [doc, fontsHref]);

  // Encaixa a largura escolhida no espaço disponível (só reduz, nunca amplia).
  useLayoutEffect(() => {
    const holder = holderRef.current;
    if (!holder) return;
    const fit = () => {
      const available = holder.clientWidth;
      setScale(available > 0 ? Math.min(1, available / width) : 1);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(holder);
    return () => ro.disconnect();
  }, [width]);

  // Altura do palco = altura real ocupada pelo iframe depois da escala.
  const frameHeight = 900;

  return (
    <div ref={holderRef} className="w-full overflow-hidden">
      <div
        style={{
          width: width * scale,
          height: frameHeight * scale,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width,
            height: frameHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className={`bg-white overflow-hidden ${device === 'mobile' ? 'rounded-[28px] border-4 border-[#1c1a1d] shadow-2xl' : 'rounded-xl border border-gray-250 shadow-lg'}`}
        >
          <iframe
            ref={frameRef}
            title="Pré-visualização da sua página"
            className="w-full h-full block border-0"
          />
          {doc && createPortal(children, doc.body)}
        </div>
      </div>
    </div>
  );
}

export default PreviewFrame;
