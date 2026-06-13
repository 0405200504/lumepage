import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { ClientsList } from '@/components/dashboard/ClientsList';

export const metadata = {
  title: 'Minhas Clientes | Lume Agenda Dashboard',
  description: 'Fichário de clientes com históricos de agendamentos acumulados e atalhos de contato rápido.'
};

export default async function DashboardClientsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const clients = await dbService.getClientsByProfessional(professionalId);
  const appointments = await dbService.getAppointmentsByProfessional(professionalId);

  return <ClientsList professionalId={professionalId} initialClients={clients} appointments={appointments} />;
}
