import React from 'react';
import { ScrollText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { Badge } from '@/components/admin/badges';
import { readAuditLog, AdminAuditRow } from '@/lib/audit';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { formatDateTimeBR } from '@/lib/format';

export const metadata = { title: 'Logs | Lume Admin' };

const BASE = '/admin/logs';

export default async function AdminLogsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['action', 'entity'] });

  const { rows, total } = await readAuditLog({
    action: params.filters.action,
    entityType: params.filters.entity,
    from: params.from ? `${params.from}T00:00:00` : undefined,
    to: params.to ? `${params.to}T23:59:59` : undefined,
    limit: params.pageSize,
    offset: (params.page - 1) * params.pageSize,
  });

  // A busca livre filtra a página carregada (o log é append-only e já vem recortado).
  const filtered = params.q
    ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(params.q.toLowerCase()))
    : rows;

  const columns: ServerColumn<AdminAuditRow>[] = [
    { key: 'when', header: 'Quando', primary: true, cell: r => <span className="tabular-nums text-xs text-ink">{formatDateTimeBR(r.created_at)}</span> },
    { key: 'admin', header: 'Quem', cell: r => <span className="text-xs text-muted truncate">{r.admin_email ?? '—'}</span> },
    { key: 'action', header: 'Ação', cell: r => <Badge tone="accent">{r.action}</Badge> },
    { key: 'entity', header: 'Alvo', cell: r => <span className="text-[11px] text-muted truncate">{r.entity_type}{r.entity_id ? ` · ${r.entity_id.slice(0, 12)}…` : ''}</span> },
    {
      key: 'diff', header: 'Antes → depois', hideOnMobile: true,
      cell: r => (
        <span className="block max-w-md truncate text-[11px] text-muted font-mono" title={`${JSON.stringify(r.before ?? null)} → ${JSON.stringify(r.after ?? null)}`}>
          {JSON.stringify(r.before ?? null)} → {JSON.stringify(r.after ?? null)}
        </span>
      ),
    },
    { key: 'ip', header: 'IP', hideOnMobile: true, cell: r => <span className="text-[11px] text-muted tabular-nums">{r.ip ?? '—'}</span> },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Trilha de auditoria"
      subtitle="Toda ação do admin, com antes e depois. Se a lista está vazia, rode a migration v32."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <ServerTable
        columns={columns}
        rows={filtered}
        rowKey={r => r.id}
        total={total}
        params={params}
        basePath={BASE}
        searchParams={raw}
        caption="Registro de ações administrativas"
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput basePath={BASE} placeholder="Buscar nesta página…" className="w-full sm:w-64" />
            <FilterSelect basePath={BASE} name="entity" label="Tipo de alvo" allLabel="Todos os alvos"
              options={[
                { value: 'professional', label: 'Profissional' }, { value: 'appointment', label: 'Agendamento' },
                { value: 'client', label: 'Cliente' }, { value: 'conversation', label: 'Conversa' },
                { value: 'plan', label: 'Plano' }, { value: 'export', label: 'Exportação' },
                { value: 'notice', label: 'Aviso' }, { value: 'settings', label: 'Configuração' },
              ]} />
            <ClearFilters basePath={BASE} keys={['q', 'action', 'entity', 'range', 'from', 'to']} />
          </div>
        }
        empty={{
          title: 'Nenhum registro',
          description: 'Nada foi feito nesse recorte — ou a migration v32 (admin_audit_log) ainda não foi aplicada.',
          icon: <ScrollText className="h-8 w-8" />,
        }}
      />
    </LayoutAdmin>
  );
}
