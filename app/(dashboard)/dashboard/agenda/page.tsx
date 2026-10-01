import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { AgendaCalendar } from '@/components/dashboard/AgendaCalendar';

export const metadata = {
  title: 'Agenda | Lume',
  description: 'Visualize seus agendamentos por ano, mês e semana, com feriados nacionais em destaque.'
};

// ?data=YYYY-MM-DD abre a agenda nesse dia (a assistente de voz usa isso).
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const initialDate = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined;
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [appointments, settings, timeBlocks, tasks, services, clients, availabilityRules] = await Promise.all([
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getSettingsByProfessional(professionalId),
    dbService.getTimeBlocksByProfessional(professionalId),
    dbService.getTasksByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
    dbService.getClientsByProfessional(professionalId).catch(() => []),
    dbService.getAvailabilityRulesByProfessional(professionalId).catch(() => []),
  ]);

  return (
    <AgendaCalendar
      key={initialDate ?? 'hoje'}
      initialDate={initialDate}
      appointments={appointments}
      timeBlocks={timeBlocks}
      reminderTemplate={settings?.whatsapp_confirmation_message || ''}
      professionalId={professionalId}
      initialTasks={tasks}
      services={services}
      clients={clients}
      availabilityRules={availabilityRules}
    />
  );
}
