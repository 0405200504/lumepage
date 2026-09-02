'use client';

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { VisualElementPayload } from './VisualEditorContext';

export type PreviewDevice = 'mobile' | 'desktop';

const WIDTH: Record<PreviewDevice, number> = {
  mobile: 390, // iPhone 14/15 — a largura mais comum vinda do link na bio
  desktop: 1280,
};

const CANVA_CSS = `
/* Estilos visuais do Modo Canva no Preview */
[data-canva-active="true"] h1,
[data-canva-active="true"] h2,
[data-canva-active="true"] h3,
[data-canva-active="true"] p,
[data-canva-active="true"] .eyebrow,
[data-canva-active="true"] .btn,
[data-canva-active="true"] img,
[data-canva-active="true"] .hero-photo,
[data-canva-active="true"] .about-photo,
[data-canva-active="true"] [data-lume-placeholder] {
  position: relative;
  transition: outline .15s ease, background-color .15s ease, transform .15s ease;
  cursor: pointer !important;
}

[data-canva-active="true"] h1:hover,
[data-canva-active="true"] h2:hover,
[data-canva-active="true"] h3:hover,
[data-canva-active="true"] p:hover,
[data-canva-active="true"] .eyebrow:hover,
[data-canva-active="true"] .btn:hover {
  outline: 2px dashed rgba(110, 34, 51, 0.5) !important;
  outline-offset: 3px !important;
  border-radius: 4px;
  background-color: rgba(110, 34, 51, 0.04) !important;
}

[data-canva-active="true"] .hero-photo:hover,
[data-canva-active="true"] .about-photo:hover,
[data-canva-active="true"] .gallery img:hover,
[data-canva-active="true"] .masonry figure:hover,
[data-canva-active="true"] .ba-card:hover,
[data-canva-active="true"] [data-lume-placeholder]:hover {
  outline: 3px solid rgba(110, 34, 51, 0.8) !important;
  outline-offset: 2px !important;
}

[data-canva-active="true"] [data-selected-canva="true"] {
  outline: 3px solid #6e2233 !important;
  outline-offset: 3px !important;
  box-shadow: 0 0 0 5px rgba(110, 34, 51, 0.2) !important;
}
`;

