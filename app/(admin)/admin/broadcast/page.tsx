import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, SISTEMA_NAV } from '@/components/admin/SubNav';
import { BroadcastComposer } from '@/components/admin/BroadcastComposer';
import { listNoticesAction } from '@/app/actions/admin-system';

export const metadata = { title: 'Avisos | Lume Admin' };

export default async function AdminBroadcastPage() {
  const session = await requireAdmin();
  const { notices, available } = await listNoticesAction();

  return (
    <LayoutAdmin
      session={session}
      title="Avisos"
      subtitle="Publique um recado no painel das profissionais, por público, com prévia e histórico."
    >
      <div className="space-y-4">
        <SubNav items={SISTEMA_NAV} />
        <BroadcastComposer notices={notices} available={available} />
      </div>
    </LayoutAdmin>
  );
}
