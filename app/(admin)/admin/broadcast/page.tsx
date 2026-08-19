import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';
import { listNoticesAction } from '@/app/actions/admin-system';

export const metadata = { title: 'Avisos | Lume Admin' };

export default async function AdminBroadcastPage() {
  const session = await requireAdmin();
  const { notices, available } = await listNoticesAction();

  return (
    <LayoutAdmin
      session={session}
      title="Avisos para a base"
      subtitle="Publique um recado no painel das profissionais — por público, com preview e histórico."
    >
      <BroadcastComposer notices={notices} available={available} />
    </LayoutAdmin>
  );
}
