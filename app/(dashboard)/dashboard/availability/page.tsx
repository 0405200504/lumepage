import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor';

export const metadata = {
  title: 'Disponibilidade Semanal | Lume Agenda Dashboard',
  description: 'Defina os dias da semana em que você atende, horários de expediente e buffers de intervalo.'
};

export default async function DashboardAvailabilityPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const rules = await dbService.getAvailabilityRulesByProfessional(professionalId);

  return (
    <LayoutDashboard 
      session={session} 
      title="Disponibilidade Semanal" 
      subtitle="Configure o seu horário de funcionamento regular e intervalo de almoço para cada dia da semana."
    >
      <AvailabilityEditor initialRules={rules} professionalId={professionalId} />
    </LayoutDashboard>
  );
}
