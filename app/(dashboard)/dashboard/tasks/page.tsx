import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { TasksWidget } from '@/components/dashboard/TasksWidget';

export const metadata = {
  title: 'Tarefas & Notas | Lume Agenda',
  description: 'Bloco de notas e tarefas. Com data, a tarefa aparece na sua Agenda.',
};

export default async function TasksPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;
  const tasks = await dbService.getTasksByProfessional(professionalId);

  return (
    <LayoutDashboard
      session={session}
      title="Tarefas & Notas"
      subtitle="Anote o que é importante. Com data e horário, a tarefa aparece na sua Agenda."
    >
      <TasksWidget professionalId={professionalId} initialTasks={tasks} />
    </LayoutDashboard>
  );
}
