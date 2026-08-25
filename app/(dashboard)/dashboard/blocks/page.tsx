import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { TimeBlocksList } from '@/components/dashboard/TimeBlocksList';
import { professionalCan } from '@/lib/subscription/guard';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Bloqueios de Agenda | Lume Agenda Dashboard',
  description: 'Bloqueie dias ou faixas de horários específicos para folgas, feriados ou compromissos externos.'
};

export default async function DashboardBlocksPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'blocks'))) return <UpgradeRequired capability="blocks" professionalId={professionalId} />;

  const blocks = await dbService.getTimeBlocksByProfessional(professionalId);

  return <TimeBlocksList initialBlocks={blocks} professionalId={professionalId} />;
}
