import React from 'react';
import { CalendarDays } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { DateRangeFilter } from '@/components/ui/DateRangeFilter';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { AppointmentDetailButton, AppointmentBulkActions } from '@/components/admin/AppointmentRowActions';
import { AppointmentStatusBadge } from '@/components/admin/badges';
import { listAppointments, professionalOptions, AppointmentRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, formatDateBR, formatTimeBR } from '@/lib/format';

export const metadata = { title: 'Agendamentos | Lume Admin' };

const BASE = '/admin/appointments';

export default async function AdminAppointmentsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['status', 'prof'], defaultSort: 'date' });

  const options = await professionalOptions();
  const profNames = new Map(options.map(o => [o.value, o.label]));
  const { rows, total, totals } = await listAppointments(params, profNames);

  const columns: ServerColumn<AppointmentRow>[] = [
    { key: 'select', header: <SelectAllCheckbox />, hideOnMobile: true, className: 'w-10', cell: r => <RowCheckbox id={r.id} /> },
    {
      key: 'date', header: 'Quando', sortable: true, primary: true,
      cell: r => (
        <span className="block">
          <span className="block font-semibold text-ink num">{formatDateBR(r.date)}</span>
          <span className="block text-caption text-muted num">{formatTimeBR(r.startTime)}–{formatTimeBR(r.endTime)}</span>
        </span>
      ),
    },
    {
      key: 'client', header: 'Cliente', sortable: true,
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink truncate">{r.clientName}</span>
          <span className="block text-caption text-muted num">{r.clientWhatsapp}</span>
        </span>
      ),
    },
    { key: 'prof', header: 'Profissional', cell: r => <span className="text-caption text-muted truncate">{r.professionalName}</span> },
    { key: 'service', header: 'Serviço', cell: r => <span className="text-caption text-ink truncate">{r.serviceName}</span> },
    { key: 'value', header: 'Valor', numeric: true, cell: r => brl(r.priceCents) },
    { key: 'origin', header: 'Origem', hideOnMobile: true, cell: r => <span className="text-caption text-muted">{r.origin}</span> },
    { key: 'status', header: 'Status', sortable: true, cell: r => <AppointmentStatusBadge status={r.status} /> },
    { key: 'actions', header: '', align: 'right', hideOnMobile: true, cell: r => <AppointmentDetailButton row={r} /> },
  ];

  const statusChips = Object.entries(totals.byStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([status, count]) => (
      <span key={status} className="inline-flex items-center gap-1.5 text-caption text-muted">
        <AppointmentStatusBadge status={status} />
        <span className="num font-bold text-ink">{count}</span>
      </span>
    ));

  return (
    <LayoutAdmin
      session={session}
      title="Agendamentos da rede"
      subtitle="Tudo que foi marcado na plataforma — com filtro de período, detalhe e ação."
    >
      <div className="space-y-4">
        <div className="card px-4 py-3 flex flex-wrap items-center gap-4">
          <DateRangeFilter basePath={BASE} />
          <span className="ml-auto text-caption text-muted">
            Faturamento no filtro: <strong className="text-ink num">{brl(totals.revenueCents)}</strong>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-1">{statusChips}</div>

        <TableSelectionProvider pageIds={rows.map(r => r.id)}>
          <ServerTable
            columns={columns}
            rows={rows}
            rowKey={r => r.id}
            total={total}
            params={params}
            basePath={BASE}
            searchParams={raw}
            caption="Agendamentos de toda a rede, filtráveis por período, profissional e status"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput basePath={BASE} placeholder="Cliente ou telefone…" className="w-full sm:w-64" />
                <FilterSelect basePath={BASE} name="status" label="Status" allLabel="Todos os status"
                  options={[
                    { value: 'pending', label: 'Pendentes' }, { value: 'confirmed', label: 'Confirmados' },
                    { value: 'completed', label: 'Finalizados' }, { value: 'cancelled', label: 'Cancelados' },
                    { value: 'no_show', label: 'Faltas' },
                  ]} />
                <FilterSelect basePath={BASE} name="prof" label="Profissional" allLabel="Todas as profissionais" options={options} />
                <ClearFilters basePath={BASE} keys={['q', 'status', 'prof', 'range', 'from', 'to']} />
                <div className="ml-auto"><ExportCsvButton dataset="appointments" /></div>
              </div>
            }
            empty={{
              title: 'Nenhum agendamento nesse recorte',
              description: 'Troque o período ou limpe os filtros.',
              icon: <CalendarDays className="h-8 w-8" />,
            }}
          />
          <AppointmentBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
