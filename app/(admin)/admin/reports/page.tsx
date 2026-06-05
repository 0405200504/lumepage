import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminReports } from '@/components/admin/AdminReports';
import { professionalMetrics, monthlySeries, statusCounts, topServices } from '@/lib/admin';

export const metadata = { title: 'Relatórios | Lume Admin' };

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export default async function AdminReportsPage() {
  const session = await requireAdmin();
  const professionals = await dbService.getProfessionals();
  const appointments = await dbService.getAllAppointments();
  const clients = await dbService.getAllClients();

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];

  const metrics = professionalMetrics(professionals, appointments, clients);
  const apptSeries = monthlySeries(appointments, todayISO, 12);
  const status = statusCounts(appointments);
  const services = topServices(appointments, 6);

  // Novos clientes por mês (6 meses) a partir de created_at
  const newClients: { key: string; label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    let y = now.getFullYear(), m = now.getMonth() - i;
    while (m < 0) { m += 12; y--; }
    newClients.push({ key: `${y}-${m}`, label: MONTHS_SHORT[m], count: 0 });
  }
  const ncIdx: Record<string, { count: number }> = {};
  newClients.forEach(p => { ncIdx[p.key] = p; });
  for (const c of clients) {
    if (!c.created_at) continue;
    const d = new Date(c.created_at);
    const p = ncIdx[`${d.getFullYear()}-${d.getMonth()}`];
    if (p) p.count++;
  }

  const totalActive = appointments.filter(a => a.status !== 'cancelled').length;
  const noShowRate = totalActive ? Math.round((status.no_show / totalActive) * 100) : 0;
  const completionRate = totalActive ? Math.round((status.completed / totalActive) * 100) : 0;

  return (
    <LayoutAdmin session={session} title="Relatórios" subtitle="Indicadores e tendências de toda a operação Lume.">
      <AdminReports
        apptSeries={apptSeries}
        newClients={newClients}
        services={services}
        metrics={metrics}
        kpis={{ noShowRate, completionRate, totalActive, totalClients: clients.length }}
      />
    </LayoutAdmin>
  );
}
