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
      <div className="min-h-screen bg-n-25 flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-n-200 shadow-xl text-center flex flex-col items-center">
          <div className="p-4 bg-danger-bg text-danger rounded-2xl mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-n-900 tracking-tight">Página não encontrada</h2>
          <p className="mt-2 text-xs text-n-500 leading-relaxed">
            {res.error || 'A profissional que você está procurando não existe, foi pausada ou cancelada temporariamente pela plataforma.'}
          </p>
          <Link
            href="/"
            className="mt-6 px-6 py-2.5 bg-wine-700 hover:bg-wine-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
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
    <div className="min-h-screen bg-n-50 flex flex-col items-center select-none py-6 sm:py-12 px-4">
      {/* Container Principal */}
      <div className="max-w-2xl w-full bg-white rounded-4xl border border-n-200 shadow-xl overflow-hidden flex flex-col">
        <BookingFlow
          professional={res.professional}
          services={res.services}
          settings={res.settings || null}
          isEmbed={false}
        />
      </div>

      {/* Rodapé legal (Termos/Privacidade) oculto até ter CNPJ — basta reativar
          este bloco quando os documentos forem preenchidos:
          <footer className="mt-6 text-[11px] text-n-400 flex items-center gap-3">
            <Link href="/termos">Termos de Uso</Link> · <Link href="/privacidade">Política de Privacidade</Link>
          </footer> */}
    </div>
  );
}
