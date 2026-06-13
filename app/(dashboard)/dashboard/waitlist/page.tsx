import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { WaitlistPanel } from '@/components/dashboard/WaitlistPanel';

export const metadata = {
  title: 'Lista de Espera | Lume Agenda',
  description: 'Gerencie as clientes que aguardam um horário e crie encaixes a partir das solicitações.'
};

export default async function WaitlistPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [entries, services] = await Promise.all([
    dbService.getWaitlistByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
  ]);

  return <WaitlistPanel professionalId={professionalId} initialEntries={entries} services={services} />;
}
