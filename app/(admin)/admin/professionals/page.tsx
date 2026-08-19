import React from 'react';
import Link from 'next/link';
import { Plus, Users, Bot, Wallet, Sparkles } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ServerTable, ServerColumn } from '@/components/ui/ServerTable';
import { SearchInput, FilterSelect, ClearFilters } from '@/components/ui/TableFilters';
import { ExportCsvButton } from '@/components/ui/ExportCsvButton';
import { TableSelectionProvider, RowCheckbox, SelectAllCheckbox } from '@/components/ui/TableSelection';
import { ProfessionalBulkActions } from '@/components/admin/ProfessionalBulkActions';
import { AccountStatusBadge, PlanBadge } from '@/components/admin/badges';
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
    { key: 'status', header: 'Conta', sortable: true, cell: r => <AccountStatusBadge status={r.status} /> },
    {
      key: 'plan', header: 'Plano', sortable: true,
      cell: r => <PlanBadge plan={r.plan} status={r.subscriptionStatus} endsAt={r.subscriptionEndsAt} trialEndsAt={r.trialEndsAt} />,
    },
    { key: 'appts', header: 'Agend. 30d', sortable: true, numeric: true, cell: r => r.appts30d },
    { key: 'revenue', header: 'Faturamento 30d', sortable: true, numeric: true, cell: r => brl(r.revenue30dCents) },
    { key: 'clients', header: 'Clientes', sortable: true, numeric: true, cell: r => r.clients },
    {
      key: 'bot', header: 'Bot', align: 'center',
      cell: r => r.botConfigured
        ? <Bot className={`h-4 w-4 mx-auto ${r.botEnabled ? 'text-[color:var(--color-ok)]' : 'text-muted'}`} aria-label={r.botEnabled ? 'Bot ligado' : 'Bot configurado, desligado'} />
        : <span className="text-muted text-xs" aria-label="Sem bot">—</span>,
    },
    {
      key: 'access', header: 'Último acesso', sortable: true,
      cell: r => <span className="text-xs text-muted">{r.lastSignInAt ? formatRelativeBR(r.lastSignInAt) : '—'}</span>,
    },
    {
      key: 'created', header: 'Cadastro', sortable: true, hideOnMobile: true,
      cell: r => <span className="text-xs text-muted tabular-nums">{formatDateBR(r.createdAt)}</span>,
    },
  ];

  const kpi = (label: string, value: string, icon: React.ReactNode) => (
    <div className="card px-4 py-3 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-accent-soft text-accent-link flex items-center justify-center shrink-0">{icon}</span>
      <span>
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</span>
        <span className="block text-lg font-bold text-heading tabular-nums leading-tight">{value}</span>
      </span>
    </div>
  );

  return (
    <LayoutAdmin
      session={session}
      title="Profissionais"
      subtitle="As contas da rede, com o que cada uma produziu nos últimos 30 dias."
      actions={
        <Link href="/admin/professionals/new" className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold transition-colors">
          <Plus className="h-4 w-4" /> Cadastrar
        </Link>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpi('Contas no filtro', String(total), <Users className="h-4 w-4" />)}
          {kpi('Ativas', String(totals.active), <Sparkles className="h-4 w-4" />)}
          {kpi('Com bot', `${totals.withBot}/${total}`, <Bot className="h-4 w-4" />)}
          {kpi('Faturamento 30d', brl(totals.revenue30dCents), <Wallet className="h-4 w-4" />)}
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
                <FilterSelect basePath={BASE} name="status" label="Status da conta" allLabel="Todos os status"
                  options={[{ value: 'active', label: 'Ativas' }, { value: 'paused', label: 'Pausadas' }, { value: 'cancelled', label: 'Canceladas' }]} />
                <FilterSelect basePath={BASE} name="plan" label="Plano" allLabel="Todos os planos"
                  options={[{ value: 'start', label: 'Start' }, { value: 'pro', label: 'Pro' }, { value: 'premium', label: 'Premium' }, { value: 'none', label: 'Sem plano (legada)' }]} />
                <FilterSelect basePath={BASE} name="bot" label="Bot" allLabel="Bot: tanto faz"
                  options={[{ value: 'yes', label: 'Com bot' }, { value: 'no', label: 'Sem bot' }]} />
                <FilterSelect basePath={BASE} name="risk" label="Risco" allLabel="Sem recorte de risco"
                  options={[{ value: 'idle30', label: 'Sem agendamento há 30d' }, { value: 'trial7', label: 'Vence em 7 dias' }]} />
                <FilterSelect basePath={BASE} name="hide" label="Contas de teste" allLabel="Incluir contas de teste"
                  options={[{ value: 'test', label: 'Ocultar contas de teste' }]} />
                <ClearFilters basePath={BASE} keys={['q', 'status', 'plan', 'bot', 'risk', 'hide', 'range', 'from', 'to']} />
                <div className="ml-auto"><ExportCsvButton dataset="professionals" /></div>
              </div>
            }
            empty={{
              title: 'Nenhuma conta com esse recorte',
              description: 'Ajuste os filtros ou limpe a busca para ver a rede inteira.',
              icon: <Users className="h-8 w-8" />,
            }}
          />
          <ProfessionalBulkActions />
        </TableSelectionProvider>
      </div>
    </LayoutAdmin>
  );
}
