import React from 'react';
import { dbService } from '@/lib/supabase/db';
import { AnamnesisFillForm } from '@/components/anamnesis/AnamnesisFillForm';
import { AlertCircle, CheckCircle2, FileDown } from 'lucide-react';

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { token } = await params;
  const response = await dbService.getAnamnesisResponseByToken(token).catch(() => null);
  if (response) {
    return {
      title: `${response.form_title} | Ficha de Anamnese`,
      description: 'Preencha sua ficha de anamnese de forma rápida e segura.',
      robots: { index: false, follow: false },
    };
  }
  return { title: 'Ficha não encontrada | Lume Agenda', robots: { index: false, follow: false } };
}

export default async function AnamnesisPublicPage({ params }: PageProps) {
  const { token } = await params;
  const response = token && token.length >= 16
    ? await dbService.getAnamnesisResponseByToken(token).catch(() => null)
    : null;

  if (!response) {
    return (
      <div className="min-h-screen bg-n-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-n-200 shadow-xl text-center flex flex-col items-center">
          <div className="p-4 bg-danger-bg text-danger rounded-2xl mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-n-900 tracking-tight">Ficha não encontrada</h2>
          <p className="mt-2 text-xs text-n-500 leading-relaxed">
            Este link de ficha não existe ou foi removido. Confira com a sua profissional se o link está correto.
          </p>
        </div>
      </div>
    );
  }

  const professional = await dbService.getProfessionalById(response.professional_id);
  const brandName = professional?.brand_name || professional?.name || 'Sua profissional';
  const accent = response.design_snapshot?.accent || '#8c2438';

  if (response.status === 'completed') {
    return (
      <div className="min-h-screen bg-n-50 flex flex-col items-center justify-center p-4 select-none">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-n-200 shadow-xl text-center flex flex-col items-center">
          <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: `${accent}14`, color: accent }}>
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-black text-n-900 tracking-tight">Ficha já preenchida ✨</h2>
          <p className="mt-2 text-xs text-n-500 leading-relaxed">
            Esta ficha já foi respondida e enviada para {brandName}. Você pode baixar a sua cópia em PDF abaixo.
          </p>
          <a
            href={`/api/anamnese/${response.token}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 text-white text-xs font-bold rounded-xl shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <FileDown className="h-4 w-4" />
            Baixar minha ficha em PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-n-50 flex flex-col items-center py-6 sm:py-12 px-4">
      <div className="max-w-2xl w-full">
        <AnamnesisFillForm
          token={response.token}
          brandName={brandName}
          formTitle={response.form_title}
          clientName={response.client_name}
          questions={response.questions_snapshot}
          design={response.design_snapshot}
        />
        <p className="text-center text-[10px] text-n-400 mt-6">
          Suas respostas são enviadas com segurança diretamente para {brandName}.
        </p>
      </div>
    </div>
  );
}
