import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { ClientsList } from '@/components/dashboard/ClientsList';

export const metadata = {
  title: 'Minhas Clientes | Lume Agenda Dashboard',
  description: 'Fichário de clientes com históricos de agendamentos acumulados e atalhos de contato rápido.'
};

export default async function DashboardClientsPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const clients = await dbService.getClientsByProfessional(professionalId);

  return (
    <LayoutDashboard 
      session={session} 
      title="Carteira de Clientes" 
      subtitle="Gerencie sua ficha de clientes frequentes e acesse o histórico de atendimento acumulado."
    >
      <ClientsList initialClients={clients} />
    </LayoutDashboard>
  );
}
