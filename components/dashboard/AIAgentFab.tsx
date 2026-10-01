'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { OPEN_AI_EVENT } from '../ai/AIAgentChat';
import { Portal } from '../ui/Portal';

/**
 * Botão flutuante da tela Início no celular: abre a assistente de IA.
 *
 * Era o "+" de encaixar uma cliente. A assistente faz isso e o resto —
 * marcar horário, cadastrar cliente, anotar tarefa — por linguagem natural,
 * então é ela que fica a um toque na tela de entrada.
 *
 * Some ao rolar para baixo e volta ao rolar para cima — enquanto ela lê a
 * tela o polegar não esbarra num botão, e o botão reaparece no gesto que
 * já significa "quero voltar ao topo e agir".
 *
 * Fica só no mobile: no desktop a assistente tem o botão ancorado no canto
 * (components/ai/AIAgentChat).
 */
export const AIAgentFab: React.FC = () => {
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

  // No <body>, via Portal: dentro da página a transição de rota cria um
  // contexto de empilhamento e o `fixed` deixa de ser fixo na janela.
  return (
    <Portal>
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_AI_EVENT))}
      aria-label="Falar com a Ana, sua assistente"
      data-visible={visible || undefined}
      className="lg:hidden no-print fixed right-4 bottom-[calc(1.25rem+env(safe-area-inset-bottom)+var(--voice-pill-h,0px))] z-40
        h-14 w-14 rounded-full bg-wine-700 text-white shadow-wine
        flex items-center justify-center
        transition-[opacity,transform] duration-[220ms] ease-out
        opacity-0 translate-y-3 pointer-events-none
        data-[visible]:opacity-100 data-[visible]:translate-y-0 data-[visible]:pointer-events-auto
        active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
    >
      <Sparkles className="h-6 w-6" aria-hidden />
    </button>
    </Portal>
  );
};

export default AIAgentFab;
