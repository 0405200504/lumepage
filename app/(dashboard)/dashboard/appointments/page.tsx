import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
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
    <LayoutDashboard 
      session={session} 
      title="Gestão de Agendamentos" 
      subtitle="Acompanhe, aprove e gerencie os horários agendados pelos seus clientes finais."
    >
      <AppointmentsList 
        initialAppointments={appointments} 
        professionalId={professionalId} 
        settings={settings}
      />
    </LayoutDashboard>
  );
}
