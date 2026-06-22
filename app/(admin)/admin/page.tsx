import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { professionalMetrics, monthlySeries, statusCounts } from '@/lib/admin';
import { serviceRevenueCents } from '@/lib/finance';

export const metadata = { title: 'Visão Geral | Lume Admin' };

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  const professionals = await dbService.getProfessionals();
  const appointments = await dbService.getAllAppointments();
  const clients = await dbService.getAllClients();
  const storage = await dbService.getDatabaseStats();

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];

  const metrics = professionalMetrics(professionals, appointments, clients);
  const series = monthlySeries(appointments, todayISO, 6);
  const status = statusCounts(appointments);

  const totals = {
    revenueCents: metrics.reduce((s, m) => s + m.revenueCents, 0),
    monthRevenueCents: serviceRevenueCents(appointments, now.getFullYear(), now.getMonth()),
    appointments: appointments.filter(a => a.status !== 'cancelled').length,
    clients: clients.length,
    professionals: professionals.length,
    activeProfessionals: professionals.filter(p => p.status === 'active').length,
    pending: status.pending,
  };

  const profName: Record<string, string> = {};
  professionals.forEach(p => { profName[p.id] = p.brand_name || p.name; });
  const recent = appointments.slice(0, 8).map(a => ({
    id: a.id,
    client: a.client_name,
    service: a.service?.name || '',
    date: a.date,
    time: a.start_time,
    status: a.status,
    professional: profName[a.professional_id] || '—',
  }));

  return (
    <LayoutAdmin
      session={session}
      title="Painel Administrativo"
      subtitle="Visão consolidada de toda a rede Lume em tempo real."
    >
      <AdminOverview
        adminName={session.name}
        totals={totals}
        metrics={metrics}
        series={series}
        status={status}
        recent={recent}
        storage={storage}
      />
    </LayoutAdmin>
  );
}
