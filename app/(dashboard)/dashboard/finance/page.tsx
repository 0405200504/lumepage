import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutDashboard } from '@/components/layout/LayoutDashboard';
import { FinancePanel } from '@/components/dashboard/FinancePanel';

export const metadata = {
  title: 'Contas | Lume',
  description: 'Controle financeiro 360: entradas, saídas, lucro e saldo do seu negócio.'
};

export default async function FinancePage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;

  const transactions = await dbService.getTransactionsByProfessional(professionalId);
  const appointments = await dbService.getAppointmentsByProfessional(professionalId);
  const fixedExpenses = await dbService.getFixedExpensesByProfessional(professionalId);

  return (
    <LayoutDashboard
      session={session}
      title="Contas"
      subtitle="Seu controle financeiro completo: o que entrou, o que saiu, lucro e quanto sobrou."
    >
      <FinancePanel
        professionalId={professionalId}
        transactions={transactions}
        appointments={appointments}
        fixedExpenses={fixedExpenses}
      />
    </LayoutDashboard>
  );
}
