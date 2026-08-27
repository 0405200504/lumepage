import React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
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
      subtitle="Mesmo telefone, cadastros diferentes. Escolha qual fica e funda o resto — o histórico vai junto."
      actions={
        <Link href="/admin/clients" className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-caption font-bold text-ink hover:bg-surface-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
      }
    >
      {groups.length === 0 ? (
        <div className="card py-16 flex flex-col items-center text-center">
          <CheckCircle2 className="h-8 w-8 text-success mb-3" aria-hidden />
          <h2 className="text-label font-bold text-ink">Nenhuma duplicata encontrada</h2>
          <p className="mt-1 text-caption text-muted max-w-sm">
            A comparação usa o telefone padronizado (55+DDD+número). Se ainda houver cadastros
            com formatos diferentes, rode “Padronizar telefones” na lista de clientes.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {groups.map(g => (
            <MergeGroupCard key={`${g.professionalId}-${g.phoneKey}`} phoneKey={g.phoneKey}
              professionalName={g.professionalName} clients={g.clients} />
          ))}
        </div>
      )}
    </LayoutAdmin>
  );
}
