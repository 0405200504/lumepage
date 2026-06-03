import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { TimeBlocksList } from '@/components/dashboard/TimeBlocksList';

export const metadata = {
  title: 'Bloqueios de Agenda | Lume Agenda Dashboard',
  description: 'Bloqueie dias ou faixas de horários específicos para folgas, feriados ou compromissos externos.'
};

export default async function DashboardBlocksPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const blocks = await dbService.getTimeBlocksByProfessional(professionalId);

  return (
    <LayoutDashboard 
      session={session} 
      title="Bloqueio de Horários" 
      subtitle="Feche dias específicos ou horas do expediente para folgas, imprevistos ou atendimentos externos."
    >
      <TimeBlocksList initialBlocks={blocks} professionalId={professionalId} />
    </LayoutDashboard>
  );
}
