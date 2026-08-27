import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { PushNotificationBanner } from '@/components/dashboard/PushNotificationBanner';
import { NewAppointmentFab } from '@/components/dashboard/NewAppointmentFab';

export const metadata = {
  title: 'Início | Lume Agenda',
  description: 'Acompanhe seus agendamentos de hoje, faturamento acumulado e configurações comerciais.',
};

export default async function DashboardPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [professional, appointments, services, tasks, clients] = await Promise.all([
    dbService.getProfessionalById(professionalId),
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
    dbService.getTasksByProfessional(professionalId),
    dbService.getClientsByProfessional(professionalId).catch(() => []),
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <DashboardOverview
        professionalName={session.name}
        brandName={professional?.brand_name || session.name}
        slug={professional?.slug || ''}
        appointments={appointments}
        services={services}
      />

      {/* No celular, Tarefas tem destino próprio (menu "Mais" → Tarefas e notas). */}
      <div className="hidden lg:block">
        <TasksWidget professionalId={professionalId} initialTasks={tasks} />
      </div>

      {/* Os dois flutuam: nenhum empurra o conteúdo acima. */}
      <PushNotificationBanner />
      <NewAppointmentFab professionalId={professionalId} services={services} clients={clients} />
    </div>
  );
}
