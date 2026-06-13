import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { SettingsForm } from '@/components/dashboard/SettingsForm';

export const metadata = {
  title: 'Configurações de Perfil e Agenda | Lume Agenda Dashboard',
  description: 'Gerencie seus dados de contato, redes sociais, avisos prévios de agendamentos e paleta de cores.'
};

export default async function DashboardSettingsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const professional = await dbService.getProfessionalById(professionalId);
  const settings = await dbService.getSettingsByProfessional(professionalId);

  if (!professional) {
    return (
      <div className="bg-white border border-[#efe9e6] rounded-3xl p-8 text-center max-w-md mx-auto my-12">
        <p className="text-xs text-gray-500">Erro ao carregar dados do profissional.</p>
      </div>
    );
  }

  return <SettingsForm professional={professional} settings={settings} />;
}
