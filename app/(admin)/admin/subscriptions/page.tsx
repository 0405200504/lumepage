import React from 'react';
import Link from 'next/link';
import { CreditCard, ShoppingBag } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, FINANCEIRO_NAV } from '@/components/admin/SubNav';
import { StatStrip, Panel, Notice, EmptyState } from '@/components/admin/primitives';
import { textLink } from '@/components/admin/ui';
import { AccountStateBadge, PlanBadge, DeadlineText, Badge } from '@/components/admin/badges';
import { FilterSelect, SearchInput, ClearFilters } from '@/components/ui/TableFilters';
import { getSaasRevenue } from '@/lib/admin/business';
import { listHublaEvents } from '@/lib/admin/crm';
import { orphanKeyOf } from '@/lib/subscription/orphans';
import { accountState } from '@/lib/admin/account-state';
import { listPlansAction } from '@/app/actions/admin-plans';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { parseTableParams, RawSearchParams } from '@/lib/query-params';
import { brl, formatDateBR, formatDateTimeBR } from '@/lib/format';

export const metadata = { title: 'Assinaturas | Lume Admin' };

const BASE = '/admin/subscriptions';

type P = {
  id: string; name: string; brand_name: string; email: string; whatsapp: string | null; status: string; created_at: string;
  subscription_plan: string | null; subscription_status: string | null; subscription_ends_at: string | null; trial_ends_at: string | null;
  hubla_subscription_id: string | null;
};

const RESULT_TONE: Record<string, 'ok' | 'warn' | 'bad' | 'neutral' | 'info'> = {
  activated: 'ok', activated_unmapped: 'ok', activated_manual: 'ok', linked_manual: 'info', revoked: 'bad', past_due: 'warn',
  unmatched: 'bad', dismissed: 'neutral', sandbox: 'neutral', revoke_ignored_old_subscription: 'neutral',
  claimed_signup: 'ok', claimed_google: 'ok', claimed_admin: 'ok', linked_signup: 'info', linked_google: 'info', linked_admin: 'info',
};

