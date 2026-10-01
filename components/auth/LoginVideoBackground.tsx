'use client';

import { useEffect, useRef } from 'react';

/**
 * Vídeo de fundo do login. Vai no HTML do servidor: começa a baixar e a tocar
 * junto com a página, sem esperar o React hidratar (no celular isso levava
 * segundos). O navegador escolhe o arquivo pela proporção da tela via
 * <source media> — em pé, o vertical; deitada, o horizontal. Os arquivos já
 * vêm com a emenda embutida (o fim se funde no começo), então o `loop` nativo
 * não mostra o reinício.
 *
 * Nenhum controle aparece: sem play/pause, PiP ou transmissão, e o botão de
 * play que o iPhone desenha ao bloquear o autoplay some no CSS (.bg-video).
 *
 * Não chame play() na montagem: um play() recusado desliga o autoplay nativo.
 */
export function LoginVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const landscape = window.matchMedia('(min-aspect-ratio: 1/1)');

    // "Reduzir movimento": o vídeo some no CSS e aqui também para de tocar.
    if (reduce.matches) video.pause();
    const onReduce = () => {
      if (reduce.matches) video.pause();
      else video.play().catch(() => {});
    };
    // Tela girou (ou a janela passou de deitada para em pé): recarrega para o
    // navegador escolher o outro arquivo; o autoplay retoma sozinho.
    const onOrientation = () => video.load();
    // Autoplay bloqueado (modo de pouca energia do iPhone): começa no primeiro toque.
    const resume = () => {
      if (video.paused && !reduce.matches) video.play().catch(() => {});
    };

    reduce.addEventListener('change', onReduce);
    landscape.addEventListener('change', onOrientation);
    const gestures = ['touchend', 'click', 'keydown'] as const;
    gestures.forEach((ev) => window.addEventListener(ev, resume, { passive: true }));
    return () => {
      reduce.removeEventListener('change', onReduce);
      landscape.removeEventListener('change', onOrientation);
      gestures.forEach((ev) => window.removeEventListener(ev, resume));
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0d0a0b]">
      {/* Primeiro quadro, por baixo do vídeo: aparece enquanto ele carrega e com "reduzir movimento" */}
      <div className="absolute inset-0 bg-cover bg-center bg-[url(/videos/login-mobile.jpg)] [@media(min-aspect-ratio:1/1)]:bg-[url(/videos/login-desktop.jpg)]" />
      <video
        ref={videoRef}
        className="bg-video absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
      >
        <source media="not all and (min-aspect-ratio: 1/1)" src="/videos/login-mobile.mp4" type="video/mp4" />
        <source src="/videos/login-desktop.mp4" type="video/mp4" />
      </video>
      {/* O mesmo quadro POR CIMA, só enquanto o vídeo está pausado (CSS :paused, Safari):
          esconde o botão de play que o WebKit desenha quando bloqueia o autoplay. */}
      <div className="bg-video-cover absolute inset-0 bg-cover bg-center bg-[url(/videos/login-mobile.jpg)] [@media(min-aspect-ratio:1/1)]:bg-[url(/videos/login-desktop.jpg)]" />
      {/* Escurece levemente para o texto fora do vidro continuar legível */}
      <div className="absolute inset-0 bg-[radial-gradient(90%_70%_at_50%_45%,rgba(10,4,6,0.15)_0%,rgba(10,4,6,0.55)_100%)]" />
    </div>
  );
}

export default LoginVideoBackground;
