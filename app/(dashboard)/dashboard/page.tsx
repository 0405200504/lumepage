import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { TasksWidget } from '@/components/dashboard/TasksWidget';

import { PushNotificationBanner } from '@/components/dashboard/PushNotificationBanner';

export const metadata = {
  title: 'Visão Geral | Lume Agenda Dashboard',
  description: 'Acompanhe seus agendamentos de hoje, faturamento acumulado e configurações comerciais.'
};

export default async function DashboardPage() {
  // Garante autenticação de profissional
  const session = await requireProfessional();
  
  const professionalId = session.professional_id!;
  
  // Buscar dados
  const professional = await dbService.getProfessionalById(professionalId);
  const appointments = await dbService.getAppointmentsByProfessional(professionalId);
  const services = await dbService.getServicesByProfessional(professionalId);
  const tasks = await dbService.getTasksByProfessional(professionalId);

  return (
    <LayoutDashboard
      session={session}
      title="Início"
      subtitle="Acompanhe suas estatísticas operacionais de hoje e os próximos atendimentos marcados."
    >
      <div className="space-y-6">
        <PushNotificationBanner />
        
        {/* No mobile, Tarefas/Notas tem aba própria (bottom nav → Tarefas).
            No desktop, continua aqui na Início. */}
        <div className="hidden lg:block">
          <TasksWidget professionalId={professionalId} initialTasks={tasks} />
        </div>
        <DashboardOverview
          professionalName={session.name}
          brandName={professional?.brand_name || session.name}
          slug={professional?.slug || ''}
          appointments={appointments}
          services={services}
        />
      </div>
    </LayoutDashboard>
  );
}
