'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { BookingModal } from './BookingModal';

interface LumeBookingProps {
  /** O slug da profissional cadastrada no sistema */
  slug: string;
  children: React.ReactNode;
}

/**
 * Componente wrapper que transforma qualquer elemento com o atributo
 * `data-lume-agendar` em um botão que abre o popup de agendamento.
 * 
 * Uso:
 * ```tsx
 * <LumeBooking slug="amanda-costa">
 *   <div>
 *     <button data-lume-agendar>Agendar Horário</button>
 *     <button data-lume-agendar>Marcar Avaliação</button>
 *     <a data-lume-agendar href="#">Quero meu Atendimento</a>
 *   </div>
 * </LumeBooking>
 * ```
 */
export const LumeBooking: React.FC<LumeBookingProps> = ({ slug, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Listener global: qualquer clique em elemento com data-lume-agendar abre o modal
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-lume-agendar]');
      if (target) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      {children}
      <BookingModal
        professionalSlug={slug}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};

export default LumeBooking;
