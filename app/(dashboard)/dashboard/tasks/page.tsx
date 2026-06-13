import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { TasksWidget } from '@/components/dashboard/TasksWidget';

export const metadata = {
  title: 'Tarefas & Notas | Lume Agenda',
  description: 'Bloco de notas e tarefas. Com data, a tarefa aparece na sua Agenda.',
};

export default async function TasksPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;
  const tasks = await dbService.getTasksByProfessional(professionalId);

  return <TasksWidget professionalId={professionalId} initialTasks={tasks} />;
}
