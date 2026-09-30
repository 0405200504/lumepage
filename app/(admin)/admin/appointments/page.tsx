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
import { StatStrip } from '@/components/admin/primitives';
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
          <span className="block font-semibold text-heading num">{formatDateBR(r.date)}</span>
          <span className="block text-caption text-n-500 num">{formatTimeBR(r.startTime)}–{formatTimeBR(r.endTime)}</span>
        </span>
      ),
    },
    {
      key: 'client', header: 'Cliente', sortable: true,
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-heading truncate">{r.clientName}</span>
          <span className="block text-caption text-n-500 num">{r.clientWhatsapp}</span>
        </span>
      ),
    },
    { key: 'prof', header: 'Conta', cell: r => <span className="text-caption text-n-500 truncate">{r.professionalName}</span> },
    { key: 'service', header: 'Serviço', cell: r => <span className="text-caption text-ink truncate">{r.serviceName}</span> },
    { key: 'value', header: 'Valor', numeric: true, cell: r => <span className="font-semibold text-heading">{brl(r.priceCents)}</span> },
    { key: 'origin', header: 'Origem', menuLabel: 'Origem', hideOnMobile: true, cell: r => <span className="text-caption text-n-500">{r.origin}</span> },
    { key: 'status', header: 'Status', sortable: true, cell: r => <AppointmentStatusBadge status={r.status} /> },
    { key: 'actions', header: <span className="sr-only">Ações</span>, align: 'right', hideOnMobile: true, cell: r => <AppointmentDetailButton row={r} /> },
  ];

  const by = totals.byStatus;

  return (
    <LayoutAdmin
      session={session}
      title="Agendamentos"
      subtitle="Tudo que foi marcado na plataforma, com filtro de período, detalhe e ação."
      actions={<DateRangeFilter basePath={BASE} />}
    >
      <div className="space-y-4">
        <StatStrip items={[
          { label: 'Agendamentos no recorte', value: String(total) },
          { label: 'Faturamento no recorte', value: brl(totals.revenueCents), note: 'confirmados e finalizados', tone: 'accent' },
          { label: 'Pendentes', value: String(by.pending ?? 0), note: 'aguardando confirmação', tone: by.pending ? 'warn' : 'default' },
          { label: 'Faltas', value: String(by.no_show ?? 0), note: `${by.cancelled ?? 0} cancelados`, tone: by.no_show ? 'bad' : 'default' },
        ]} />

        <TableSelectionProvider pageIds={rows.map(r => r.id)}>
          <ServerTable
            columns={columns}
            rows={rows}
            rowKey={r => r.id}
            total={total}
            params={params}
            basePath={BASE}
            searchParams={raw}
            caption="Agendamentos de toda a rede, filtráveis por período, conta e status"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput basePath={BASE} placeholder="Cliente ou telefone…" className="w-full sm:w-64" />
                <FilterSelect basePath={BASE} name="status" label="Status" allLabel="Status"
                  options={[
                    { value: 'pending', label: 'Pendentes' }, { value: 'confirmed', label: 'Confirmados' },
                    { value: 'completed', label: 'Finalizados' }, { value: 'cancelled', label: 'Cancelados' },
                    { value: 'no_show', label: 'Faltas' },
                  ]} />
                <FilterSelect basePath={BASE} name="prof" label="Conta" allLabel="Todas as contas" options={options} />
                <ClearFilters basePath={BASE} keys={['q', 'status', 'prof', 'range', 'from', 'to']} />
                <div className="ml-auto"><ExportCsvButton dataset="appointments" label="CSV" /></div>
              </div>
            }
            empty={{ title: 'Nenhum agendamento nesse recorte', description: 'Troque o período ou limpe os filtros.', icon: <CalendarDays /> }}
          />
          <AppointmentBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
