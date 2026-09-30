import React from 'react';
import Link from 'next/link';
import { UserCircle, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { NormalizePhonesButton, RenameClientButton } from '@/components/admin/ClientTools';
import { Badge } from '@/components/admin/badges';
import { Notice } from '@/components/admin/primitives';
import { textLink } from '@/components/admin/ui';
import { listClients, professionalOptions, ClientRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, formatDateBR } from '@/lib/format';

export const metadata = { title: 'Clientes | Lume Admin' };

const BASE = '/admin/clients';

export default async function AdminClientsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['prof'], defaultSort: 'name', defaultDir: 'asc' });

  const options = await professionalOptions();
  const profNames = new Map(options.map(o => [o.value, o.label]));
  const { rows, total, duplicateGroups } = await listClients(params, profNames);

  const columns: ServerColumn<ClientRow>[] = [
    {
      key: 'name', header: 'Cliente', sortable: true, primary: true,
      cell: r => (
        <span className="flex items-center gap-2 min-w-0">
          <span className="min-w-0">
            <span className="block font-semibold text-heading truncate">{r.name}</span>
            <span className="block text-caption text-n-500 num truncate">{r.whatsapp}{r.email ? ` · ${r.email}` : ''}</span>
          </span>
          {r.namelessy && <Badge tone="warn" title="O nome cadastrado é o próprio telefone">sem nome</Badge>}
        </span>
      ),
    },
    { key: 'prof', header: 'Conta', cell: r => <span className="text-caption text-n-500 truncate">{r.professionalName}</span> },
    { key: 'visits', header: 'Visitas', sortable: true, numeric: true, cell: r => r.visits },
    { key: 'noshow', header: 'Faltas', numeric: true, cell: r => r.noShows > 0 ? <span className="text-danger font-semibold">{r.noShows}</span> : <span className="text-n-400">0</span> },
    { key: 'spent', header: 'Total gasto', numeric: true, cell: r => <span className="font-semibold text-heading">{brl(r.spentCents)}</span> },
    { key: 'last', header: 'Última visita', sortable: true, cell: r => <span className="text-caption text-n-500 num">{formatDateBR(r.lastVisit, 'nunca')}</span> },
    { key: 'created', header: 'Cadastro', menuLabel: 'Cadastro', sortable: true, hideOnMobile: true, cell: r => <span className="text-caption text-n-500 num">{formatDateBR(r.createdAt)}</span> },
    { key: 'fix', header: <span className="sr-only">Corrigir</span>, align: 'right', hideOnMobile: true, cell: r => r.namelessy ? <RenameClientButton id={r.id} current={r.name} /> : null },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Clientes"
      subtitle="A base de clientes de todas as contas, com gasto, faltas e duplicatas."
      actions={<><NormalizePhonesButton /><ExportCsvButton dataset="clients" label="Exportar CSV" /></>}
    >
      <div className="space-y-4">
        {duplicateGroups > 0 && (
          <Notice tone="warn" icon={<AlertTriangle />} action={<Link href="/admin/clients/duplicates" className={textLink}>Revisar e unificar</Link>}>
            <strong>{duplicateGroups} grupo(s) de clientes duplicadas</strong> — mesmo telefone, cadastros diferentes.
          </Notice>
        )}

        <ServerTable
          columns={columns}
          rows={rows}
          rowKey={r => r.id}
          total={total}
          params={params}
          basePath={BASE}
          searchParams={raw}
          rowHref={r => `${BASE}/${r.id}`}
          caption="Clientes de toda a rede com histórico de visitas e gastos"
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput basePath={BASE} placeholder="Nome, telefone ou e-mail…" className="w-full sm:w-72" />
              <FilterSelect basePath={BASE} name="prof" label="Conta" allLabel="Todas as contas" options={options} />
              <ClearFilters basePath={BASE} keys={['q', 'prof', 'range', 'from', 'to']} />
              <span className="ml-auto text-caption text-n-500 num">{total.toLocaleString('pt-BR')} cliente(s)</span>
            </div>
          }
          empty={{ title: 'Nenhuma cliente encontrada', description: 'Ajuste a busca ou o filtro de conta.', icon: <UserCircle /> }}
        />
      </div>
    </LayoutAdmin>
  );
}
