import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { EmptyState } from '@/components/admin/primitives';
import { MergeGroupCard } from '@/components/admin/ClientTools';
import { listDuplicateClients, professionalOptions } from '@/lib/admin/queries';

export const metadata = { title: 'Clientes duplicadas | Lume Admin' };

export default async function DuplicateClientsPage() {
  const session = await requireAdmin();
  const options = await professionalOptions();
  const groups = await listDuplicateClients(new Map(options.map(o => [o.value, o.label])));

  return (
    <LayoutAdmin
      session={session}
      title="Clientes duplicadas"
      subtitle="Mesmo telefone, cadastros diferentes. Escolha qual fica e funda o resto: o histórico vai junto."
      backHref="/admin/clients"
      backLabel="Clientes"
    >
      {groups.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<CheckCircle2 className="text-success" />}
            title="Nenhuma duplicata encontrada"
            description="A comparação usa o telefone padronizado (55+DDD+número). Se ainda houver cadastros com formatos diferentes, rode “Padronizar telefones” na lista de clientes."
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map(g => (
            <MergeGroupCard key={`${g.professionalId}-${g.phoneKey}`} phoneKey={g.phoneKey} professionalName={g.professionalName} clients={g.clients} />
          ))}
        </div>
      )}
    </LayoutAdmin>
  );
}
