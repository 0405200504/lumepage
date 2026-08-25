import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { SalesPanel } from '@/components/dashboard/SalesPanel';
import { professionalCan } from '@/lib/subscription/guard';
import { UpgradeRequired } from '@/components/subscription/UpgradeRequired';

export const metadata = {
  title: 'Vendas | Lume',
  description: 'Relatórios de vendas, ticket médio e serviços mais vendidos.'
};

export default async function SalesPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  if (!(await professionalCan(professionalId, 'sales'))) return <UpgradeRequired capability="sales" professionalId={professionalId} />;

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
