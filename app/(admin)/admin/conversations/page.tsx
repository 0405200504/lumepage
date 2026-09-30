import React from 'react';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ConversationBulkActions } from '@/components/admin/ConversationActions';
import { Badge } from '@/components/admin/badges';
import { StatStrip } from '@/components/admin/primitives';
import { listConversations, professionalOptions, ConversationRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { formatDateTimeBR, formatDurationBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Conversas | Lume Admin' };

const BASE = '/admin/conversations';

export default async function AdminConversationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['prof', 'state'] });

  const options = await professionalOptions();
  const { rows, total, waiting } = await listConversations(params, new Map(options.map(o => [o.value, o.label])));
  const longWait = rows.filter(r => r.botPaused && r.waitingHours >= 48);

  const columns: ServerColumn<ConversationRow>[] = [
    { key: 'select', header: <SelectAllCheckbox />, hideOnMobile: true, className: 'w-10', cell: r => <RowCheckbox id={r.id} /> },
    {
      key: 'client', header: 'Cliente', primary: true, className: 'min-w-[16rem]',
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-heading num truncate">{r.clientPhone}</span>
          <span className="block text-caption text-n-500 truncate">{r.lastMessage || 'sem mensagens'}</span>
        </span>
      ),
    },
    { key: 'prof', header: 'Conta', menuLabel: 'Conta', className: 'min-w-[9rem] max-w-[14rem]', cell: r => <span className="block text-caption text-n-500 truncate" title={r.professionalName}>{r.professionalName}</span> },
    { key: 'state', header: 'Situação', cell: r => r.botPaused ? <Badge tone="warn">esperando humano</Badge> : <Badge tone="ok">bot respondendo</Badge> },
    {
      key: 'waiting', header: 'Esperando há', numeric: true, className: 'min-w-[7rem]',
      cell: r => r.botPaused
        ? <span title={`Sem resposta desde ${formatDateTimeBR(r.lastMessageAt)}`}
            className={r.waitingHours >= 48 ? 'text-danger font-semibold' : r.waitingHours >= 24 ? 'text-warning font-semibold' : 'text-heading'}>
            {formatDurationBR(r.waitingHours * 3_600_000)}
          </span>
        : <span className="text-n-400">—</span>,
    },
    { key: 'msgs', header: 'Mensagens', menuLabel: 'Mensagens', numeric: true, hideOnMobile: true, className: 'min-w-[6rem]', cell: r => r.messageCount },
    {
      key: 'last', header: 'Última mensagem', menuLabel: 'Última mensagem', className: 'min-w-[10rem]',
      cell: r => <span className="text-caption text-n-500 num whitespace-nowrap" title={formatDateTimeBR(r.lastMessageAt)}>{formatRelativeBR(r.lastMessageAt)}</span>,
    },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Conversas"
      subtitle="A fila do WhatsApp: quem está esperando atendimento humano em toda a rede."
    >
      <div className="space-y-4">
        <StatStrip cols={3} items={[
          { label: 'Esperando humano', value: String(waiting), note: waiting > 0 ? 'ninguém está respondendo' : 'fila zerada', tone: waiting > 0 ? 'warn' : 'default' },
          { label: 'Esperando há mais de 48h', value: String(longWait.length), note: longWait.length > 0 ? `a mais antiga há ${formatDurationBR(Math.max(...longWait.map(r => r.waitingHours)) * 3_600_000)}` : 'nenhuma', tone: longWait.length > 0 ? 'bad' : 'default' },
          { label: 'Conversas no recorte', value: String(total) },
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
            rowHref={r => `${BASE}/${r.id}`}
            caption="Conversas de WhatsApp da rede, ordenadas por tempo de espera"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput basePath={BASE} placeholder="Telefone da cliente…" className="w-full sm:w-64" />
                <FilterSelect basePath={BASE} name="state" label="Situação" allLabel="Situação"
                  options={[{ value: 'waiting', label: 'Esperando humano' }, { value: 'bot', label: 'Bot respondendo' }]} />
                <FilterSelect basePath={BASE} name="prof" label="Conta" allLabel="Todas as contas" options={options} />
                <ClearFilters basePath={BASE} keys={['q', 'state', 'prof']} />
              </div>
            }
            empty={{ title: 'Nenhuma conversa neste recorte', description: 'Nada na fila com os filtros atuais.', icon: <MessageCircle /> }}
          />
          <ConversationBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
