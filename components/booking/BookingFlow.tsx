'use client';

import React, { useState, useEffect } from 'react';
import { Professional, Service, Setting } from '@/types/database';
import { 
  Calendar as CalendarIcon, Clock, User, MessageSquare,
  ChevronRight, ArrowLeft, Check, MessageCircle, CheckCircle2, AlertTriangle, Wallet
} from 'lucide-react';
import { getSlotsForServicesAction, createAppointmentAction, getDaysAvailabilityAction } from '@/app/actions/booking';
import { addToWaitlistAction } from '@/app/actions/waitlist';
import { sumDurationMinutes, sumPriceCents, formatServiceNames } from '@/lib/appointments/services';
import { useToast } from '../ui/Toast';
import { BookingDecor } from './BookingDecor';
import TurnstileWidget, { turnstileConfigured } from './TurnstileWidget';

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Não sei ainda'];

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
  
  // Seleções (multi-serviço)
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const selectedService = selectedServices[0] || null; // serviço primário (compatibilidade de exibição)
  const servicesLabel = formatServiceNames(selectedServices);
  const totalCents = sumPriceCents(selectedServices);
  const totalDuration = sumDurationMinutes(selectedServices);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Formulário do Cliente
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientBirthday, setClientBirthday] = useState('');
  const [notes, setNotes] = useState('');
  
  // Estado de Slots e Carregamento
  const [slots, setSlots] = useState<{ time: string; isAvailable: boolean }[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Forma de pagamento
  const [paymentMethod, setPaymentMethod] = useState('');

  // Captcha (Turnstile) — só relevante quando configurado (NEXT_PUBLIC_TURNSTILE_SITE_KEY)
  const [captchaToken, setCaptchaToken] = useState('');

  // Lista de espera (cliente)
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [wlBusy, setWlBusy] = useState(false);
  const [wlName, setWlName] = useState('');
  const [wlPhone, setWlPhone] = useState('');
  const [wlPeriod, setWlPeriod] = useState('');
  const [wlPref, setWlPref] = useState('');
  const [wlNotes, setWlNotes] = useState('');

  const openWaitlist = () => {
    setWlName(clientName || '');
    setWlPhone(clientWhatsapp || '');
    setWlPeriod(selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR') : '');
    setWlPref(''); setWlNotes(''); setWaitlistSent(false);
    setShowWaitlist(true);
  };

  const submitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    setWlBusy(true);
    try {
      const res = await addToWaitlistAction({
        professionalId: professional.id,
        clientName: wlName,
        clientWhatsapp: wlPhone,
        serviceId: selectedService?.id,
        desiredDate: selectedDate || undefined,
        desiredPeriod: wlPeriod || undefined,
        timePreference: wlPref || undefined,
        notes: wlNotes || undefined,
      });
      if (res.success) {
        setWaitlistSent(true);
        success('Tudo certo!', 'Você entrou na lista de espera. Avisaremos se abrir um horário.');
      } else {
        error('Ops', res.error || 'Não foi possível entrar na lista.');
      }
    } catch {
      error('Erro', 'Falha ao entrar na lista de espera.');
    } finally {
      setWlBusy(false);
    }
  };

  // Cores personalizadas do profissional
  const primaryColor = professional.primary_color || '#500b18';
  const secondaryColor = professional.secondary_color || '#eccbd2';

  // Gerar os próximos 15 dias para seleção
  const [availableDays, setAvailableDays] = useState<{ dateStr: string; label: string; weekdayLabel: string; monthLabel: string }[]>([]);

  // Disparar evento de abertura do fluxo
  useEffect(() => {
    if (onAnalyticsEvent) {
      onAnalyticsEvent('booking_modal_opened', { professional_slug: professional.slug });
    }
  }, [professional.slug, onAnalyticsEvent]);

  useEffect(() => {
    const days = [];
    // Respeita a antecedência máxima configurada pela profissional (antes ficava
    // travado em 15 dias, ignorando o ajuste). Teto de segurança de 365 dias para
    // não gerar uma lista infinita por engano.
    const maxDays = Math.min(settings?.max_days_ahead || 30, 365);
    const today = new Date();

    for (let i = 0; i < maxDays; i++) {
      const current = new Date();
      current.setDate(today.getDate() + i);

      const year = current.getFullYear();
      const month = (current.getMonth() + 1).toString().padStart(2, '0');
      const day = current.getDate().toString().padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const label = current.getDate().toString();
      const weekdayLabel = current.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').substring(0, 3);
      // Rótulo do mês (capitalizado) para agrupar a lista quando há muitos dias.
      const rawMonth = current.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);

      days.push({ dateStr, label, weekdayLabel, monthLabel });
    }
    setAvailableDays(days);
  }, [settings]);

  // Datas SEM horário livre (para riscar na lista). Recalculado quando muda a
  // seleção de serviços (a duração afeta a disponibilidade) ou a lista de dias.
  const [unavailableDays, setUnavailableDays] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (selectedServices.length === 0 || availableDays.length === 0) {
      setUnavailableDays(new Set());
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getDaysAvailabilityAction(
          professional.id,
          availableDays.map(d => d.dateStr),
          selectedServices.map(s => s.id),
        );
        if (cancelled || !res.success || !res.availability) return;
        const closed = new Set<string>();
        for (const [dateStr, hasSlot] of Object.entries(res.availability)) {
          if (!hasSlot) closed.add(dateStr);
        }
        setUnavailableDays(closed);
      } catch { /* silencioso: em erro, nenhum dia é riscado */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDays, selectedServices.map(s => s.id).join(','), professional.id]);

  // Agrupa os dias por mês (a lista já vem em ordem cronológica) para renderizar
  // com cabeçalho de mês — essencial quando a antecedência é longa (ex.: 300 dias).
  const groupedDays = React.useMemo(() => {
    const groups: { monthLabel: string; days: typeof availableDays }[] = [];
    for (const day of availableDays) {
      const last = groups[groups.length - 1];
      if (last && last.monthLabel === day.monthLabel) last.days.push(day);
      else groups.push({ monthLabel: day.monthLabel, days: [day] });
    }
    return groups;
  }, [availableDays]);

  // Carregar slots quando mudar de data (usa a soma das durações dos serviços escolhidos)
  useEffect(() => {
    if (selectedServices.length > 0 && selectedDate) {
      const fetchSlots = async () => {
        setIsLoadingSlots(true);
        setSelectedTime('');
        try {
          const res = await getSlotsForServicesAction(professional.id, selectedDate, selectedServices.map(s => s.id));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedServices.map(s => s.id).join(','), professional.id]);

  // Ações do fluxo — multi-serviço: alterna a seleção (não avança sozinho)
  const toggleService = (service: Service) => {
    setSelectedServices(prev =>
      prev.some(s => s.id === service.id) ? prev.filter(s => s.id !== service.id) : [...prev, service]
    );
  };

  const continueFromServices = () => {
    if (selectedServices.length === 0) {
      error('Escolha um serviço', 'Selecione ao menos um serviço para continuar.');
      return;
    }
    if (onAnalyticsEvent) {
      onAnalyticsEvent('service_selected', { service_ids: selectedServices.map(s => s.id) });
    }
    setStep(2);
    if (availableDays.length > 0 && !selectedDate) {
      setSelectedDate(availableDays[0].dateStr);
    }
  };

  // Quando a disponibilidade dos dias carrega: se o dia atualmente selecionado não
  // tem horário (ou nenhum está selecionado), move a seleção para o primeiro dia livre.
  useEffect(() => {
    if (availableDays.length === 0) return;
    const currentIsBad = !selectedDate || unavailableDays.has(selectedDate);
    if (!currentIsBad) return;
    const firstFree = availableDays.find(d => !unavailableDays.has(d.dateStr));
    setSelectedDate(firstFree ? firstFree.dateStr : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unavailableDays, availableDays]);

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
    // Se o captcha está ativo mas ainda não foi resolvido, não deixa enviar.
    if (turnstileConfigured && !captchaToken) {
      setSubmitError('Aguarde a verificação de segurança terminar e tente de novo.');
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createAppointmentAction({
        professionalId: professional.id,
        serviceId: selectedServices[0].id,
        serviceIds: selectedServices.map(s => s.id),
        clientName,
        clientWhatsapp,
        clientEmail: clientEmail || undefined,
        clientBirthday: clientBirthday || undefined,
        date: selectedDate,
        startTime: selectedTime,
        notes: notes || undefined,
        paymentMethod: paymentMethod || undefined,
        captchaToken: captchaToken || undefined,
      });

      if (res.success && res.appointmentId) {
        setCreatedAppointmentId(res.appointmentId);
        if (onAnalyticsEvent) {
          onAnalyticsEvent('booking_completed', { appointment_id: res.appointmentId });
        }
        // Avisa o site que incorporou o widget (iframe) que o agendamento foi concluído
        if (typeof window !== 'undefined' && window.parent !== window) {
          window.parent.postMessage(
            { type: 'lume:booked', appointmentId: res.appointmentId, service: selectedService?.name, date: selectedDate, time: selectedTime },
            '*'
          );
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
    const message = `Oi, ${professional.name}! Acabei de solicitar um agendamento de ${servicesLabel} para o dia ${formattedDate} às ${selectedTime.substring(0, 5)} pelo Lume Agenda.`;
    const cleanPhone = professional.whatsapp.replace(/\D/g, '') || '';
    return `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div
      className="w-full flex flex-col h-full select-none"
      style={{ ['--brand' as string]: primaryColor, ['--brand-2' as string]: secondaryColor } as React.CSSProperties}
    >
      {/* Cabeçalho Público da Profissional (compacto quando embutido no popup) */}
      {step !== 6 && (
        <div
          className={`text-white flex flex-col items-center text-center relative overflow-hidden bg-[var(--brand)] ${isEmbed ? 'p-4' : 'p-6'}`}
        >
          {/* Elementos decorativos delicados (tema escolhido pela profissional) */}
          <BookingDecor theme={settings?.booking_theme} color={secondaryColor} />

          <div
            className={`bg-white/10 rounded-3xl flex items-center justify-center font-black border border-white/15 z-10 text-[var(--brand-2)] ${isEmbed ? 'h-11 w-11 text-lg mb-2' : 'h-16 w-16 text-2xl mb-4'}`}
          >
            {professional.brand_name.substring(0, 2).toUpperCase()}
          </div>

          <h1 className={`font-black tracking-tight z-10 ${isEmbed ? 'text-base' : 'text-xl'}`}>{professional.brand_name}</h1>
          {!isEmbed && <p className="text-xs text-white/70 max-w-sm mt-1 z-10">{professional.public_bio || professional.description}</p>}

          {professional.instagram && (
            <a
              href={`https://instagram.com/${professional.instagram.replace('@', '')}`}
              target="_blank"
              className={`z-10 inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 bg-white/10 hover:bg-white/15 rounded-full transition-colors ${isEmbed ? 'mt-1.5' : 'mt-3'}`}
            >
              <span>{professional.instagram}</span>
            </a>
          )}
        </div>
      )}

      {/* Indicador de Etapas */}
      {step !== 6 && (
        <div className="flex border-b border-gray-150 bg-gray-50/50 text-[9px] font-bold uppercase tracking-wider text-center text-gray-400">
          <div className={`flex-1 py-3 ${step === 1 ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-white' : step > 1 ? 'text-[var(--brand)]' : ''}`}>
            1. Serviço
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 2 ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-white' : step > 2 ? 'text-[var(--brand)]' : ''}`}>
            2. Dia
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 3 ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-white' : step > 3 ? 'text-[var(--brand)]' : ''}`}>
            3. Hora
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 4 ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-white' : step > 4 ? 'text-[var(--brand)]' : ''}`}>
            4. Dados
          </div>
          <div className={`flex-1 py-3 border-l border-gray-150 ${step === 5 ? 'text-[var(--brand)] border-b-2 border-[var(--brand)] bg-white' : ''}`}>
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
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Escolha os serviços desejados</h2>
              <p className="text-xs text-gray-450 mt-1">Você pode selecionar mais de um serviço para o mesmo horário.</p>
            </div>

            <div className="space-y-3">
              {services.length > 0 ? (
                services.map((service) => {
                  const sel = selectedServices.some(s => s.id === service.id);
                  return (
                    <button
                      key={service.id}
                      onClick={() => toggleService(service)}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex justify-between items-center gap-4 group cursor-pointer hover:shadow-xs border ${
                        sel ? 'bg-[var(--brand)]/5 border-[var(--brand)]' : 'bg-white border-gray-200 hover:border-[var(--brand)]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-bold transition-colors ${sel ? 'text-[var(--brand)]' : 'text-gray-800 group-hover:text-[var(--brand)]'}`}>
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
                        <div className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                          sel ? 'bg-[var(--brand)] text-[var(--brand-2)]' : 'bg-gray-50 text-gray-450'
                        }`}>
                          <Check className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <p className="text-center text-xs text-gray-400 py-8">Nenhum serviço ativo no momento.</p>
              )}
            </div>

            {selectedServices.length > 0 && (
              <div className="sticky bottom-0 bg-white/90 backdrop-blur pt-2">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="text-gray-450">{selectedServices.length} serviço{selectedServices.length !== 1 ? 's' : ''} · {totalDuration} min</span>
                  {settings?.show_price_public && <span className="font-black text-gray-900">{formatPrice(totalCents)}</span>}
                </div>
                <button
                  onClick={continueFromServices}
                  className="w-full py-3 rounded-2xl bg-[var(--brand)] text-[var(--brand-2)] text-sm font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2"
                >
                  Continuar <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ETAPA 2: Selecionar Data */}
        {step === 2 && selectedService && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[var(--brand)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para serviços</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">
                {servicesLabel}
              </h2>
              <p className="text-xs text-gray-450 mt-1">Selecione o dia em que deseja realizar seu atendimento:</p>
            </div>

            {/* Área rolável: com antecedência longa (ex.: 300 dias) a lista é grande,
                então limitamos a altura e agrupamos por mês para facilitar a navegação. */}
            <div className="max-h-[22rem] overflow-y-auto pr-1 -mr-1 space-y-4">
              {groupedDays.map((group) => (
                <div key={group.monthLabel} className="space-y-2.5">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide sticky top-0 bg-white/95 py-1 z-10">
                    {group.monthLabel}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                    {group.days.map((day) => {
                      const isSelected = selectedDate === day.dateStr;
                      const isUnavailable = unavailableDays.has(day.dateStr);
                      return (
                        <button
                          key={day.dateStr}
                          onClick={() => !isUnavailable && handleSelectDate(day.dateStr)}
                          disabled={isUnavailable}
                          title={isUnavailable ? 'Sem horários disponíveis neste dia' : undefined}
                          className={`flex flex-col items-center justify-center py-3.5 px-2.5 rounded-xl text-center transition-all border ${
                            isUnavailable
                              ? 'bg-gray-50 border-gray-100 text-gray-300 line-through cursor-not-allowed'
                              : isSelected
                                ? 'bg-[var(--brand)] border-[var(--brand)] text-white shadow-md cursor-pointer'
                                : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 cursor-pointer'
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
              ))}
            </div>

            {/* Legenda: explica o que são as datas riscadas (só aparece se houver alguma) */}
            {unavailableDays.size > 0 && (
              <p className="text-[11px] text-gray-450 flex items-center gap-1.5">
                <span className="text-gray-300 line-through font-bold">00</span>
                <span>As datas riscadas não têm horários disponíveis para o serviço escolhido.</span>
              </p>
            )}
          </div>
        )}

        {/* ETAPA 3: Selecionar Horário */}
        {step === 3 && selectedService && selectedDate && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[var(--brand)] transition-colors cursor-pointer"
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
                <div className="w-8 h-8 border-4 border-[var(--brand)] border-t-transparent rounded-full animate-spin"></div>
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
                      className={`py-3 px-2 text-center text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                        !slot.isAvailable
                          ? 'bg-gray-50 text-gray-300 border-gray-150 line-through cursor-not-allowed'
                          : isSelected
                            ? 'bg-[var(--brand-2)] border-[var(--brand-2)] text-[var(--brand)] shadow-sm font-black'
                            : 'bg-white hover:border-[var(--brand)] text-gray-700 border-gray-200'
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

            {/* Entrada na lista de espera */}
            <div className="text-center pt-1">
              <button
                onClick={openWaitlist}
                className="text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer"
              >
                Não encontrou um horário? Entre na lista de espera
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 4: Dados da Cliente */}
        {step === 4 && selectedService && selectedDate && selectedTime && (
          <div className="space-y-6">
            <button 
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[var(--brand)] transition-colors cursor-pointer"
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
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
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
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Seu E-mail (Opcional)
                  </label>
                  <input
                    type="email"
                    placeholder="Ex: juliana@email.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Aniversário (Opcional)
                  </label>
                  <input
                    type="date"
                    value={clientBirthday}
                    onChange={(e) => setClientBirthday(e.target.value)}
                    className="block w-full px-3 py-3 border border-gray-200 rounded-xl text-xs text-gray-600 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
                  />
                </div>
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
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 focus:border-[var(--brand)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento (Opcional)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                      className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition-all text-left ${
                        paymentMethod === method
                          ? 'bg-[var(--brand)] text-white border-[var(--brand)]'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-[var(--brand)]/40'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-[var(--brand)] hover:opacity-95 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer mt-4"
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
              className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[var(--brand)] transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar para dados</span>
            </button>

            <div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">Revise os dados de agendamento</h2>
              <p className="text-xs text-gray-450 mt-1">Certifique-se de que tudo está correto antes de confirmar.</p>
            </div>

            <div className="bg-gray-50/60 border border-gray-200 rounded-2xl p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-gray-450 block font-bold">PROFISSIONAL</span>
                  <span className="font-bold text-gray-800">{professional.name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-gray-450 block font-bold">{selectedServices.length > 1 ? 'SERVIÇOS' : 'SERVIÇO'}</span>
                  <span className="font-bold text-gray-800">{servicesLabel} · {totalDuration} min</span>
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
                {paymentMethod && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-gray-450 block font-bold">FORMA DE PAGAMENTO</span>
                    <span className="font-bold text-gray-800">{paymentMethod}</span>
                  </div>
                )}
              </div>

              {settings?.show_price_public && (
                <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-[10px] text-gray-450 font-bold uppercase">VALOR DO ATENDIMENTO</span>
                  <span className="text-sm font-black text-gray-900">{formatPrice(totalCents)}</span>
                </div>
              )}
            </div>

            {settings?.requires_deposit && (
              <div className="bg-[#f7f3ee] border border-[var(--brand)]/20 rounded-2xl p-4 flex gap-3 text-xs">
                <Wallet className="h-5 w-5 shrink-0 text-[var(--brand)]" />
                <div>
                  <p className="font-bold text-[var(--brand)]">Este atendimento exige sinal</p>
                  <p className="text-[11px] mt-0.5 text-gray-600 leading-relaxed whitespace-pre-line">
                    {settings.deposit_instructions || 'Um sinal é necessário para confirmar a reserva. A profissional enviará as instruções pelo WhatsApp.'}
                  </p>
                </div>
              </div>
            )}

            {submitError && (
              <div className="bg-red-50 text-red-600 border border-red-200 rounded-2xl p-4 flex gap-3 text-xs">
                <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold">Horário indisponível</p>
                  <p className="text-[11px] mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* Captcha invisível (só aparece se NEXT_PUBLIC_TURNSTILE_SITE_KEY estiver configurada) */}
            <TurnstileWidget onVerify={setCaptchaToken} />

            <button
              onClick={handleConfirmBooking}
              disabled={isSubmitting}
              className="w-full py-4 bg-[var(--brand)] hover:opacity-95 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
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
            <div className="h-16 w-16 flex items-center justify-center rounded-3xl mb-2 bg-[var(--brand-2)]/25 text-[var(--brand)]">
              <CheckCircle2 className="h-10 w-10 text-[var(--brand)]" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-black tracking-tight text-[var(--brand)]">Agendamento Realizado!</h2>
              <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
                {settings?.confirmation_mode === 'manual' 
                  ? 'Seu agendamento foi solicitado com sucesso. A profissional recebeu suas informações e poderá confirmar pelo WhatsApp.'
                  : 'Seu horário foi reservado com sucesso. Em breve você receberá mais informações pelo WhatsApp.'}
              </p>
            </div>

            <div className="w-full bg-[#f7f3ee] border border-gray-200 rounded-2xl p-4 text-left text-xs space-y-3.5">
              <div>
                <span className="text-[9px] text-gray-400 block font-bold">PROFISSIONAL</span>
                <span className="font-bold text-gray-800">{professional.brand_name}</span>
              </div>
              <div>
                <span className="text-[9px] text-gray-400 block font-bold">{selectedServices.length > 1 ? 'SERVIÇOS' : 'SERVIÇO'}</span>
                <span className="font-bold text-gray-800">{servicesLabel}</span>
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
                {paymentMethod && (
                  <div className="col-span-2">
                    <span className="text-[9px] text-gray-400 block font-bold">PAGAMENTO</span>
                    <span className="font-bold text-gray-800">{paymentMethod}</span>
                  </div>
                )}
              </div>
            </div>

            {settings?.requires_deposit && (
              <div className="w-full bg-[#f7f3ee] border border-[var(--brand)]/20 rounded-2xl p-4 flex gap-3 text-xs text-left">
                <Wallet className="h-5 w-5 shrink-0 text-[var(--brand)]" />
                <div>
                  <p className="font-bold text-[var(--brand)]">Garanta sua reserva com o sinal</p>
                  <p className="text-[11px] mt-0.5 text-gray-600 leading-relaxed whitespace-pre-line">
                    {settings.deposit_instructions || 'Envie o sinal e o comprovante pelo WhatsApp para confirmar seu horário.'}
                  </p>
                </div>
              </div>
            )}

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

      {/* Modal: Lista de espera */}
      {showWaitlist && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWaitlist(false)} />
          <div className="relative bg-white w-full sm:max-w-md mx-0 sm:mx-4 rounded-t-3xl sm:rounded-3xl p-6 z-10 max-h-[92vh] overflow-y-auto safe-sheet shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Lista de espera</h3>
              <button onClick={() => setShowWaitlist(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400"><span className="sr-only">Fechar</span>✕</button>
            </div>

            {waitlistSent ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-10 w-10 mx-auto text-[var(--brand)]" />
                <p className="text-sm font-bold text-gray-800 mt-3">Você está na lista!</p>
                <p className="text-xs text-gray-450 mt-1">Se abrir um horário, entraremos em contato pelo seu WhatsApp.</p>
                <button onClick={() => setShowWaitlist(false)} className="mt-5 px-5 py-2.5 rounded-xl text-xs font-bold text-white" style={{ backgroundColor: 'var(--brand)' }}>Fechar</button>
              </div>
            ) : (
              <form onSubmit={submitWaitlist} className="space-y-3 mt-3">
                <p className="text-xs text-gray-450">Deixe seus dados e avisaremos assim que abrir um horário.</p>
                <input required value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder="Seu nome *"
                  className="block w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--brand)]" />
                <input required inputMode="tel" value={wlPhone} onChange={(e) => setWlPhone(e.target.value)} placeholder="WhatsApp (com DDD) *"
                  className="block w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--brand)]" />
                {selectedServices.length > 0 && (
                  <p className="text-[11px] text-gray-450">Serviço: <strong className="text-gray-700">{servicesLabel}</strong></p>
                )}
                <input value={wlPeriod} onChange={(e) => setWlPeriod(e.target.value)} placeholder="Dia ou período desejado (ex.: sábado, manhã)"
                  className="block w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--brand)]" />
                <input value={wlPref} onChange={(e) => setWlPref(e.target.value)} placeholder="Melhor horário / preferência (ex.: depois das 18h)"
                  className="block w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--brand)]" />
                <textarea value={wlNotes} onChange={(e) => setWlNotes(e.target.value)} rows={2} placeholder="Observação (opcional)"
                  className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[var(--brand)] resize-y" />
                <button type="submit" disabled={wlBusy}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: 'var(--brand)' }}>
                  {wlBusy ? 'Enviando…' : 'Entrar na lista de espera'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default BookingFlow;
