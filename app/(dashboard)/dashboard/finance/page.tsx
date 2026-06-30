import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { FinancePanel } from '@/components/dashboard/FinancePanel';
import { PerformancePanel } from '@/components/dashboard/PerformancePanel';

export const metadata = {
  title: 'Contas | Lume',
  description: 'Controle financeiro 360: entradas, saídas, lucro e saldo do seu negócio.'
};

export default async function FinancePage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const [transactions, appointments, fixedExpenses, services] = await Promise.all([
    dbService.getTransactionsByProfessional(professionalId),
    dbService.getAppointmentsByProfessional(professionalId),
    dbService.getFixedExpensesByProfessional(professionalId),
    dbService.getServicesByProfessional(professionalId),
  ]);

  return (
    <div className="space-y-6">
      <PerformancePanel
        appointments={appointments}
        services={services}
        transactions={transactions}
      />
      <FinancePanel
        professionalId={professionalId}
        transactions={transactions}
        appointments={appointments}
        fixedExpenses={fixedExpenses}
        services={services}
      />
    </div>
  );
}