export function PreviewFrame({
  device,
  fontsHref,
  canvaMode = true,
  onElementClick,
  children,
}: {
  device: PreviewDevice;
  fontsHref: string;
  canvaMode?: boolean;
  onElementClick?: (payload: VisualElementPayload) => void;
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
    d.body.setAttribute('data-canva-active', canvaMode ? 'true' : 'false');
    setDoc(d);
  }, [canvaMode]);

  // Atualiza atributo data-canva-active no body do iframe
  useEffect(() => {
    if (!doc) return;
    doc.body.setAttribute('data-canva-active', canvaMode ? 'true' : 'false');
  }, [doc, canvaMode]);

  // Injeta CSS do Canva Mode
  useEffect(() => {
    if (!doc) return;
    const id = 'lume-canva-mode-css';
    let styleEl = doc.getElementById(id) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = doc.createElement('style');
      styleEl.id = id;
      doc.head.appendChild(styleEl);
    }
    styleEl.textContent = CANVA_CSS;
  }, [doc]);

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

  // Listener inteligente de cliques estilo Canva no documento do iframe
  useEffect(() => {
    if (!doc || !canvaMode || !onElementClick) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Previne navegação de links e submits no modo Canva
      e.preventDefault();
      e.stopPropagation();

      // Remove destaque anterior
      doc.querySelectorAll('[data-selected-canva="true"]').forEach((el) => {
        el.removeAttribute('data-selected-canva');
      });

      // Aplica destaque no elemento clicado ou em seu container mais próximo
      const container = target.closest('section, .hero, .about, .svc, .testi, .ba-card, .masonry figure, .info, .nav') || target;
      container.setAttribute('data-selected-canva', 'true');

      // 1. Detecção de imagens
      const isHeroPhoto = target.closest('.hero-photo') || target.closest('.hero-art') || target.closest('[id*="hero"] img');
      const isAboutPhoto = target.closest('.about-photo') || target.closest('.about-grid img') || target.closest('[id*="about"] img');
      const isLogo = target.closest('.brand img') || target.closest('.nav img');
      const isGallery = target.closest('.masonry') || target.closest('.gallery');
      const isBA = target.closest('.ba-card') || target.closest('.ba-pair');
      const isTesti = target.closest('.testi');
      const isService = target.closest('.svc') || target.closest('.cards');

      if (isLogo) {
        onElementClick({
          tab: 'identity',
          fieldId: 'identity.logoUrl',
          label: 'Logo do Estúdio',
          kind: 'image',
          imageKind: 'logo',
        });
        return;
      }

      if (isHeroPhoto) {
        onElementClick({
          tab: 'content',
          fieldId: 'content.hero.imageUrl',
          label: 'Foto da Capa (Hero)',
          kind: 'image',
          imageKind: 'capa',
        });
        return;
      }

      if (isAboutPhoto) {
        onElementClick({
          tab: 'content',
          fieldId: 'content.about.imageUrl',
          label: 'Foto do Sobre Mim',
          kind: 'image',
          imageKind: 'sobre',
        });
        return;
      }

      if (isGallery) {
        onElementClick({
          tab: 'gallery',
          fieldId: 'content.gallery.items',
          label: 'Fotos da Galeria',
          kind: 'image',
          imageKind: 'galeria',
        });
        return;
      }

      if (isBA) {
        onElementClick({
          tab: 'beforeAfter',
          fieldId: 'content.beforeAfter.items',
          label: 'Antes e Depois',
          kind: 'image',
          imageKind: 'antes-depois',
        });
        return;
      }

      if (isTesti) {
        onElementClick({
          tab: 'testimonials',
          fieldId: 'content.testimonials.items',
          label: 'Depoimentos',
          kind: 'text',
        });
        return;
      }

      if (isService) {
        onElementClick({
          tab: 'services',
          fieldId: 'content.services',
          label: 'Serviços',
          kind: 'service',
        });
        return;
      }

      // 2. Detecção de textos
      const tag = target.tagName.toLowerCase();
      const textContent = (target.textContent || '').trim();

      // Topo / Marca
      if (target.closest('.brand') || target.closest('.nav')) {
        onElementClick({
          tab: 'identity',
          fieldId: 'identity.studioName',
          label: 'Nome do Estúdio',
          kind: 'text',
          currentValue: textContent,
        });
        return;
      }

      // Hero
      if (target.closest('.hero')) {
        if (target.closest('.eyebrow')) {
          onElementClick({
            tab: 'content',
            fieldId: 'content.hero.eyebrow',
            label: 'Rótulo da Capa',
            kind: 'text',
            currentValue: textContent,
          });
        } else if (tag === 'h1' || target.closest('h1')) {
          onElementClick({
            tab: 'content',
            fieldId: 'content.hero.headline',
            label: 'Título Principal',
            kind: 'text',
            currentValue: textContent,
          });
        } else if (target.closest('.btn') || tag === 'button') {
          onElementClick({
            tab: 'content',
            fieldId: 'content.hero.ctaPrimary',
            label: 'Botão de Agendamento',
            kind: 'text',
            currentValue: textContent,
          });
        } else {
          onElementClick({
            tab: 'content',
            fieldId: 'content.hero.subheadline',
            label: 'Subtítulo da Capa',
            kind: 'text',
            currentValue: textContent,
          });
        }
        return;
      }

      // Sobre Mim
      if (target.closest('.about-grid') || target.closest('[id*="about"]') || target.closest('.about')) {
        if (tag === 'h2' || target.closest('h2')) {
          onElementClick({
            tab: 'content',
            fieldId: 'content.about.title',
            label: 'Título do Sobre Mim',
            kind: 'text',
            currentValue: textContent,
          });
        } else {
          onElementClick({
            tab: 'content',
            fieldId: 'content.about.text',
            label: 'História do Sobre Mim',
            kind: 'text',
            currentValue: textContent,
          });
        }
        return;
      }

      // Números / Estatísticas
      if (target.closest('.stats')) {
        onElementClick({
          tab: 'extras',
          fieldId: 'content.stats.items',
          label: 'Números de Destaque',
          kind: 'text',
        });
        return;
      }

      // FAQ
      if (target.closest('.faq-list') || target.closest('details')) {
        onElementClick({
          tab: 'extras',
          fieldId: 'content.faq.items',
          label: 'Perguntas Frequentes',
          kind: 'text',
        });
        return;
      }

      // Localização e Contato
      if (target.closest('.info-grid') || target.closest('.contact-card') || target.closest('.foot')) {
        onElementClick({
          tab: 'identity',
          fieldId: 'identity.address',
          label: 'Endereço e Contato',
          kind: 'text',
        });
        return;
      }

      // Fallback: abre aba de textos
      onElementClick({
        tab: 'content',
        fieldId: 'content.hero.headline',
        label: 'Textos da Página',
        kind: 'text',
      });
    };

    doc.addEventListener('click', handleClick, true);
    return () => {
      doc.removeEventListener('click', handleClick, true);
    };
  }, [doc, canvaMode, onElementClick]);

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
          className={`bg-white overflow-hidden transition-all ${
            device === 'mobile'
              ? 'rounded-[28px] border-4 border-n-950 shadow-2xl'
              : 'rounded-xl border border-n-300 shadow-lg'
          }`}
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
