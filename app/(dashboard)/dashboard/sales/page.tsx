import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { SalesPanel } from '@/components/dashboard/SalesPanel';

export const metadata = {
  title: 'Vendas | Lume',
  description: 'Relatórios de vendas, ticket médio e serviços mais vendidos.'
};

export default async function SalesPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [appointments, services] = await Promise.all([
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
  ]);

  return (
    <div className="space-y-6">
      <SalesPanel appointments={appointments} services={services} />
    </div>
  );
}
