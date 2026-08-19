import React from 'react';
import Link from 'next/link';
import { Plus, Users, Bot, Wallet, Sparkles, KeyRound } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ProfessionalBulkActions } from '@/components/admin/ProfessionalBulkActions';
import { StatCard } from '@/components/admin/primitives';
import { AccountStateBadge, PlanBadge, DeadlineText } from '@/components/admin/badges';
import { ImpersonateRowButton } from '@/components/admin/ImpersonateRowButton';
import { listProfessionals, ProfessionalRow } from '@/lib/admin/queries';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl } from '@/lib/format';
import { formatDateBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Profissionais | Lume Admin' };

const BASE = '/admin/professionals';

export default async function AdminProfessionalsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, {
    filterKeys: ['status', 'plan', 'bot', 'hide', 'risk'],
    defaultSort: 'revenue',
  });

  const { rows, total, totals } = await listProfessionals(params);

  /** Linha da tabela → entrada da máquina de estados (lib/admin/account-state.ts). */
  const toAccount = (r: ProfessionalRow) => ({
    status: r.status,
    subscription_status: r.subscriptionStatus,
    subscription_plan: r.plan,
    subscription_ends_at: r.subscriptionEndsAt,
    trial_ends_at: r.trialEndsAt,
    created_at: r.createdAt,
  });

  const columns: ServerColumn<ProfessionalRow>[] = [
    {
      key: 'select', header: <SelectAllCheckbox />, hideOnMobile: true, className: 'w-10',
      cell: r => <RowCheckbox id={r.id} label={`Selecionar ${r.brandName}`} />,
    },
    {
      key: 'name', header: 'Profissional', sortable: true, primary: true,
      cell: r => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink truncate">{r.brandName}</span>
          <span className="block text-[11px] text-muted truncate">{r.name} · /{r.slug}</span>
        </span>
      ),
    },
    {
      // Estado da conta: um campo derivado, não dois campos crus se contradizendo.
      key: 'status', header: 'Situação', sortable: true, className: 'min-w-[9rem]',
      cell: r => (
        <span className="flex flex-col items-start gap-0.5">
          <AccountStateBadge account={toAccount(r)} />
          <DeadlineText account={toAccount(r)} />
        </span>
      ),
    },
    { key: 'plan', header: 'Plano', menuLabel: 'Plano', sortable: true, className: 'min-w-[6.5rem]', cell: r => <PlanBadge plan={r.plan} /> },
    { key: 'appts', header: 'Agend. 30d', menuLabel: 'Agendamentos 30d', sortable: true, numeric: true, cell: r => r.appts30d },
    { key: 'revenue', header: 'Faturamento 30d', sortable: true, numeric: true, cell: r => brl(r.revenue30dCents) },
    { key: 'clients', header: 'Clientes', menuLabel: 'Clientes', sortable: true, numeric: true, cell: r => r.clients },
    {
      key: 'bot', header: 'Bot', menuLabel: 'Bot', align: 'center',
      cell: r => r.botConfigured
        ? <Bot className={`h-4 w-4 mx-auto ${r.botEnabled ? 'text-[color:var(--color-ok)]' : 'text-muted'}`} aria-label={r.botEnabled ? 'Bot ligado' : 'Bot configurado, desligado'} />
        : <span className="text-muted text-xs" aria-label="Sem bot">—</span>,
    },
    {
      key: 'access', header: 'Último acesso', menuLabel: 'Último acesso', sortable: true, className: 'min-w-[8rem]',
      cell: r => <span className="text-xs text-muted">{r.lastSignInAt ? formatRelativeBR(r.lastSignInAt) : '—'}</span>,
    },
    {
      key: 'created', header: 'Cadastro', menuLabel: 'Cadastro', sortable: true, hideOnMobile: true,
      cell: r => <span className="text-xs text-muted tabular-nums">{formatDateBR(r.createdAt)}</span>,
    },
    {
      key: 'enter', header: <span className="sr-only">Entrar como</span>, align: 'right', className: 'w-24',
      cell: r => <ImpersonateRowButton id={r.id} brandName={r.brandName} />,
    },
  ];

  return (
    <LayoutAdmin
      session={session}
      title="Profissionais"
      subtitle="As contas da rede, com o que cada uma produziu nos últimos 30 dias."
      actions={
        <>
          <Link href="/admin/professionals/acessos" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl border border-line bg-surface text-ink text-xs font-bold hover:bg-surface-2 transition-colors">
            <KeyRound className="h-4 w-4" /> Acessos
          </Link>
          <Link href="/admin/professionals/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold transition-colors">
            <Plus className="h-4 w-4" /> Cadastrar
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Contas no filtro" value={String(total)} icon={<Users className="h-[18px] w-[18px]" />} tint="indigo" />
          <StatCard label="Com acesso hoje" value={String(totals.active)} icon={<Sparkles className="h-[18px] w-[18px]" />} tint="emerald"
            note={total - totals.active > 0 ? `${total - totals.active} sem acesso` : undefined} />
          <StatCard label="Com bot ligado" value={`${totals.withBot}`} icon={<Bot className="h-[18px] w-[18px]" />} tint="amber"
            note={`de ${total} contas`} />
          <StatCard label="Faturamento 30d" value={brl(totals.revenue30dCents)} icon={<Wallet className="h-[18px] w-[18px]" />} tint="wine"
            note="GMV da rede" />
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
            caption="Lista de profissionais da rede com métricas dos últimos 30 dias"
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <SearchInput basePath={BASE} placeholder="Nome, marca, e-mail ou slug…" className="w-full sm:w-72" />
                <FilterSelect basePath={BASE} name="status" label="Situação da conta" allLabel="Todas as situações"
                  options={[
                    { value: 'active', label: 'Ativas (pagando)' },
                    { value: 'trialing', label: 'Em teste' },
                    { value: 'legacy', label: 'Legadas' },
                    { value: 'expired', label: 'Vencidas' },
                    { value: 'paused', label: 'Pausadas' },
                    { value: 'cancelled', label: 'Canceladas' },
                  ]} />
                <FilterSelect basePath={BASE} name="plan" label="Plano" allLabel="Todos os planos"
                  options={[{ value: 'start', label: 'Start' }, { value: 'pro', label: 'Pro' }, { value: 'premium', label: 'Premium' }, { value: 'none', label: 'Sem plano (legada)' }]} />
                <FilterSelect basePath={BASE} name="bot" label="Bot" allLabel="Bot: tanto faz"
                  options={[{ value: 'yes', label: 'Com bot' }, { value: 'no', label: 'Sem bot' }]} />
                <FilterSelect basePath={BASE} name="risk" label="Risco" allLabel="Sem recorte de risco"
                  options={[
                    { value: 'idle30', label: 'Sem agendamento há 30d' },
                    { value: 'trial7', label: 'Vence em 7 dias' },
                    { value: 'expired', label: 'Acesso já vencido' },
                    { value: 'never', label: 'Nunca acessaram' },
                  ]} />
                <FilterSelect basePath={BASE} name="hide" label="Contas de teste" allLabel="Incluir contas de teste"
                  options={[{ value: 'test', label: 'Ocultar contas de teste' }]} />
                <ClearFilters basePath={BASE} keys={['q', 'status', 'plan', 'bot', 'risk', 'hide', 'range', 'from', 'to']} />
                <div className="ml-auto"><ExportCsvButton dataset="professionals" /></div>
              </div>
            }
            empty={{
              title: 'Nenhuma conta com esse recorte',
              description: 'Os filtros ativos não deixaram nenhuma conta. Limpe a busca para ver a rede inteira.',
              icon: <Users className="h-8 w-8" />,
            }}
          />
          <ProfessionalBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