export default async function AdminSubscriptionsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const session = await requireAdmin();
  const raw = await searchParams;
  const params = parseTableParams(raw, { filterKeys: ['state'] });

  const db = () => getSupabaseAdmin() || supabase;
  const [{ plans }, profsRes, unmatched, recent] = await Promise.all([
    listPlansAction(),
    isSupabaseConfigured
      ? db().from('professionals').select('id, name, brand_name, email, whatsapp, status, created_at, subscription_plan, subscription_status, subscription_ends_at, trial_ends_at, hubla_subscription_id')
        .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID).order('brand_name')
      : Promise.resolve({ data: [] }),
    listHublaEvents({ unmatchedOnly: true, limit: 100 }),
    listHublaEvents({ limit: 25 }),
  ]);
  const saas = await getSaasRevenue(plans);

  const profs = (profsRes.data || []) as P[];
  const priceOf = (key: string | null) => {
    const p = plans.find(pl => pl.key === key);
    return !p ? 0 : p.billing_cycle === 'yearly' ? Math.round(p.price_cents / 12) : p.price_cents;
  };

  // eslint-disable-next-line react-hooks/purity -- Server Component: relógio por request.
  const now = Date.now();
  const in30 = now + 30 * 86_400_000;
  const renewing = profs.filter(p => p.subscription_status === 'active' && p.subscription_ends_at && new Date(p.subscription_ends_at).getTime() >= now && new Date(p.subscription_ends_at).getTime() <= in30);
  const pastDue = profs.filter(p => p.subscription_status === 'past_due');

  let rows = profs;
  const state = params.filters.state;
  if (state === 'legacy') rows = rows.filter(p => !p.subscription_plan);
  else if (state) rows = rows.filter(p => p.subscription_status === state);
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter(p => (p.brand_name || p.name).toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.hubla_subscription_id ?? '').includes(q));
  }
  rows = [...rows].sort((a, b) => (a.subscription_ends_at ?? '9999').localeCompare(b.subscription_ends_at ?? '9999'));

  const nameOf = new Map(profs.map(p => [p.id, p.brand_name || p.name]));

  return (
    <LayoutAdmin
      session={session}
      title="Assinaturas"
      subtitle="Quem paga, quanto, até quando, e o que chegou pela Hubla."
    >
      <div className="space-y-4">
        <SubNav items={FINANCEIRO_NAV} />

        <StatStrip items={[
          { label: 'MRR', value: brl(saas.mrrCents), note: `${saas.activeSubscriptions} ativa(s)`, tone: 'accent', href: '/admin/finance' },
          { label: 'Renovam em 30 dias', value: String(renewing.length), note: brl(renewing.reduce((s, p) => s + priceOf(p.subscription_plan), 0)) + '/mês em jogo' },
          { label: 'Inadimplentes', value: String(pastDue.length), tone: pastDue.length ? 'bad' : 'default', href: `${BASE}?state=past_due` },
          { label: 'Compras órfãs', value: String(new Set(unmatched.events.map(orphanKeyOf)).size), tone: unmatched.events.length ? 'bad' : 'default', note: 'pagaram sem ter conta', href: '/admin/subscriptions/orphans' },
        ]} />

        {unmatched.events.length > 0 && (
          <Notice tone="bad" icon={<ShoppingBag />} action={<Link href="/admin/subscriptions/orphans" className={textLink}>Ver compras órfãs</Link>}>
            Tem gente que pagou na Hubla e ainda não tem conta com o e-mail da compra.
          </Notice>
        )}

        {/* ——— Lista ——— */}
        <Panel flush title={`${rows.length} conta(s)`} note="Ordenado pelo vencimento mais próximo"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <SearchInput basePath={BASE} placeholder="Conta, e-mail ou id Hubla…" className="w-56" />
              <FilterSelect basePath={BASE} name="state" label="Situação" allLabel="Situação" options={[
                { value: 'active', label: 'Ativas (pagando)' }, { value: 'trialing', label: 'Em teste' },
                { value: 'past_due', label: 'Inadimplentes' }, { value: 'canceled', label: 'Canceladas' }, { value: 'legacy', label: 'Sem plano (legadas)' },
              ]} />
              <ClearFilters basePath={BASE} keys={['q', 'state']} />
            </div>
          }>
          <div className="overflow-x-auto border-t border-line">
            <table className="admin-table min-w-full">
              <caption className="sr-only">Assinaturas por conta</caption>
              <thead>
                <tr>
                  <th scope="col">Conta</th>
                  <th scope="col">Situação</th>
                  <th scope="col">Plano</th>
                  <th scope="col" className="text-right">Valor/mês</th>
                  <th scope="col">Vence em</th>
                  <th scope="col">Hubla</th>
                  <th scope="col">Desde</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(p => {
                  const s = accountState(p);
                  return (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/professionals/${p.id}?tab=subscription`} className="block">
                          <span className="block font-semibold text-heading truncate">{p.brand_name || p.name}</span>
                          <span className="block text-caption text-n-500 truncate">{p.email}</span>
                        </Link>
                      </td>
                      <td><span className="flex flex-col items-start gap-1"><AccountStateBadge account={p} /><DeadlineText account={p} /></span></td>
                      <td><PlanBadge plan={p.subscription_plan} /></td>
                      <td className="text-right num font-semibold text-heading">{p.subscription_status === 'active' ? brl(priceOf(p.subscription_plan)) : <span className="text-n-400 font-normal">—</span>}</td>
                      <td className="num text-caption text-n-500">{s.deadline ? formatDateBR(s.deadline) : '—'}</td>
                      <td className="text-caption text-n-500 num">{p.hubla_subscription_id ? `${p.hubla_subscription_id.slice(0, 10)}…` : <span className="text-n-400">manual</span>}</td>
                      <td className="text-caption text-n-500 num">{formatDateBR(p.created_at)}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && <tr><td colSpan={7}><EmptyState icon={<CreditCard />} title="Nenhuma conta neste recorte" className="py-8" /></td></tr>}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* ——— Eventos ——— */}
        <Panel flush title="Últimos eventos da Hubla" note="Tudo o que o webhook recebeu, com o resultado">
          {!recent.available ? (
            <div className="px-5 pb-5"><Notice tone="warn">Sem a migration v37 o histórico não é guardado.</Notice></div>
          ) : recent.events.length === 0 ? (
            <EmptyState title="Nenhum evento recebido ainda" className="py-8" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {recent.events.map(e => (
                <li key={e.idempotency_key} className="px-5 py-3 flex flex-wrap items-center gap-3 text-body-sm">
                  <span className="num text-caption text-n-500 w-36">{formatDateTimeBR(e.received_at)}</span>
                  <span className="font-medium text-heading">{e.event_type ?? '—'}</span>
                  <span className="text-caption text-n-500 flex-1 min-w-[10rem] truncate">
                    {e.professional_id ? <Link href={`/admin/professionals/${e.professional_id}?tab=subscription`} className="hover:underline underline-offset-2">{nameOf.get(e.professional_id) ?? e.email ?? '—'}</Link> : (e.email ?? '—')}
                  </span>
                  <Badge tone={RESULT_TONE[e.result ?? ''] ?? (e.result?.startsWith('error') ? 'bad' : 'neutral')} dot={false}>{e.result ?? 'pendente'}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </LayoutAdmin>
  );
}
