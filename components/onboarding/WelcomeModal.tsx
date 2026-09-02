'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Smartphone,
  CalendarCheck, MessageSquare, DollarSign, X, Rocket, HeartHandshake,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { isDemo } from '@/lib/demo';

export const OPEN_WELCOME_EVENT = 'lume:open-welcome';
const STORAGE_PREFIX = 'lume_welcome_modal_v1';

interface WelcomeModalProps {
  firstName?: string;
  professionalId?: string;
  slug?: string;
  onStartChecklist?: () => void;
}

export function WelcomeModal({
  firstName,
  professionalId,
  slug,
  onStartChecklist,
}: WelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const storageKey = `${STORAGE_PREFIX}:${professionalId || 'anon'}`;

  // Primeiro contato: abre automaticamente se ainda não foi visto
  useEffect(() => {
    if (isDemo(professionalId)) {
      const t = setTimeout(() => setIsOpen(true), 400);
      return () => clearTimeout(t);
    }
    let seen = 'done';
    try {
      seen = localStorage.getItem(storageKey) || '';
    } catch {
      /* ignore */
    }
    if (seen !== 'done') {
      const t = setTimeout(() => setIsOpen(true), 400);
      return () => clearTimeout(t);
    }
  }, [storageKey, professionalId]);

  // Listener para reabertura manual
  useEffect(() => {
    const handleOpen = () => {
      setCurrentSlide(0);
      setIsOpen(true);
    };
    window.addEventListener(OPEN_WELCOME_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_WELCOME_EVENT, handleOpen);
  }, []);

  const handleClose = () => {
    if (!isDemo(professionalId)) {
      try {
        localStorage.setItem(storageKey, 'done');
      } catch {
        /* ignore */
      }
    }
    setIsOpen(false);
  };

  const handleStart = () => {
    handleClose();
    onStartChecklist?.();
  };

  const slides = [
    {
      badge: 'Bem-vinda à Lume! ✨',
      title: firstName ? `Oi, ${firstName}! Seu espaço digital está pronto` : 'Seu espaço digital está pronto',
      desc: 'Reunimos tudo o que você precisa para profissionalizar seus atendimentos, lotar a sua agenda e encantar suas clientes.',
      icon: HeartHandshake,
      color: 'bg-wine-50 text-wine-700 border-wine-200',
      illustration: (
        <div className="relative mx-auto w-full max-w-sm p-4 rounded-2xl bg-gradient-to-br from-wine-50 via-white to-n-50 border border-wine-100/80 shadow-inner flex flex-col items-center text-center">
          <div className="h-12 w-12 rounded-2xl bg-wine-700 text-white flex items-center justify-center shadow-md mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-[13px] font-bold text-heading">
            Mais tempo para você e menos estresse com agendamentos manuais
          </p>
          <span className="text-[11px] text-n-600 mt-1">
            Veja em 4 passos rápidos tudo o que a Lume faz por você.
          </span>
        </div>
      ),
    },
    {
      badge: '1. Sua Página na Bio 📱',
      title: 'Um site profissional pronto em minutos',
      desc: 'Crie uma página exclusiva com suas fotos, especialidades e serviços. Suas clientes escolhem o horário sozinhas pelo celular.',
      icon: Smartphone,
      color: 'bg-rose-50 text-rose-700 border-rose-200',
      illustration: (
        <div className="p-3.5 rounded-2xl bg-n-50 border border-n-200 space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-wine-700 text-white flex items-center justify-center font-bold text-xs">
              {firstName?.[0] || 'L'}
            </div>
            <div className="text-left">
              <div className="text-[11px] font-bold text-heading">Página Personalizada</div>
              <div className="text-[9px] text-n-500">lume.app/agendar/{slug || 'seu-estudio'}</div>
            </div>
          </div>
          <div className="h-2 w-3/4 bg-n-200 rounded-full" />
          <div className="h-2 w-1/2 bg-n-200 rounded-full" />
        </div>
      ),
    },
    {
      badge: '2. Agenda Inteligente ⏰',
      title: 'Marcações automáticas sem furos nem conflitos',
      desc: 'Defina seus dias de atendimento e intervalos. Suas clientes agendam apenas nos horários em que você realmente está disponível.',
      icon: CalendarCheck,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
      illustration: (
        <div className="p-3.5 rounded-2xl bg-n-50 border border-n-200 flex items-center justify-around gap-2">
          <div className="text-center p-2 rounded-xl bg-white border border-n-200 shadow-2xs">
            <span className="text-[10px] text-n-500 block">09:00</span>
            <span className="text-[11px] font-bold text-emerald-700">Disponível</span>
          </div>
          <div className="text-center p-2 rounded-xl bg-wine-50 border border-wine-200 shadow-2xs">
            <span className="text-[10px] text-wine-600 block">14:30</span>
            <span className="text-[11px] font-bold text-wine-800">Agendado ✓</span>
          </div>
          <div className="text-center p-2 rounded-xl bg-white border border-n-200 shadow-2xs">
            <span className="text-[10px] text-n-500 block">16:00</span>
            <span className="text-[11px] font-bold text-emerald-700">Disponível</span>
          </div>
        </div>
      ),
    },
    {
      badge: '3. WhatsApp & Júlia 🤖',
      title: 'Lembretes automáticos e assistente que atende por você',
      desc: 'Reduza faltas com confirmações no WhatsApp e deixe a Júlia tirar dúvidas das suas clientes 24 horas por dia.',
      icon: MessageSquare,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      illustration: (
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5 text-left">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-900">
            <MessageSquare className="h-3.5 w-3.5 text-emerald-700" /> Júlia no WhatsApp:
          </div>
          <p className="text-[11px] text-emerald-950 bg-white p-2 rounded-xl border border-emerald-100 shadow-2xs">
            "Oi, Camila! Lembrete do seu horário amanhã às 14h com {firstName || 'a profissional'}. Confirma sua presença?"
          </p>
        </div>
      ),
    },
    {
      badge: '4. Controle Financeiro 💰',
      title: 'Saiba exatamente quanto você ganha sem planilhas',
      desc: 'Veja o total faturado no mês, entradas, saídas e procedimentos mais lucrativos em gráficos fáceis e intuitivos.',
      icon: DollarSign,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      illustration: (
        <div className="p-3.5 rounded-2xl bg-n-50 border border-n-200 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] text-n-500 block uppercase font-bold tracking-wider">Faturamento do Mês</span>
            <span className="text-[16px] font-bold text-heading">R$ 4.850,00</span>
          </div>
          <div className="h-8 px-2.5 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> +24% este mês
          </div>
        </div>
      ),
    },
  ];

  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const Icon = slide.icon;

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      title="Bem-vinda ao Lume"
      trail={['Início', `Visão Geral (${currentSlide + 1}/${slides.length})`]}
      className="max-w-lg"
      footer={
        <div className="flex items-center justify-between w-full select-none">
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  i === currentSlide ? 'w-6 bg-wine-700' : 'w-2 bg-n-200 hover:bg-n-400'
                }`}
                aria-label={`Slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentSlide > 0 && (
              <button
                type="button"
                onClick={() => setCurrentSlide(s => s - 1)}
                className="px-3 py-2 rounded-xl text-[12px] font-bold text-n-600 hover:bg-n-100 transition-colors cursor-pointer inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Voltar
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={() => setCurrentSlide(s => s + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Próximo <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStart}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-md cursor-pointer"
              >
                <Rocket className="h-4 w-4" /> Bora começar agora!
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 py-1 select-none text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider mx-auto" style={{}}>
          <span className={`px-2.5 py-0.5 rounded-full border ${slide.color} flex items-center gap-1.5`}>
            <Icon className="h-3.5 w-3.5" />
            {slide.badge}
          </span>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-h3 font-semibold text-heading leading-snug">
            {slide.title}
          </h3>
          <p className="text-body-sm text-n-600 max-w-md mx-auto leading-relaxed">
            {slide.desc}
          </p>
        </div>

        <div className="pt-2">
          {slide.illustration}
        </div>
      </div>
    </Modal>
  );
}
