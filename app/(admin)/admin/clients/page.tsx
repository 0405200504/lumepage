import React from 'react';
import Link from 'next/link';
import { UserCircle, Users2, AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { NormalizePhonesButton, RenameClientButton } from '@/components/admin/ClientTools';
import { Badge } from '@/components/admin/badges';
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
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="min-w-0">
            <span className="block font-semibold text-ink truncate">{r.name}</span>
            <span className="block text-caption text-muted num">{r.whatsapp}{r.email ? ` · ${r.email}` : ''}</span>
          </span>
          {r.namelessy && <Badge tone="warn" title="O nome cadastrado é o próprio telefone">sem nome</Badge>}
        </span>
      ),
    },
    { key: 'prof', header: 'Profissional', cell: r => <span className="text-caption text-muted truncate">{r.professionalName}</span> },
    { key: 'visits', header: 'Visitas', sortable: true, numeric: true, cell: r => r.visits },
    { key: 'noshow', header: 'Faltas', numeric: true, cell: r => r.noShows > 0 ? <span className="text-danger font-bold">{r.noShows}</span> : '0' },
    { key: 'spent', header: 'Total gasto', numeric: true, cell: r => brl(r.spentCents) },
    { key: 'last', header: 'Última visita', sortable: true, cell: r => <span className="text-caption text-muted num">{formatDateBR(r.lastVisit, 'nunca')}</span> },
    { key: 'created', header: 'Cadastro', sortable: true, hideOnMobile: true, cell: r => <span className="text-caption text-muted num">{formatDateBR(r.createdAt)}</span> },
    { key: 'fix', header: '', align: 'right', hideOnMobile: true, cell: r => r.namelessy ? <RenameClientButton id={r.id} current={r.name} /> : null },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Clientes da rede"
      subtitle="A base de clientes de todas as profissionais, com gasto, faltas e duplicatas."
      actions={<><NormalizePhonesButton /><ExportCsvButton dataset="clients" /></>}
    >
      <div className="space-y-4">
        {duplicateGroups > 0 && (
          <Link href="/admin/clients/duplicates" className="card px-4 py-3 flex items-center gap-2.5 text-caption hover:bg-surface-2 transition-colors">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0" aria-hidden />
            <span className="text-ink font-semibold">
              {duplicateGroups} grupo(s) de clientes duplicadas — mesmo telefone, cadastros diferentes.
            </span>
            <span className="ml-auto font-bold text-accent-link">Revisar e unificar →</span>
          </Link>
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
              <FilterSelect basePath={BASE} name="prof" label="Profissional" allLabel="Todas as profissionais" options={options} />
              <ClearFilters basePath={BASE} keys={['q', 'prof', 'range', 'from', 'to']} />
              <span className="ml-auto inline-flex items-center gap-1.5 text-caption text-muted">
                <Users2 className="h-3.5 w-3.5" /> {total.toLocaleString('pt-BR')} cliente(s)
              </span>
            </div>
          }
          empty={{ title: 'Nenhuma cliente encontrada', description: 'Ajuste a busca ou o filtro de profissional.', icon: <UserCircle className="h-8 w-8" /> }}
        />
      </div>
    </LayoutAdmin>
  );
}
