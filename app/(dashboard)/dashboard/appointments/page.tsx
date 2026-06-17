import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { AppointmentsList } from '@/components/dashboard/AppointmentsList';

export const metadata = {
  title: 'Gerenciar Agendamentos | Lume Agenda Dashboard',
  description: 'Visualize a lista de atendimentos futuros, pendentes, confirmados e finalize ou cancele horários.'
};

export default async function DashboardAppointmentsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [appointments, settings, services, clients] = await Promise.all([
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getSettingsByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
    dbService.getClientsByProfessional(professionalId),
  ]);

  return (
    <AppointmentsList
      initialAppointments={appointments}
      professionalId={professionalId}
      settings={settings}
      services={services}
      clients={clients}
    />
  );
}
