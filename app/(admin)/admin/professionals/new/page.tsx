import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { NewProfessionalForm } from '@/components/admin/NewProfessionalForm';

export const metadata = { title: 'Nova conta | Lume Admin' };

export default async function NewProfessionalPage() {
  const session = await requireAdmin();

  return (
    <LayoutAdmin
      session={session}
      title="Nova conta"
      subtitle="Cadastre a profissional para liberar o painel e a página pública de agendamento."
      backHref="/admin/professionals"
      backLabel="Contas"
    >
      <NewProfessionalForm />
    </LayoutAdmin>
  );
}
