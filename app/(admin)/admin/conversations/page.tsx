import React from 'react';
import { MessageCircle, Clock } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ConversationBulkActions } from '@/components/admin/ConversationActions';
import { Badge } from '@/components/admin/badges';
import { listConversations, professionalOptions, ConversationRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { formatDateTimeBR } from '@/lib/format';

export const metadata = { title: 'Conversas | Lume Admin' };

const BASE = '/admin/conversations';

export default async function AdminConversationsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['prof', 'state'] });

  const options = await professionalOptions();
  const { rows, total, waiting } = await listConversations(params, new Map(options.map(o => [o.value, o.label])));

  const columns: ServerColumn<ConversationRow>[] = [
    { key: 'select', header: <SelectAllCheckbox />, hideOnMobile: true, className: 'w-10', cell: r => <RowCheckbox id={r.id} /> },
    {
      key: 'client', header: 'Cliente', primary: true,
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink tabular-nums truncate">{r.clientPhone}</span>
          <span className="block text-[11px] text-muted truncate">{r.lastMessage || 'sem mensagens'}</span>
        </span>
      ),
    },
    { key: 'prof', header: 'Profissional', cell: r => <span className="text-xs text-muted truncate">{r.professionalName}</span> },
    {
      key: 'state', header: 'Situação',
      cell: r => r.botPaused ? <Badge tone="warn">esperando humano</Badge> : <Badge tone="ok">bot respondendo</Badge>,
    },
    {
      key: 'waiting', header: 'Esperando há', numeric: true,
      cell: r => r.botPaused
        ? <span className={r.waitingHours >= 24 ? 'text-[color:var(--color-bad)] font-bold' : 'text-ink'}>{r.waitingHours}h</span>
        : <span className="text-muted">—</span>,
    },
    { key: 'msgs', header: 'Mensagens', numeric: true, hideOnMobile: true, cell: r => r.messageCount },
    { key: 'last', header: 'Última mensagem', cell: r => <span className="text-xs text-muted tabular-nums">{formatDateTimeBR(r.lastMessageAt)}</span> },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Conversas do WhatsApp"
      subtitle="A fila que o KPI da home prometia e não tinha tela: quem está esperando atendimento humano."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[color:var(--color-warn)]/10 text-[color:var(--color-warn)] flex items-center justify-center"><Clock className="h-4 w-4" /></span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Esperando humano</span>
              <span className="block text-lg font-bold text-heading tabular-nums leading-tight">{waiting}</span>
            </span>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-accent-soft text-accent-link flex items-center justify-center"><MessageCircle className="h-4 w-4" /></span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Conversas no filtro</span>
              <span className="block text-lg font-bold text-heading tabular-nums leading-tight">{total}</span>
            </span>
          </div>
          <div className="card px-4 py-3 flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-[color:var(--color-bad)]/10 text-[color:var(--color-bad)] flex items-center justify-center"><Clock className="h-4 w-4" /></span>
            <span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">Esperando +24h</span>
              <span className="block text-lg font-bold text-heading tabular-nums leading-tight">{rows.filter(r => r.waitingHours >= 24 && r.botPaused).length}</span>
            </span>
          </div>
        </div>

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
                <FilterSelect basePath={BASE} name="state" label="Situação" allLabel="Todas"
                  options={[{ value: 'waiting', label: 'Esperando humano' }, { value: 'bot', label: 'Bot respondendo' }]} />
                <FilterSelect basePath={BASE} name="prof" label="Profissional" allLabel="Todas as profissionais" options={options} />
                <ClearFilters basePath={BASE} keys={['q', 'state', 'prof']} />
              </div>
            }
            empty={{ title: 'Nenhuma conversa', description: 'Ninguém esperando atendimento com esse recorte.', icon: <MessageCircle className="h-8 w-8" /> }}
          />
          <ConversationBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
