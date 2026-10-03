'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Vídeo de fundo do login. Vai no HTML do servidor: começa a baixar e a tocar
 * junto com a página, sem esperar o React hidratar (no celular isso levava
 * segundos). O navegador escolhe o arquivo pela proporção da tela via
 * <source media> — em pé, o vertical; deitada, o horizontal. Os arquivos já
 * vêm com a emenda embutida (o fim se funde no começo), então o `loop` nativo
 * não mostra o reinício.
 *
 * Fixo na tela inteira, com o preto da borda do vídeo por trás: cobre a área
 * da barra de status e da barra do Safari, e o cartão rola por cima dele.
 *
 * Nenhum controle aparece: sem play/pause, PiP ou transmissão, e o botão de
 * play que o iPhone desenha ao bloquear o autoplay some no CSS (.bg-video).
 *
 * Modo de pouca energia do iPhone: o Safari recusa qualquer vídeo sem toque.
 * Aí entra o mesmo loop em WebP animado (imagem animada não é barrada), que
 * só é baixado nesse caso. O play() é só a sonda: chamado quando o vídeo já
 * deveria estar tocando e não está, a recusa (NotAllowedError) confirma o
 * bloqueio — antes disso, um play() recusado desligaria o autoplay nativo.
 */
export function LoginVideoBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const landscape = window.matchMedia('(min-aspect-ratio: 1/1)');
    let blocked = false;
    const timers: number[] = [];

    // "Reduzir movimento": o vídeo some no CSS e aqui também para de tocar.
    if (reduce.matches) video.pause();
    const onReduce = () => {
      if (reduce.matches) video.pause();
      else video.play().catch(() => {});
    };
    // Tela girou (ou a janela passou de deitada para em pé): recarrega para o
    // navegador escolher o outro arquivo; o autoplay retoma sozinho. Só se o
    // arquivo mudar mesmo: load() à toa (teclado do Android encolhendo a
    // tela, por exemplo) fazia o vídeo recomeçar do zero.
    const onOrientation = () => {
      const want = landscape.matches ? 'login-desktop' : 'login-mobile';
      if (!video.currentSrc.includes(want)) video.load();
    };

    const probe = () => {
      if (blocked || !video.paused || reduce.matches) return;
      video.play().catch((err: DOMException) => {
        if (err.name !== 'NotAllowedError') return;
        blocked = true;
        setAutoplayBlocked(true);
      });
    };
    // Pronto para tocar e ainda parado: o autoplay nativo já foi recusado.
    const onReady = () => { timers.push(window.setTimeout(probe, 300)); };
    if (video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) onReady();
    else video.addEventListener('canplay', onReady, { once: true });
    // Na pouca energia o iPhone pode nem carregar o vídeo (sem 'canplay').
    // Rede lenta não engana a sonda: aí o play() fica pendente, não recusa.
    timers.push(window.setTimeout(probe, 2500));

    // Com o WebP no lugar, um toque não troca para o vídeo — o tecido daria
    // um salto. Sem bloqueio, o toque destrava o que faltar.
    const resume = () => {
      if (!blocked && video.paused && !reduce.matches) video.play().catch(() => {});
    };

    reduce.addEventListener('change', onReduce);
    landscape.addEventListener('change', onOrientation);
    const gestures = ['touchend', 'click', 'keydown'] as const;
    gestures.forEach((ev) => window.addEventListener(ev, resume, { passive: true }));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      video.removeEventListener('canplay', onReady);
      reduce.removeEventListener('change', onReduce);
      landscape.removeEventListener('change', onOrientation);
      gestures.forEach((ev) => window.removeEventListener(ev, resume));
    };
  }, []);

  return (
    // .login-backdrop também pinta o html/body (globals.css): é a cor que o
    // Safari usa nas barras de cima e de baixo e no elástico da rolagem.
    <div aria-hidden className="login-backdrop pointer-events-none fixed inset-0 overflow-hidden bg-black">
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
      {/* Autoplay recusado: o mesmo loop como imagem animada, a partir do primeiro quadro */}
      {autoplayBlocked && (
        <picture>
          <source media="(min-aspect-ratio: 1/1)" srcSet="/videos/login-desktop.webp" />
          <img
            src="/videos/login-mobile.webp"
            alt=""
            decoding="async"
            className="bg-video-fallback absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      )}
    </div>
  );
}

export default LoginVideoBackground;
