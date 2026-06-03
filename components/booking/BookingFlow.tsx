'use client';

import React, { useState, useEffect } from 'react';
import { Professional, Service, Setting } from '@/types/database';
import { 
  Calendar as CalendarIcon, Clock, User, MessageSquare, 
  ChevronRight, ArrowLeft, Scissors, Check, MessageCircle, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { getSlotsAction, createAppointmentAction } from '@/app/actions/booking';
import { useToast } from '../ui/Toast';

interface BookingFlowProps {
  professional: Professional;
  services: Service[];
  settings: Setting | null;
  isEmbed?: boolean;
  onSuccessClose?: () => void;
  onAnalyticsEvent?: (eventName: string, data?: any) => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  professional,
  services,
  settings,
  isEmbed = false,
  onSuccessClose,
  onAnalyticsEvent
}) => {
  const { success, error } = useToast();
  
  // Etapa Atual: 1 = Serviços, 2 = Data, 3 = Horário, 4 = Identificação, 5 = Revisão, 6 = Sucesso
  const [step, setStep] = useState(1);
  
  // Seleções
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Formulário do Cliente
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  
  // Estado de Slots e Carregamento
  const [slots, setSlots] = useState<{ time: string; isAvailable: boolean }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Cores personalizadas do profissional
  const primaryColor = professional.primary_color || '#500b18';
  const secondaryColor = professional.secondary_color || '#e3bc8f';

  // Gerar os próximos 15 dias para seleção
  const [availableDays, setAvailableDays] = useState<{ dateStr: string; label: string; weekdayLabel: string }[]>([]);

  // Disparar evento de abertura do fluxo
  useEffect(() => {
    if (onAnalyticsEvent) {
      onAnalyticsEvent('booking_modal_opened', { professional_slug: professional.slug });
    }
  }, [professional.slug, onAnalyticsEvent]);

  useEffect(() => {
    const days = [];
    const maxDays = settings?.max_days_ahead || 30;
    const today = new Date();
    
    // Gerar até 15 dias livres respeitando o limite máximo definido
    const limit = Math.min(15, maxDays);
    for (let i = 0; i < limit; i++) {
      const current = new Date();
      current.setDate(today.getDate() + i);
      
      const year = current.getFullYear();
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const day = current.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const label = current.getDate().toString();
      const weekdayLabel = current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').substring(0, 3);
      
      days.push({ dateStr, label, weekdayLabel });
    }
    setAvailableDays(days);
  }, [settings]);

  // Carregar slots quando mudar de data
  useEffect(() => {
    if (selectedService && selectedDate) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true);
        setSelectedTime('');
        try {
          const res = await getSlotsAction(professional.id, selectedDate, selectedService.id);
          if (res.success && res.slots) {
            setSlots(res.slots);
          } else {
            error('Erro', res.error || 'Erro ao carregar horários.');
            setSlots([]);
          }
        } catch (e) {
          error('Erro', 'Não foi possível carregar os horários livres.');
        } finally {
          setIsLoadingSlots(false);
        }
      };
      fetchSlots();
    }
  }, [selectedDate, selectedService, professional.id, error]);

  // Ações do fluxo
  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    if (onAnalyticsEvent) {
      onAnalyticsEvent('service_selected', { service_id: service.id, service_name: service.name });
    }
    setStep(2);
    // Auto-selecionar o primeiro dia da lista se não houver selecionado
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0].dateStr);
    }
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    if (onAnalyticsEvent) {
      onAnalyticsEvent('date_selected', { date: dateStr });
    }
    setStep(3);
  };

  const handleSelectTime = (time: string) => {
    setSelectedTime(time);
    if (onAnalyticsEvent) {
      onAnalyticsEvent('time_selected', { time });
    }
    setStep(4);
  };

  const handleClientDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientWhatsapp) {
      error('Preencha os dados', 'Nome e WhatsApp são obrigatórios.');
      return;
    }
    // Validar WhatsApp básico (apenas dígitos, mínimo de 10)
    const rawWhatsapp = clientWhatsapp.replace(/\D/g, '');
    if (rawWhatsapp.length < 10) {
      error('WhatsApp Inválido', 'Por favor, informe o WhatsApp com o DDD.');
      return;
    }

    if (onAnalyticsEvent) {
      onAnalyticsEvent('booking_submitted', { name: clientName, email: clientEmail });
    }
    setStep(5);
  };

  // Confirmar e criar agendamento no Supabase
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createAppointmentAction({
        professionalId: professional.id,
        serviceId: selectedService!.id,
        clientName,
        clientWhatsapp,
        clientEmail: clientEmail || undefined,
        date: selectedDate,
        startTime: selectedTime,
        notes: notes || undefined
      });

      if (res.success && res.appointmentId) {
        setCreatedAppointmentId(res.appointmentId);
        if (onAnalyticsEvent) {
          onAnalyticsEvent('booking_completed', { appointment_id: res.appointmentId });
        }
        setStep(6);
      } else {
        setSubmitError(res.error || 'Este horário acabou de ser reservado por outra pessoa.');
        if (onAnalyticsEvent) {
          onAnalyticsEvent('booking_failed', { error: res.error });
        }
      }
    } catch (e: any) {
      setSubmitError('Ocorreu um erro técnico ao confirmar. Tente novamente.');
      if (onAnalyticsEvent) {
        onAnalyticsEvent('booking_failed', { error: e.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Formatar preço
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  // Link do WhatsApp na tela de sucesso
  const getWhatsAppLink = () => {
    if (!selectedService || !selectedDate || !selectedTime) return '#';
    const dateObj = new Date(`${selectedDate}T12:00:00`);
    const formattedDate = dateObj.toLocaleDateString('pt-BR');
    const message = `Oi, ${professional.name}! Acabei de solicitar um agendamento de ${selectedService.name} para o dia ${formattedDate} às ${selectedTime.substring(0, 5)} pelo Lume Agenda.`;
    const cleanPhone = professional.whatsapp.replace(/\D/g, '') || '';
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="w-full flex flex-col h-full select-none">
      {/* Cabeçalho Público da Profissional (Escondido se isEmbed for true) */}
      {!isEmbed && step !== 6 && (
        <div 
          className="p-6 text-white flex flex-col items-center text-center relative"
          style={{ backgroundColor: primaryColor }}
        >
          <div 
            className="h-16 w-16 bg-white/10 rounded-3xl flex items-center justify-center font-black text-2xl mb-4 border border-white/15"
            style={{ color: secondaryColor }}
          >
            {professional.brand_name.substring(0, 2).toUpperCase()}
          </div>
          
          <h1 className="text-xl font-black tracking-tight">{professional.brand_name}</h1>
          <p className="text-xs text-white/70 max-w-sm mt-1">{professional.public_bio || professional.description}</p>
          
          {professional.instagram && (
            <a 
              href={`https://instagram.com/${professional.instagram.replace('@', '')}`}
              target="_blank"
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-white/10 hover:bg-white/15 rounded-full transition-colors"
            >
              <span>{professional.instagram}</span>
            </a>
          )}
        </div>
      )}

      {/* Indicador de Etapas */}
      {step !== 6 && (
        <div className="flex border-b border-gray-150 bg-gray-50/50 text-[9px] font-bold uppercase tracking-wider text-center text-gray-400">
          <div className={`flex-1 py-3 ${step === 1 ? 'text-forest border-b-2 border-forest bg-white' : step > 1 ? 'text-forest' : ''}`}>
            1. Serviço
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 2 ? 'text-forest border-b-2 border-forest bg-white' : step > 2 ? 'text-forest' : ''}`}>
            2. Dia
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 3 ? 'text-forest border-b-2 border-forest bg-white' : step > 3 ? 'text-forest' : ''}`}>
            3. Hora
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 4 ? 'text-forest border-b-2 border-forest bg-white' : step > 4 ? 'text-forest' : ''}`}>
            4. Dados
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 5 ? 'text-forest border-b-2 border-forest bg-white' : ''}`}>
            5. Revisão
          </div>
        </div>
      )}

      {/* Conteúdo das Etapas */}
      <div className="p-6 md:p-8 flex-1 overflow-y-auto max-h-[70vh]">
        
        {/* ETAPA 1: Selecionar Serviço */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Escolha o serviço desejado</h2>
              <p className="text-xs text-gray-450 mt-1">Selecione uma das opções abaixo para prosseguir.</p>
            </div>

            <div className="space-y-3">
              {services.length > 0 ? (
                services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleSelectService(service)}
                    className="w-full text-left bg-white border border-gray-200 hover:border-forest p-4 rounded-2xl transition-all flex justify-between items-center gap-4 group cursor-pointer hover:shadow-xs"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 group-hover:text-forest transition-colors">
                        {service.name}
                      </p>
                      {service.description && (
                        <p className="text-xs text-gray-450 mt-1 line-clamp-2 leading-relaxed">{service.description}</p>
                      )}
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold mt-2.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{service.duration_minutes} minutos</span>
                      </div>
                    </div>

                    <div className="shrink-0 text-right flex items-center gap-3">
                      {settings?.show_price_public && (
                        <span className="text-sm font-black text-gray-900">{formatPrice(service.price_cents)}</span>
                      )}
                      <div className="h-8 w-8 bg-gray-50 group-hover:bg-forest group-hover:text-lima rounded-xl flex items-center justify-center text-gray-450 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-xs text-gray-400 py-8">Nenhum serviço ativo no momento.</p>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 2: Selecionar Data */}
        {step === 2 && selectedService && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-forest transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para serviços</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <Scissors className="h-4.5 w-4.5 text-forest" />
                <span>{selectedService.name}</span>
              </h2>
              <p className="text-xs text-gray-450 mt-1">Selecione o dia em que deseja realizar seu atendimento:</p>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
              {availableDays.map((day) => {
                const isSelected = selectedDate === day.dateStr;
                return (
                  <button
                    key={day.dateStr}
                    onClick={() => handleSelectDate(day.dateStr)}
                    className={`flex flex-col items-center justify-center py-3.5 px-2.5 rounded-xl text-center transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-forest text-white border-forest shadow-md'
                        : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200'
                    }`}
                  >
                    <span className="text-[9px] uppercase font-bold tracking-wider leading-none opacity-80 mb-1">
                      {day.weekdayLabel}
                    </span>
                    <span className="text-sm font-black leading-none">{day.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ETAPA 3: Selecionar Horário */}
        {step === 3 && selectedService && selectedDate && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-forest transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para dias</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">
                Qual o melhor horário para você?
              </h2>
              <p className="text-xs text-gray-450 mt-1">
                Mostrando vagas livres para {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}
              </p>
            </div>

            {isLoadingSlots ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-gray-450">Buscando horários livres...</p>
              </div>
            ) : slots.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedTime === slot.time;
                  return (
                    <button
                      key={slot.time}
                      disabled={!slot.isAvailable}
                      onClick={() => slot.isAvailable && handleSelectTime(slot.time)}
                      className={`py-3 px-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        !slot.isAvailable
                          ? 'bg-gray-50 text-gray-300 border border-gray-150 line-through cursor-not-allowed'
                          : isSelected
                            ? 'bg-lima text-forest border-lima shadow-sm font-black'
                            : 'bg-white hover:border-forest text-gray-700 border border-gray-200'
                      }`}
                    >
                      {slot.time.substring(0, 5)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                <p className="text-xs text-gray-500 font-bold">Não encontramos horários disponíveis para essa data.</p>
                <p className="text-[10px] text-gray-450 mt-1">Por favor, escolha outro dia para continuar.</p>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 4: Dados da Cliente */}
        {step === 4 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-forest transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para horários</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Preencha seus dados</h2>
              <p className="text-xs text-gray-450 mt-1">Precisamos dessas informações para confirmar seu agendamento.</p>
            </div>

            <form onSubmit={handleClientDetailsSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Seu Nome Completo *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Juliana Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  WhatsApp para Contato *
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    inputMode="tel"
                    placeholder="Ex: 11999999999"
                    value={clientWhatsapp}
                    onChange={(e) => setClientWhatsapp(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Seu E-mail (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="Ex: juliana@email.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="block w-full px-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Observações ou Restrições (Opcional)
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute top-3 left-3 pointer-events-none">
                    <MessageSquare className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Ex: Alergias, pele sensível, etc..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer mt-4"
              >
                Avançar para Revisão
              </button>
            </form>
          </div>
        )}

        {/* ETAPA 5: Revisão e Confirmação */}
        {step === 5 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-forest transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para dados</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Revise os dados de agendamento</h2>
              <p className="text-xs text-gray-450 mt-1">Certifique-se de que tudo está correto antes de confirmar.</p>
            </div>

            <div className="bg-gray-55/60 border border-gray-200 rounded-2xl p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">PROFISSIONAL</span>
                  <span className="font-bold text-gray-800">{professional.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">SERVIÇO</span>
                  <span className="font-bold text-gray-800">{selectedService.name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">DATA</span>
                  <span className="font-bold text-gray-800">
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">HORÁRIO</span>
                  <span className="font-bold text-gray-800">{selectedTime.substring(0, 5)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">CLIENTE</span>
                  <span className="font-bold text-gray-800">{clientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">WHATSAPP</span>
                  <span className="font-bold text-gray-800">{clientWhatsapp}</span>
                </div>
              </div>

              {settings?.show_price_public && (
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-[10px] text-gray-450 font-bold uppercase">VALOR DO ATENDIMENTO</span>
                  <span className="text-sm font-black text-gray-900">{formatPrice(selectedService.price_cents)}</span>
                </div>
              )}
            </div>

            {submitError && (
              <div className="bg-red-50 text-red-650 border border-red-200 rounded-2xl p-4 flex gap-3 text-xs">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold">Horário indisponível</p>
                  <p className="text-[11px] mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="w-full py-4 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Confirmando agendamento...</span>
                </>
              ) : (
                <>
                  <Check className="h-4.5 w-4.5" />
                  <span>Confirmar e Reservar Horário</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* ETAPA 6: Sucesso */}
        {step === 6 && selectedService && (
          <div className="flex flex-col items-center text-center py-6 space-y-5 select-none">
            <div className="h-16 w-16 bg-lima/20 text-forest flex items-center justify-center rounded-3xl border border-lima/30 mb-2">
              <CheckCircle2 className="h-10 w-10 text-forest" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black text-forest tracking-tight">Agendamento Realizado!</h2>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                {settings?.confirmation_mode === 'manual' 
                  ? 'Seu agendamento foi solicitado com sucesso. A profissional recebeu suas informações e poderá confirmar pelo WhatsApp.'
                  : 'Seu horário foi reservado com sucesso. Em breve você receberá mais informações pelo WhatsApp.'}
              </p>
            </div>

            <div className="w-full bg-[#faf9f6] border border-gray-200 rounded-2xl p-4 text-left text-xs space-y-3.5">
              <div>
                <span className="text-[9px] text-gray-400 block font-bold">PROFISSIONAL</span>
                <span className="font-bold text-gray-800">{professional.brand_name}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 block font-bold">SERVIÇO</span>
                <span className="font-bold text-gray-800">{selectedService.name}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-150">
                <div>
                  <span className="text-[9px] text-gray-400 block font-bold">DATA</span>
                  <span className="font-bold text-gray-800">
                    {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 block font-bold">HORÁRIO</span>
                  <span className="font-bold text-gray-800">{selectedTime.substring(0, 5)}</span>
                </div>
              </div>
            </div>

            <div className="w-full space-y-2.5 pt-3">
              <a
                href={getWhatsAppLink()}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <MessageCircle className="h-4.5 w-4.5" />
                <span>Chamar no WhatsApp</span>
              </a>

              {onSuccessClose && (
                <button
                  onClick={onSuccessClose}
                  className="w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-250 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
export default BookingFlow;
