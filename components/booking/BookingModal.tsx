'use client';

import React, { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { getBookingData } from '@/app/actions/booking';
import { Professional, Service, Setting } from '@/types/database';
import { BookingFlow } from './BookingFlow';
import { useToast } from '../ui/Toast';

interface BookingModalProps {
  professionalSlug: string;
  isOpen: boolean;
  onClose: () => void;
  /** Repassado ao fluxo: abre já com estes serviços marcados. */
  initialServiceIds?: string[];
}

export const BookingModal: React.FC<BookingModalProps> = ({
  professionalSlug,
  isOpen,
  onClose,
  initialServiceIds
}) => {
  const { error } = useToast();
  
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar dados quando o modal for aberto
  useEffect(() => {
    if (isOpen && professionalSlug) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const res = await getBookingData(professionalSlug);
          if (res.success && res.professional && res.services) {
            setProfessional(res.professional);
            setServices(res.services);
            setSettings(res.settings || null);
          } else {
            error('Erro de Carregamento', res.error || 'Não foi possível carregar os dados de agendamento.');
            onClose();
          }
        } catch (e) {
          error('Erro', 'Ocorreu um erro ao carregar as informações.');
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, professionalSlug, error, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 select-none">
      {/* Backdrop (Fundo Escurecido com Blur) */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/50 sm:bg-black/40 sm:backdrop-blur-md transition-opacity duration-200 animate-fade-in"
      />

      {/* Modal Container */}
      <div 
        className={`bg-white w-full sm:max-w-[540px] flex flex-col relative z-10 overflow-hidden shadow-2xl transition-all duration-300 border border-gray-100
          ${/* Mobile: Bottom Sheet | Desktop: Centralizado */ ''}
          absolute bottom-0 rounded-t-[32px] max-h-[92vh] animate-slide-up
          sm:relative sm:bottom-auto sm:rounded-[32px] sm:max-h-[85vh] sm:animate-scale-in`
        }
      >
        
        {/* Barra de Arrastar/Indicador visual no Mobile */}
        <div className="flex justify-center py-2.5 sm:hidden">
          <div className="w-12 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Cabeçalho do Modal com botão fechar */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-100 sm:pt-6">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-forest animate-pulse" />
            <span className="text-[10px] font-extrabold text-forest uppercase tracking-widest">
              Agendamento Online Lume
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-50 text-gray-400 hover:text-forest rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {isLoading ? (
            // Skeleton Loader Premium
            <div className="p-6 md:p-8 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-gray-100 rounded-2xl animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 bg-gray-100 rounded-md w-1/2 animate-pulse" />
                  <div className="h-3.5 bg-gray-100 rounded-md w-3/4 animate-pulse" />
                </div>
              </div>
              <div className="pt-4 space-y-3">
                <div className="h-12 bg-gray-50 rounded-2xl animate-pulse w-full" />
                <div className="h-12 bg-gray-50 rounded-2xl animate-pulse w-full" />
                <div className="h-12 bg-gray-50 rounded-2xl animate-pulse w-full" />
              </div>
            </div>
          ) : professional && services ? (
            // Fluxo de agendamento incorporado (isEmbed=true desabilita o header gigante redundante)
            <BookingFlow
              professional={professional}
              services={services}
              settings={settings}
              isEmbed={true}
              initialServiceIds={initialServiceIds}
              onSuccessClose={onClose}
              onAnalyticsEvent={(event, data) => {
                console.log(`[ANALYTICS] Evento disparado: ${event}`, data);
              }}
            />
          ) : (
            <div className="p-12 text-center text-xs text-gray-400">
              Falha ao carregar os dados.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default BookingModal;
