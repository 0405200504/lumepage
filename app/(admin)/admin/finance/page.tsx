import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminFinance } from '@/components/admin/AdminFinance';
import { professionalMetrics, monthlySeries } from '@/lib/admin';
import { serviceRevenueCents } from '@/lib/finance';

export const metadata = { title: 'Financeiro | Lume Admin' };

export default async function AdminFinancePage() {
  const session = await requireAdmin();
  const professionals = await dbService.getProfessionals();
  const appointments = await dbService.getAllAppointments();
  const clients = await dbService.getAllClients();
  const transactions = await dbService.getAllTransactions();

  const now = new Date();
  const todayISO = now.toISOString().split('T')[0];

  const metrics = professionalMetrics(professionals, appointments, clients);
  const series = monthlySeries(appointments, todayISO, 6);

  const totalRevenue = metrics.reduce((s, m) => s + m.revenueCents, 0);
  const monthRevenue = serviceRevenueCents(appointments, now.getFullYear(), now.getMonth());
  const billableCount = appointments.filter(a => ['completed', 'confirmed'].includes(a.status)).length;
  const avgTicket = billableCount ? Math.round(totalRevenue / billableCount) : 0;
  const manualIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount_cents, 0);
  const manualExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount_cents, 0);

  return (
    <LayoutAdmin session={session} title="Financeiro da Rede" subtitle="Faturamento consolidado e desempenho financeiro por profissional.">
      <AdminFinance
        totals={{ totalRevenue, monthRevenue, avgTicket, billableCount, manualIncome, manualExpense }}
        metrics={metrics}
        series={series}
      />
    </LayoutAdmin>
  );
}
