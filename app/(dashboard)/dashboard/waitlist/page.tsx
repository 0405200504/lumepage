import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WaitlistPanel } from '@/components/dashboard/WaitlistPanel';
import { professionalCan } from '@/lib/subscription/guard';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Lista de Espera | Lume Agenda',
  description: 'Gerencie as clientes que aguardam um horário e crie encaixes a partir das solicitações.'
};

export default async function WaitlistPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'waitlist'))) return <UpgradeRequired capability="waitlist" />;

  const [entries, services] = await Promise.all([
    dbService.getWaitlistByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
  ]);

  return <WaitlistPanel professionalId={professionalId} initialEntries={entries} services={services} />;
}
