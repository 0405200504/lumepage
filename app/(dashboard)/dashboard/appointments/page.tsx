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

  const appointments = await dbService.getAppointmentsByProfessional(professionalId);
  const settings = await dbService.getSettingsByProfessional(professionalId);

  return (
    <AppointmentsList
      initialAppointments={appointments}
      professionalId={professionalId}
      settings={settings}
    />
  );
}
