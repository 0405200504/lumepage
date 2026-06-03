import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { EditProfessionalPanel } from '@/components/admin/EditProfessionalPanel';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: 'Editar Profissional | Lume Agenda Admin',
  description: 'Altere as configurações de cores, dados cadastrais e status de uma profissional cadastrada.'
};

export default async function AdminEditProfessionalPage({ params }: PageProps) {
  const session = await requireAdmin();
  const { id } = await params;

  const professional = await dbService.getProfessionalById(id);

  if (!professional) {
    return (
      <LayoutAdmin session={session} title="Profissional Não Encontrada">
        <div className="bg-white border border-[#e4e9e6] rounded-3xl p-8 text-center flex flex-col items-center max-w-md mx-auto my-12">
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-gray-800 tracking-tight">Registro não encontrado</h3>
          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            A profissional solicitada não existe ou foi excluída definitivamente da plataforma Lume Agenda.
          </p>
          <Link
            href="/admin/professionals"
            className="mt-6 px-5 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Voltar para listagem
          </Link>
        </div>
      </LayoutAdmin>
    );
  }

  return (
    <LayoutAdmin 
      session={session} 
      title={`Editar Cadastro: ${professional.name}`} 
      subtitle={`Altere informações administrativas, cores de identidade visual e dados de contato de ${professional.brand_name}.`}
    >
      <EditProfessionalPanel professional={professional} />
    </LayoutAdmin>
  );
}
