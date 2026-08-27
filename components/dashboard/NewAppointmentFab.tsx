'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Service, Client } from '@/types/database';
import { QuickAppointmentModal } from './QuickAppointmentModal';
import { Portal } from '../ui/Portal';

interface Props {
  professionalId: string;
  services: Service[];
  clients: Client[];
}

/**
 * Ação primária da tela Início no celular: encaixar uma cliente.
 *
 * Some ao rolar para baixo e volta ao rolar para cima — enquanto ela lê a
 * agenda o polegar não esbarra num botão, e o botão reaparece no gesto que
 * já significa "quero voltar ao topo e agir".
 *
 * Fica só no mobile: no desktop a ação vive na própria Agenda, com contexto
 * de dia e horário.
 */
export const NewAppointmentFab: React.FC<Props> = ({ professionalId, services, clients }) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
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

  const hoje = new Date();
  const iso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  return (
    <>
      <Portal>
        <button
          onClick={() => setOpen(true)}
          aria-label="Novo agendamento"
          data-visible={visible || undefined}
          className="lg:hidden no-print fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40
            h-14 w-14 rounded-full bg-wine-700 text-white shadow-wine
            flex items-center justify-center
            transition-[opacity,transform] duration-[220ms] ease-out
            opacity-0 translate-y-3 pointer-events-none
            data-[visible]:opacity-100 data-[visible]:translate-y-0 data-[visible]:pointer-events-auto
            active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
        >
          <Plus className="h-6 w-6" />
        </button>
      </Portal>

      {open && (
        <QuickAppointmentModal
          professionalId={professionalId}
          services={services}
          clients={clients}
          initialDate={iso}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
};

export default NewAppointmentFab;
