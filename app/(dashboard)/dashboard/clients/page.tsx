import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { ClientsList } from '@/components/dashboard/ClientsList';

export const metadata = {
  title: 'Contatos | Lume',
  description: 'Gerencie seus contatos com histórico de atendimentos, aniversariantes e frequência de visitas.'
};

export default async function DashboardClientsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [clients, appointments] = await Promise.all([
    dbService.getClientsByProfessional(professionalId),
    dbService.getAppointmentsByProfessional(professionalId),
  ]);

  return <ClientsList professionalId={professionalId} initialClients={clients} appointments={appointments} />;
}
