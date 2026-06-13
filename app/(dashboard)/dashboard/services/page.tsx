import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { ServicesList } from '@/components/dashboard/ServicesList';

export const metadata = {
  title: 'Catálogo de Serviços | Lume Agenda Dashboard',
  description: 'Cadastre e edite procedimentos, tempos de atendimento e valores exibidos para os clientes.'
};

export default async function DashboardServicesPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const services = await dbService.getServicesByProfessional(professionalId);

  return <ServicesList initialServices={services} professionalId={professionalId} />;
}
