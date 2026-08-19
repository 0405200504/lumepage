import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { NewProfessionalForm } from '@/components/admin/NewProfessionalForm';

export const metadata = { title: 'Cadastrar Profissional | Lume Admin' };

export default async function NewProfessionalPage() {
  const session = await requireAdmin();

  return (
    <LayoutAdmin
      session={session}
      title="Cadastrar Nova Profissional"
      subtitle="Insira os dados cadastrais da profissional de estética para ativar o sistema e o link público."
    >
      <NewProfessionalForm />
    </LayoutAdmin>
  );
}
