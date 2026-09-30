import React from 'react';
import Link from 'next/link';
import { Plus, Users, Bot } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ProfessionalBulkActions } from '@/components/admin/ProfessionalBulkActions';
import { StatStrip } from '@/components/admin/primitives';
import { SubNav, CONTAS_NAV } from '@/components/admin/SubNav';
import { AccountStateBadge, PlanBadge, DeadlineText } from '@/components/admin/badges';
import { ImpersonateRowButton } from '@/components/admin/ImpersonateRowButton';
import { button } from '@/components/admin/ui';
import { listProfessionals, ProfessionalRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, formatDateBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Contas | Lume Admin' };

const BASE = '/admin/professionals';

export default async function AdminProfessionalsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, {
    filterKeys: ['status', 'plan', 'bot', 'hide', 'risk'],
    defaultSort: 'revenue',
  });

  const { rows, total, totals } = await listProfessionals(params);

  const toAccount = (r: ProfessionalRow) => ({
    status: r.status,
    subscription_status: r.subscriptionStatus,
    subscription_plan: r.plan,
    subscription_ends_at: r.subscriptionEndsAt,
    trial_ends_at: r.trialEndsAt,
    created_at: r.createdAt,
  });

  const columns: ServerColumn<ProfessionalRow>[] = [
    { key: 'select', header: <SelectAllCheckbox />, hideOnMobile: true, className: 'w-10', cell: r => <RowCheckbox id={r.id} label={`Selecionar ${r.brandName}`} /> },
    {
      key: 'name', header: 'Conta', sortable: true, primary: true,
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-heading truncate">{r.brandName}</span>
          <span className="block text-caption text-n-500 truncate">{r.name} · /{r.slug}</span>
        </span>
      ),
    },
    {
      key: 'status', header: 'Situação', sortable: true, className: 'min-w-[9rem]',
      cell: r => (
        <span className="flex flex-col items-start gap-1">
          <AccountStateBadge account={toAccount(r)} />
          <DeadlineText account={toAccount(r)} />
        </span>
      ),
    },
    { key: 'plan', header: 'Plano', menuLabel: 'Plano', sortable: true, className: 'min-w-[6.5rem]', cell: r => <PlanBadge plan={r.plan} /> },
    { key: 'appts', header: 'Agend. 30d', menuLabel: 'Agendamentos 30d', sortable: true, numeric: true, cell: r => r.appts30d },
    { key: 'revenue', header: 'Faturamento 30d', sortable: true, numeric: true, cell: r => <span className="font-semibold text-heading">{brl(r.revenue30dCents)}</span> },
    { key: 'clients', header: 'Clientes', menuLabel: 'Clientes', sortable: true, numeric: true, cell: r => r.clients },
    {
      key: 'bot', header: 'Bot', menuLabel: 'Bot', align: 'center',
      cell: r => r.botConfigured
        ? <Bot className={`h-4 w-4 mx-auto ${r.botEnabled ? 'text-success' : 'text-n-400'}`} aria-label={r.botEnabled ? 'Bot ligado' : 'Bot configurado, desligado'} />
        : <span className="text-n-400 text-caption" aria-label="Sem bot">—</span>,
    },
    {
      key: 'access', header: 'Último acesso', menuLabel: 'Último acesso', sortable: true, className: 'min-w-[8rem]',
      cell: r => <span className="text-caption text-n-500">{r.lastSignInAt ? formatRelativeBR(r.lastSignInAt) : '—'}</span>,
    },
    {
      key: 'created', header: 'Cadastro', menuLabel: 'Cadastro', sortable: true, hideOnMobile: true,
      cell: r => <span className="text-caption text-n-500 num">{formatDateBR(r.createdAt)}</span>,
    },
    { key: 'enter', header: <span className="sr-only">Entrar como</span>, align: 'right', className: 'w-24', cell: r => <ImpersonateRowButton id={r.id} brandName={r.brandName} /> },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Contas"
      subtitle="As profissionais da rede e o que cada uma produziu nos últimos 30 dias."
      actions={
        <Link href="/admin/professionals/new" className={button('primary', 'md')}>
          <Plus className="h-4 w-4" /> Nova conta
        </Link>
      }
    >
      <div className="space-y-4">
        <SubNav items={CONTAS_NAV} />

        <StatStrip items={[
          { label: 'Contas no recorte', value: String(total) },
          { label: 'Com acesso hoje', value: String(totals.active), note: total - totals.active > 0 ? `${total - totals.active} sem acesso` : 'todas com acesso' },
          { label: 'Com bot ligado', value: String(totals.withBot), note: `de ${total} contas` },
          { label: 'Faturamento 30d', value: brl(totals.revenue30dCents), note: 'movimento da rede', tone: 'accent' },
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
            caption="Contas da rede com métricas dos últimos 30 dias"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput basePath={BASE} placeholder="Nome, marca, e-mail ou slug…" className="w-full sm:w-72" />
                <FilterSelect basePath={BASE} name="status" label="Situação" allLabel="Situação"
                  options={[
                    { value: 'active', label: 'Ativas (pagando)' },
                    { value: 'trialing', label: 'Em teste' },
                    { value: 'legacy', label: 'Legadas' },
                    { value: 'expired', label: 'Vencidas' },
                    { value: 'paused', label: 'Pausadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                  ]} />
                <FilterSelect basePath={BASE} name="plan" label="Plano" allLabel="Plano"
                  options={[{ value: 'start', label: 'Start' }, { value: 'pro', label: 'Pro' }, { value: 'premium', label: 'Premium' }, { value: 'none', label: 'Sem plano (legada)' }]} />
                <FilterSelect basePath={BASE} name="risk" label="Risco" allLabel="Risco"
                  options={[
                    { value: 'idle30', label: 'Sem agendamento há 30d' },
                    { value: 'trial7', label: 'Vence em 7 dias' },
                    { value: 'expired', label: 'Acesso vencido' },
                    { value: 'never', label: 'Nunca acessaram' },
                  ]} />
                <FilterSelect basePath={BASE} name="hide" label="Contas de teste" allLabel="Com contas de teste"
                  options={[{ value: 'test', label: 'Sem contas de teste' }]} />
                <ClearFilters basePath={BASE} keys={['q', 'status', 'plan', 'bot', 'risk', 'hide', 'range', 'from', 'to']} />
                <div className="ml-auto"><ExportCsvButton dataset="professionals" label="CSV" /></div>
              </div>
            }
            empty={{
              title: 'Nenhuma conta com esse recorte',
              description: 'Limpe os filtros para ver a rede inteira.',
              icon: <Users />,
            }}
          />
          <ProfessionalBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
