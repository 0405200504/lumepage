import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { AgendaCalendar } from '@/components/dashboard/AgendaCalendar';

export const metadata = {
  title: 'Agenda | Lume',
  description: 'Visualize seus agendamentos por ano, mês e semana, com feriados nacionais em destaque.'
};

export default async function AgendaPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const appointments = await dbService.getAppointmentsByProfessional(professionalId);
  const settings = await dbService.getSettingsByProfessional(professionalId);
  const timeBlocks = await dbService.getTimeBlocksByProfessional(professionalId);
  const tasks = await dbService.getTasksByProfessional(professionalId);

  return (
    <AgendaCalendar
      appointments={appointments}
      timeBlocks={timeBlocks}
      reminderTemplate={settings?.whatsapp_confirmation_message || ''}
      professionalId={professionalId}
      initialTasks={tasks}
    />
  );
}
