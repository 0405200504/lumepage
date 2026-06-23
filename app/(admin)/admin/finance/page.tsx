import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { AdminFinance } from '@/components/admin/AdminFinance';
import { professionalMetrics, monthlySeries } from '@/lib/admin';
import { serviceRevenueCents } from '@/lib/finance';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';

export const metadata = { title: 'Financeiro | Lume Admin' };

export default async function AdminFinancePage() {
  const session = await requireAdmin();
  const allProfessionals = await dbService.getProfessionals();
  const allAppointments = await dbService.getAllAppointments();
  const allClients = await dbService.getAllClients();
  const allTransactions = await dbService.getAllTransactions();

  // Exclui a conta teste (Amanda) dos dados do super admin
  const professionals = allProfessionals.filter(p => p.id !== DEMO_PROFESSIONAL_ID);
  const appointments = allAppointments.filter(a => a.professional_id !== DEMO_PROFESSIONAL_ID);
  const clients = allClients.filter(c => c.professional_id !== DEMO_PROFESSIONAL_ID);
  const transactions = allTransactions.filter(t => t.professional_id !== DEMO_PROFESSIONAL_ID);

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
