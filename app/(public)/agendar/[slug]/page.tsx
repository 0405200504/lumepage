import React from 'react';
import { getBookingData } from '@/app/actions/booking';
import { BookingFlow } from '@/components/booking/BookingFlow';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ embed?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const res = await getBookingData(slug);
  if (res.success && res.professional) {
    return {
      title: `Agendar com ${res.professional.brand_name} | Lume Agenda`,
      description: `Agende seu horário com ${res.professional.brand_name} em poucos segundos de forma simples e rápida.`
    };
  }
  return {
    title: 'Profissional não encontrada | Lume Agenda'
  };
}

export default async function BookingPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === 'true';
  const res = await getBookingData(slug);

  if (!res.success || !res.professional || !res.services) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#efe9e6] shadow-xl text-center flex flex-col items-center">
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight">Página não encontrada</h2>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            {res.error || 'A profissional que você está procurando não existe, foi pausada ou cancelada temporariamente pela plataforma.'}
          </p>
          <Link
            href="/"
            className="mt-6 px-6 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  if (isEmbed) {
    return (
      <div className="w-full min-h-screen bg-white">
        <BookingFlow
          professional={res.professional}
          services={res.services}
          settings={res.settings || null}
          isEmbed={true}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] flex flex-col items-center select-none py-6 sm:py-12 px-4">
      {/* Container Principal */}
      <div className="max-w-2xl w-full bg-white rounded-4xl border border-[#efe9e6] shadow-xl overflow-hidden flex flex-col">
        <BookingFlow
          professional={res.professional}
          services={res.services}
          settings={res.settings || null}
          isEmbed={false}
        />
      </div>
    </div>
  );
}
