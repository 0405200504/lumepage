'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic } from 'lucide-react';
import { Portal } from '@/components/ui/Portal';
import { ANA_SATIN_STYLE, AnaStar } from './AnaBrand';
import { warmVoice } from './VoiceMode';

/**
 * O botão da Ana no canto inferior direito, em TODAS as telas do painel
 * (celular e computador). É uma pílula de cetim bordô com duas partes:
 *
 *   ★ Ana  → abre o chat;
 *   🎙     → começa a conversa por voz direto, sem abrir o chat. Ela segue
 *            falando na pílula do rodapé enquanto usa a tela.
 *
 * No celular some ao rolar para baixo e volta ao rolar para cima: enquanto
 * ela lê a tela o polegar não esbarra no botão, e ele reaparece no gesto que
 * já significa "quero voltar ao topo e agir". No computador fica sempre.
 *
 * Fica no <body> (Portal): dentro da página a transição de rota cria um
 * contexto de empilhamento e o `fixed` deixa de ser fixo na janela.
 *
 * Altura: 3.5rem no celular, 3rem no computador. O "+" (QuickAddFab) se
 * empilha logo acima e depende desses números. `--bottom-bar-h` é a altura
 * de uma barra fixa de rodapé da tela (ex.: os passos da Minha Página).
 */
export const AnaButton: React.FC<{ onOpenChat: () => void; onTalk: () => void }> = ({ onOpenChat, onTalk }) => {
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      // 6px de zona morta: sem ela o botão pisca com o tremor do dedo.
      if (Math.abs(y - lastY.current) > 6) {
        setVisible(y < lastY.current || y < 40);
        lastY.current = y;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const part =
    'h-full inline-flex items-center text-white transition-colors hover:bg-white/10 active:bg-white/15 ' +
    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white';

  return (
    <Portal>
      <div
        data-tour="ai-chat"
        data-visible={visible || undefined}
        className="no-print fixed z-40 right-4 lg:right-6
          bottom-[calc(1.25rem+env(safe-area-inset-bottom)+var(--bottom-bar-h,0px))]
          lg:bottom-[calc(1.5rem+var(--bottom-bar-h,0px))]
          flex items-center h-14 lg:h-12 rounded-full overflow-hidden
          shadow-wine ring-1 ring-inset ring-white/10
          transition-[opacity,transform] duration-[220ms] ease-out
          max-lg:opacity-0 max-lg:translate-y-3 max-lg:pointer-events-none
          max-lg:data-[visible]:opacity-100 max-lg:data-[visible]:translate-y-0 max-lg:data-[visible]:pointer-events-auto"
        style={ANA_SATIN_STYLE}
      >
        <button
          type="button"
          onClick={onOpenChat}
          aria-label="Abrir o chat com a Ana"
          title="Conversar com a Ana"
          className={`${part} gap-2 pl-4 pr-3 lg:pl-3.5`}
        >
          <AnaStar className="h-[22px] lg:h-5" />
          <span className="text-[15px] lg:text-body-sm font-semibold tracking-[-0.01em] [text-shadow:0_1px_2px_rgba(0,0,0,0.3)]">
            Ana
          </span>
        </button>
        <span aria-hidden className="h-6 w-px bg-white/25" />
        <button
          type="button"
          onClick={onTalk}
          onPointerEnter={warmVoice}
          onPointerDown={warmVoice}
          aria-label="Falar com a Ana por voz"
          title="Falar com a Ana"
          className={`${part} justify-center pl-3 pr-4 lg:pr-3.5`}
        >
          <Mic className="h-5 w-5 lg:h-[18px] lg:w-[18px]" aria-hidden />
        </button>
      </div>
    </Portal>
  );
};

export default AnaButton;
