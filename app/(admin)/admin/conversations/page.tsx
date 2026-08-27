import React from 'react';
import { Clock, MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ConversationBulkActions } from '@/components/admin/ConversationActions';
import { Badge } from '@/components/admin/badges';
import { StatCard } from '@/components/admin/primitives';
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
          <span className="block font-semibold text-ink num truncate">{r.clientPhone}</span>
          <span className="block text-caption text-muted truncate">{r.lastMessage || 'sem mensagens'}</span>
        </span>
      ),
    },
    {
      key: 'prof', header: 'Profissional', menuLabel: 'Profissional', className: 'min-w-[9rem] max-w-[14rem]',
      cell: r => <span className="block text-caption text-muted truncate" title={r.professionalName}>{r.professionalName}</span>,
    },
    {
      key: 'state', header: 'Situação',
      cell: r => r.botPaused ? <Badge tone="warn">esperando humano</Badge> : <Badge tone="ok">bot respondendo</Badge>,
    },
    {
      // "1422h" ninguém lê. Acima de 48h vira dias; acima de 60d, meses.
      key: 'waiting', header: 'Esperando há', numeric: true, className: 'min-w-[7rem]',
      cell: r => r.botPaused
        ? <span
            title={`Sem resposta desde ${formatDateTimeBR(r.lastMessageAt)}`}
            className={r.waitingHours >= 48 ? 'text-danger font-bold' : r.waitingHours >= 24 ? 'text-warning font-bold' : 'text-ink'}
          >
            {formatDurationBR(r.waitingHours * 3_600_000)}
          </span>
        : <span className="text-muted">—</span>,
    },
    { key: 'msgs', header: 'Mensagens', menuLabel: 'Mensagens', numeric: true, hideOnMobile: true, className: 'min-w-[6rem]', cell: r => r.messageCount },
    {
      key: 'last', header: 'Última mensagem', menuLabel: 'Última mensagem', className: 'min-w-[10rem]',
      cell: r => (
        <span className="text-caption text-muted num whitespace-nowrap" title={formatDateTimeBR(r.lastMessageAt)}>
          {formatRelativeBR(r.lastMessageAt)}
        </span>
      ),
    },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Conversas do WhatsApp"
      subtitle="A fila que o KPI da home prometia e não tinha tela: quem está esperando atendimento humano."
    >
      <div className="space-y-4">
        {longWait.length > 0 && (
          <p className="card px-4 py-3 text-caption font-semibold text-danger flex items-start gap-2">
            <Clock className="h-4 w-4 shrink-0 mt-px" aria-hidden />
            {longWait.length} conversa(s) esperando atendimento humano há mais de 48 horas — a mais antiga
            está parada há {formatDurationBR(Math.max(...longWait.map(r => r.waitingHours)) * 3_600_000)}.
            Isso é alerta operacional, não linha de tabela.
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <StatCard label="Esperando humano" value={String(waiting)} icon={<Clock className="h-[18px] w-[18px]" />} tint="amber"
            note={waiting > 0 ? 'ninguém está respondendo por elas' : 'fila zerada'} />
          <StatCard label="Conversas no filtro" value={String(total)} icon={<MessageCircle className="h-[18px] w-[18px]" />} tint="wine" />
          <StatCard label="Esperando +48h" value={String(longWait.length)} icon={<Clock className="h-[18px] w-[18px]" />} tint="indigo"
            note={longWait.length > 0 ? 'já não é fila, é abandono' : undefined} />
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
            empty={{ title: 'Nenhuma conversa neste recorte', description: 'Nada na fila com os filtros atuais — o que é bom, se os filtros estiverem certos.', icon: <MessageCircle className="h-8 w-8" /> }}
          />
          <ConversationBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
