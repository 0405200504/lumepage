import React from 'react';
import Link from 'next/link';
import { dbService } from '@/lib/supabase/db';
import { CheckCircle2, Calendar, Clock, MessageSquare, ArrowRight, MessageCircle } from 'lucide-react';

interface SuccessPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ appId?: string }>;
}

export default async function BookingSuccessPage({ params, searchParams }: SuccessPageProps) {
  const { slug } = await params;
  const { appId } = await searchParams;

  const appointment = appId ? await dbService.getAppointmentById(appId) : null;

  if (!appointment) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#efe9e6] shadow-xl text-center flex flex-col items-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mb-4" />
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Agendamento Realizado!</h2>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            Seu agendamento foi efetuado. Contudo, as informações detalhadas não puderam ser exibidas na tela no momento.
          </p>
          <Link
            href={`/agendar/${slug}`}
            className="mt-6 px-6 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Novo Agendamento
          </Link>
        </div>
      </div>
    );
  }

  const { service, professional } = appointment;
  const dateObj = new Date(`${appointment.date}T12:00:00`);
  const formattedDate = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Criar link do WhatsApp para notificar a profissional se o cliente desejar acelerar a confirmação
  const message = `Oi, ${professional?.name}! Acabei de fazer um agendamento de ${service?.name} para o dia ${dateObj.toLocaleDateString('pt-BR')} às ${appointment.start_time.substring(0, 5)} pelo Lume Agenda.`;
  const cleanPhone = professional?.whatsapp.replace(/\D/g, '') || '';
  const waUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center py-6 sm:py-12 px-4 select-none">
      <div className="max-w-md w-full bg-white rounded-4xl border border-[#efe9e6] shadow-2xl p-6 md:p-8 flex flex-col items-center text-center">
        
        {/* Ícone de Sucesso */}
        <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mb-5 border border-emerald-100">
          <CheckCircle2 className="h-8 w-8" />
        </div>

        <h1 className="text-xl md:text-2xl font-black text-forest tracking-tight">Agendamento Confirmado!</h1>
        <p className="text-xs text-gray-450 mt-1 max-w-xs leading-relaxed">
          Seu horário foi reservado e enviado para a profissional. Salve as informações abaixo.
        </p>

        {/* Informações Resumidas do Agendamento */}
        <div className="w-full bg-[#f7f3ee] border border-gray-200 rounded-3xl p-5 my-6 text-left space-y-4 text-xs">
          <div>
            <span className="text-[10px] text-gray-400 block font-bold">PROFISSIONAL</span>
            <span className="font-bold text-gray-800 text-sm">{professional?.brand_name}</span>
          </div>

          <div>
            <span className="text-[10px] text-gray-400 block font-bold">SERVIÇO</span>
            <span className="font-bold text-gray-800 text-sm">{service?.name}</span>
            <span className="text-gray-450 block text-[10px] mt-0.5">{service?.duration_minutes} minutos de duração</span>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-200/50">
            <div className="flex-1">
              <span className="text-[10px] text-gray-400 block font-bold flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>DATA</span>
              </span>
              <span className="font-bold text-gray-800 capitalize mt-0.5 block">{formattedDate}</span>
            </div>
            <div className="shrink-0 pl-3 border-l border-gray-200/50">
              <span className="text-[10px] text-gray-400 block font-bold flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>HORÁRIO</span>
              </span>
              <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                {appointment.start_time.substring(0, 5)}
              </span>
            </div>
          </div>

          {appointment.notes && (
            <div className="pt-3 border-t border-gray-200/50">
              <span className="text-[10px] text-gray-400 block font-bold flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>SUAS ANOTAÇÕES</span>
              </span>
              <p className="text-gray-500 italic mt-1 leading-relaxed">"{appointment.notes}"</p>
            </div>
          )}
        </div>

        {/* Ações pós-agendamento */}
        <div className="w-full space-y-2.5">
          <a
            href={waUrl}
            target="_blank"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            <span>Falar com Profissional</span>
          </a>

          <Link
            href={`/agendar/${slug}`}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-250 transition-colors"
          >
            <span>Fazer outro Agendamento</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
