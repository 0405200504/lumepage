import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, CheckCircle2, Circle, AlertTriangle, Info } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { EditProfessionalPanel } from '@/components/admin/EditProfessionalPanel';
import { ProfessionalActions } from '@/components/admin/ProfessionalActions';
import { AccountStateGroup, Badge, AppointmentStatusBadge } from '@/components/admin/badges';
import { StatStrip, Panel, Notice, EmptyState, KeyValue } from '@/components/admin/primitives';
import { TabNav } from '@/components/admin/SubNav';
import { textLink } from '@/components/admin/ui';
import { getProfessionalOverview, getSubscriptionHistory } from '@/lib/admin/professional-detail';
import { BarChart } from '@/components/admin/BarChart';
import { listConversations } from '@/lib/admin/queries';
import { parseTableParams } from '@/lib/query-params';
import { getAccessOverview, METHOD_LABEL } from '@/lib/admin/access';
import { AccessPanel, AccessPanelData } from '@/components/admin/AccessPanel';
import { readAuditLog } from '@/lib/audit';
import { getAccountMeta, listNotes, getTimeline, listHublaEvents, MIGRATION_CRM, TimelineItem } from '@/lib/admin/crm';
import { NotesList, AccountMetaForm } from '@/components/admin/NotesPanel';
import { ExtendAccessButton } from '@/components/admin/ExtendAccessButton';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { brl, formatDateBR, formatDateTimeBR, formatTimeBR, formatDurationBR, pct } from '@/lib/format';

export const metadata = { title: 'Conta | Lume Admin' };

/**
 * DETALHE DA CONTA — seis abas.
 *
 * Eram treze. Agenda, Serviços, Bot, Página pública, Financeiro e Conversas eram
 * espelhos do painel da profissional — e "Entrar como" abre o painel dela de
 * verdade, em uma aba, com tudo funcionando. O que sobrou é o que só o admin
 * enxerga: números consolidados, assinatura, acesso, atividade recente, dados
 * cadastrais e a trilha do que o suporte fez aqui.
 */
type Tab = 'overview' | 'subscription' | 'access' | 'activity' | 'notes' | 'data' | 'timeline';

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Visão geral' },
  { key: 'subscription', label: 'Assinatura' },
  { key: 'access', label: 'Acesso' },
  { key: 'activity', label: 'Atividade' },
  { key: 'notes', label: 'Notas' },
  { key: 'data', label: 'Dados' },
  { key: 'timeline', label: 'Linha do tempo' },
];

/** Links antigos (`?tab=bot`, `?tab=agenda`…) caem na aba que herdou o conteúdo. */
const LEGACY_TAB: Record<string, Tab> = {
  bot: 'overview', services: 'overview', finance: 'overview', page: 'overview',
  agenda: 'activity', appointments: 'activity', clients: 'activity', conversations: 'activity',
  settings: 'data', logs: 'timeline', history: 'timeline',
};

const KIND_LABEL: Record<TimelineItem['kind'], string> = {
  conta: 'conta', assinatura: 'assinatura', acesso: 'acesso', suporte: 'suporte', nota: 'nota', pagamento: 'pagamento', agenda: 'agenda', tarefa: 'tarefa',
};
const KIND_TONE: Record<TimelineItem['kind'], 'ok' | 'warn' | 'bad' | 'neutral' | 'accent' | 'info'> = {
  conta: 'info', assinatura: 'accent', acesso: 'neutral', suporte: 'warn', nota: 'accent', pagamento: 'ok', agenda: 'ok', tarefa: 'neutral',
};

export default async function ProfessionalDetailPage({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const rawTab = (Array.isArray(sp.tab) ? sp.tab[0] : sp.tab) ?? 'overview';
  const active: Tab = TABS.some(t => t.key === rawTab) ? (rawTab as Tab) : LEGACY_TAB[rawTab] ?? 'overview';

  const data = await getProfessionalOverview(id);
  if (!data) notFound();

  const { professional: p, kpis, monthly, onboarding, alerts, bot, services, topServices, recentAppointments, recentClients } = data;
  const db = () => getSupabaseAdmin() || supabase;
  const [history, audit, accessData, conversations, metaRes, notesRes, timeline, hublaRes, adminsRes] = await Promise.all([
    active === 'subscription' ? getSubscriptionHistory(id) : Promise.resolve([]),
    active === 'access'
      ? readAuditLog({ entityType: 'professional', entityId: id, limit: 100 })
      : Promise.resolve({ rows: [], total: 0 }),
    active === 'access' ? getAccessOverview(id) : Promise.resolve(null),
    active === 'activity'
      ? listConversations(
          parseTableParams({ prof: id, size: '10' }, { filterKeys: ['prof', 'state'], defaultSort: 'last' }),
          new Map([[id, p.brand_name || p.name]]),
        )
      : Promise.resolve(null),
    getAccountMeta(id),
    active === 'notes' ? listNotes(id) : Promise.resolve({ notes: [], available: true }),
    active === 'timeline' ? getTimeline(id, p.created_at, p.onboarding_completed_at) : Promise.resolve([] as TimelineItem[]),
    active === 'subscription' ? listHublaEvents({ professionalId: id, limit: 30 }) : Promise.resolve({ events: [], available: true }),
    active === 'notes' && isSupabaseConfigured
      ? db().from('profiles').select('email').eq('role', 'super_admin')
      : Promise.resolve({ data: [] as { email: string }[] }),
  ]);
  const meta = metaRes.meta;
  const admins = ((adminsRes.data || []) as { email: string }[]).map(a => a.email).filter(Boolean);

  const accessPanel: AccessPanelData | null = accessData && {
    professionalId: id,
    brandName: p.brand_name || p.name,
    loginEmail: accessData.loginEmail,
    businessEmail: p.email,
    loginEmailMatchesBusiness: accessData.loginEmailMatchesBusiness,
    methodLabel: METHOD_LABEL[accessData.method],
    method: accessData.method,
    hasAuthUser: !!accessData.auth,
    passwordSetAt: accessData.passwordSetAt,
    mustChangePassword: accessData.mustChangePassword,
    lastSignInAt: accessData.auth?.lastSignInAt ?? null,
    lastIp: accessData.history.find(h => h.success)?.ip ?? null,
    lastDevice: accessData.history.find(h => h.success)?.user_agent ?? null,
    signIns30d: accessData.signInsLast30d,
    activeSessions: accessData.auth?.activeSessions ?? -1,
    emailConfirmedAt: accessData.auth?.emailConfirmedAt ?? null,
    available: accessData.available,
    reason: accessData.reason,
    history: accessData.history.map(h => ({
      id: h.id, method: h.method, success: h.success, ip: h.ip,
      userAgent: h.user_agent, impersonatedBy: h.impersonated_by, createdAt: h.created_at,
    })),
    supportActions: audit.rows
      .filter(r => r.action.startsWith('access.') || r.action.startsWith('professional.impersonate'))
      .slice(0, 20)
      .map(r => ({ id: r.id, action: r.action, adminEmail: r.admin_email, createdAt: r.created_at })),
  };

  const activeServices = services.filter(s => s.is_active).length;
  const check = (ok: boolean, label: string, bad = false) => (
    <li className="flex items-center gap-2.5 text-body-sm">
      {ok
        ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />
        : bad ? <AlertTriangle className="h-4 w-4 text-danger shrink-0" aria-hidden /> : <Circle className="h-4 w-4 text-n-300 shrink-0" aria-hidden />}
      <span className={ok ? 'text-heading' : bad ? 'text-danger font-semibold' : 'text-n-500'}>{label}</span>
    </li>
  );

  return (
    <LayoutAdmin
      session={session}
      title={p.brand_name || p.name}
      subtitle={`${p.name} · ${p.email} · cadastrada em ${formatDateBR(p.created_at)}`}
      backHref="/admin/professionals"
      backLabel="Contas"
      actions={
        <>
          <ProfessionalActions
            id={p.id}
            brandName={p.brand_name || p.name}
            status={p.status}
            plan={p.subscription_plan ?? null}
            subscriptionStatus={p.subscription_status ?? null}
            endsAt={p.subscription_ends_at ?? p.trial_ends_at ?? null}
          />
          <ExtendAccessButton id={p.id} brandName={p.brand_name || p.name} />
        </>
      }
    >
      <div className="space-y-4">
        {/* Identidade + abas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabNav items={TABS} active={active} basePath={`/admin/professionals/${id}`} />
          <div className="flex flex-wrap items-center gap-2.5 px-1">
            <AccountStateGroup account={p} />
            <Link href={`/agendar/${p.slug}`} target="_blank" className={`inline-flex items-center gap-1 ${textLink}`}>
              /agendar/{p.slug} <ExternalLink className="h-3 w-3" />
            </Link>
            {meta.owner_email && <Badge tone="neutral" dot={false} title="Responsável na Lume">{meta.owner_email}</Badge>}
            {meta.tags.map(t => <Badge key={t} tone="accent" dot={false}>{t}</Badge>)}
            {meta.next_follow_up && (
              <Badge tone={meta.next_follow_up <= new Date().toISOString().slice(0, 10) ? 'warn' : 'info'} dot={false}>
                contato {formatDateBR(meta.next_follow_up)}
              </Badge>
            )}
          </div>
        </div>

        {/* ————— Visão geral ————— */}
        {active === 'overview' && (
          <div className="space-y-4">
            {alerts.length > 0 && (
              <div className="grid gap-2 sm:grid-cols-2">
                {alerts.map((a, i) => (
                  <Notice key={i} tone={a.level === 'bad' ? 'bad' : a.level === 'warn' ? 'warn' : 'info'}
                    icon={a.level === 'info' ? <Info /> : <AlertTriangle />}>
                    {a.text}
                  </Notice>
                ))}
              </div>
            )}

            <StatStrip items={[
              { label: 'Faturamento 30d', value: brl(kpis.revenue30dCents), note: `total ${brl(kpis.revenueTotalCents)}`, tone: 'accent' },
              { label: 'Agendamentos 30d', value: String(kpis.appointments30d), note: `total ${kpis.appointmentsTotal}` },
              { label: 'Clientes', value: String(kpis.clients), note: `ticket médio ${brl(kpis.ticketCents)}` },
              { label: 'Comparecimento', value: pct(kpis.completionRate, 0), note: `faltas ${pct(kpis.noShowRate, 0)}`, tone: kpis.noShowRate > 15 ? 'warn' : 'default' },
            ]} />

            <div className="grid gap-4 lg:grid-cols-12">
              <Panel title="Agendamentos por mês" className="lg:col-span-7">
                <BarChart points={monthly.map(m => ({ label: m.label, value: m.count }))} format={v => String(Math.round(v))} />
              </Panel>

              <Panel title="Ativação" note="O que a conta já configurou" className="lg:col-span-5">
                <ul className="space-y-2.5">
                  {onboarding.map(step => (
                    <li key={step.label} className="flex items-center gap-2.5 text-body-sm">
                      {step.done
                        ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden />
                        : <Circle className="h-4 w-4 text-n-300 shrink-0" aria-hidden />}
                      <span className={step.done ? 'text-heading' : 'text-n-500'}>{step.label}</span>
                      {step.hint && <span className="ml-auto text-caption text-n-500 num">{step.hint}</span>}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <div className="grid gap-4 lg:grid-cols-12">
              <Panel title="WhatsApp e página pública" note="Ligar o bot e editar a persona é feito no painel dela: use “Entrar como”." className="lg:col-span-5">
                <dl>
                  <KeyValue label="Servidor uazapi">{bot.configured ? <Badge tone="ok">configurado</Badge> : <Badge tone="neutral">não configurado</Badge>}</KeyValue>
                  <KeyValue label="Bot">{bot.enabled ? <Badge tone="ok">ligado</Badge> : <Badge tone="neutral">desligado</Badge>}</KeyValue>
                  <KeyValue label="Automações">{bot.automationsOn ? <Badge tone="ok">ativas</Badge> : <Badge tone="neutral">desligadas</Badge>}</KeyValue>
                  <KeyValue label="Número">{bot.number ?? '—'}</KeyValue>
                  <KeyValue label="Mensagens no mês">{bot.messagesMonth}</KeyValue>
                  <KeyValue label="Conversas esperando humano">
                    {bot.conversationsWaiting > 0
                      ? <Link href={`/admin/conversations?prof=${id}&state=waiting`} className="text-warning font-semibold hover:underline">{bot.conversationsWaiting}</Link>
                      : '0'}
                  </KeyValue>
                </dl>
                <ul className="space-y-2 mt-4 pt-4 border-t border-line">
                  {check(activeServices > 0, `${activeServices} serviço(s) ativo(s) para escolher`, true)}
                  {check(!!p.logo_url, 'Logo da marca')}
                  {check(!!p.public_bio, 'Texto de apresentação')}
                  {check(!!p.whatsapp, 'WhatsApp de contato')}
                </ul>
              </Panel>

              <Panel flush title={`Serviços (${services.length})`} note="É isto que a cliente vê na página de agendamento" className="lg:col-span-7">
                {services.length === 0 ? (
                  <EmptyState icon={<AlertTriangle className="text-danger" />} title="Nenhum serviço cadastrado" description="A página de agendamento dela está vazia: ninguém consegue marcar horário." />
                ) : (
                  <div className="overflow-x-auto border-t border-line">
                    <table className="admin-table min-w-full">
                      <caption className="sr-only">Serviços da profissional com preço e duração</caption>
                      <thead>
                        <tr>
                          <th scope="col">Serviço</th>
                          <th scope="col" className="text-right">Duração</th>
                          <th scope="col" className="text-right">Preço</th>
                          <th scope="col" className="text-right">Vendas</th>
                          <th scope="col">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map(s => {
                          const sold = topServices.find(t => t.name === s.name);
                          return (
                            <tr key={s.id}>
                              <td>
                                <span className="block font-semibold text-heading">{s.name}</span>
                                {s.description && <span className="block text-caption text-n-500 truncate max-w-md">{s.description}</span>}
                              </td>
                              <td className="text-right num text-n-500">{s.duration_minutes} min</td>
                              <td className="text-right num font-semibold text-heading">{brl(s.price_cents)}</td>
                              <td className="text-right num text-n-500">{sold ? `${sold.count}×` : '—'}</td>
                              <td>{s.is_active ? <Badge tone="ok">ativo</Badge> : <Badge tone="neutral">inativo</Badge>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>
          </div>
        )}

        {/* ————— Assinatura ————— */}
        {active === 'subscription' && (
          <div className="space-y-4">
            <StatStrip items={[
              { label: 'Plano', value: p.subscription_plan ? p.subscription_plan : 'Legada' },
              { label: 'Situação', value: p.subscription_status ?? '—' },
              { label: 'Teste termina', value: formatDateBR(p.trial_ends_at, '—') },
              { label: 'Acesso vence', value: formatDateBR(p.subscription_ends_at, '—') },
            ]} />

            <div className="grid gap-4 lg:grid-cols-2">
            <Panel flush title="Histórico de mudanças" note="Cada troca de plano ou situação, com quem fez e quando">
              {history.length === 0 ? (
                <EmptyState title="Nenhuma mudança registrada" description="O histórico começa a ser gravado a partir da migration v33." />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {history.map(h => (
                    <li key={h.id} className="px-5 py-3 flex flex-wrap items-center gap-2 text-body-sm">
                      <span className="num text-caption text-n-500">{formatDateTimeBR(h.created_at)}</span>
                      <Badge tone="accent">{h.plan_key ?? 'sem plano'}</Badge>
                      <span className="text-n-500">{h.status}</span>
                      {h.current_period_end && <span className="text-n-500">até {formatDateBR(h.current_period_end)}</span>}
                      {h.note && <span className="text-heading">“{h.note}”</span>}
                      <span className="ml-auto text-caption text-n-500">{h.changed_by}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel flush title="Pagamentos (Hubla)" note={hublaRes.available ? 'Eventos do webhook ligados a esta conta' : 'Requer a migration v37'}>
              {hublaRes.events.length === 0 ? (
                <EmptyState title="Nenhum evento da Hubla" description={p.hubla_subscription_id ? `Assinatura ${p.hubla_subscription_id}` : 'Esta conta nunca passou pelo checkout, ou o plano foi definido à mão.'} />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {hublaRes.events.map(e => (
                    <li key={e.idempotency_key} className="px-5 py-3 flex flex-wrap items-center gap-2 text-body-sm">
                      <span className="num text-caption text-n-500 w-36">{formatDateTimeBR(e.received_at)}</span>
                      <span className="font-medium text-heading flex-1">{e.event_type ?? '—'}</span>
                      <Badge tone={e.result?.startsWith('activated') ? 'ok' : e.result === 'revoked' ? 'bad' : e.result === 'past_due' ? 'warn' : 'neutral'} dot={false}>{e.result ?? 'pendente'}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            </div>
          </div>
        )}

        {/* ————— Notas ————— */}
        {active === 'notes' && (
          !metaRes.available || !notesRes.available ? (
            <Notice tone="warn" icon={<AlertTriangle />}>Rode <code className="font-mono">{MIGRATION_CRM}</code> no Supabase para ativar notas e o CRM da conta.</Notice>
          ) : (
            <div className="grid gap-4 lg:grid-cols-12">
              <Panel title="Relacionamento" note="Quem cuida, como está etiquetada e quando é o próximo contato" className="lg:col-span-5">
                <AccountMetaForm meta={meta} admins={admins} whatsapp={p.whatsapp} brandName={p.brand_name || p.name} />
              </Panel>
              <Panel title="Notas de suporte" note="Ligações, pedidos, promessas, problemas. Fixe as que importam." className="lg:col-span-7">
                <NotesList professionalId={id} notes={notesRes.notes} />
              </Panel>
            </div>
          )
        )}

        {/* ————— Linha do tempo ————— */}
        {active === 'timeline' && (
          <Panel flush title="Linha do tempo" note="Tudo o que aconteceu com esta conta, de todas as fontes">
            {timeline.length === 0 ? (
              <EmptyState title="Nada registrado ainda" />
            ) : (
              <ol className="divide-y divide-line border-t border-line">
                {timeline.map((t, i) => (
                  <li key={i} className="px-5 py-3 flex flex-wrap items-start gap-3 text-body-sm">
                    <span className="num text-caption text-n-500 w-36 shrink-0 pt-0.5">{formatDateTimeBR(t.at)}</span>
                    <Badge tone={KIND_TONE[t.kind]} dot={false} className="shrink-0">{KIND_LABEL[t.kind]}</Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-heading">{t.title}</span>
                      {t.detail && <span className="block text-caption text-n-500 whitespace-pre-wrap break-words">{t.detail}</span>}
                    </span>
                    {t.by && <span className="text-caption text-n-500 shrink-0">{t.by}</span>}
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        )}

        {/* ————— Acesso ————— */}
        {active === 'access' && (
          accessPanel
            ? <AccessPanel data={accessPanel} />
            : <div className="card"><EmptyState title="Dados de acesso indisponíveis para esta conta" /></div>
        )}

        {/* ————— Atividade ————— */}
        {active === 'activity' && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel flush title="Últimos agendamentos" action={<Link href={`/admin/appointments?prof=${id}`} className={textLink}>Ver todos</Link>}>
              <ul className="divide-y divide-line border-t border-line">
                {recentAppointments.map(a => (
                  <li key={a.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-body-sm">
                    <span className="num text-caption text-n-500 w-28">{formatDateBR(a.date)} · {formatTimeBR(a.start_time)}</span>
                    <span className="font-semibold text-heading flex-1 min-w-[8rem] truncate">{a.client_name}</span>
                    <span className="text-caption text-n-500 truncate max-w-[10rem]">{a.service?.name}</span>
                    <AppointmentStatusBadge status={a.status} />
                  </li>
                ))}
                {recentAppointments.length === 0 && <li><EmptyState title="Nenhum agendamento" className="py-8" /></li>}
              </ul>
            </Panel>

            <Panel flush title="Clientes recentes" action={<Link href={`/admin/clients?prof=${id}`} className={textLink}>Ver todas</Link>}>
              <ul className="divide-y divide-line border-t border-line">
                {recentClients.map(c => (
                  <li key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-body-sm">
                    <span className="font-semibold text-heading flex-1 min-w-[10rem] truncate">{c.name}</span>
                    <span className="text-caption text-n-500 num">{c.whatsapp}</span>
                    <span className="text-caption text-n-500 num">{c.total_appointments ?? 0} visita(s)</span>
                    <span className="text-caption text-n-500 num">{formatDateBR(c.last_appointment_at, 'nunca')}</span>
                  </li>
                ))}
                {recentClients.length === 0 && <li><EmptyState title="Nenhuma cliente" className="py-8" /></li>}
              </ul>
            </Panel>

            <Panel flush title="Conversas do WhatsApp" className="lg:col-span-2" action={<Link href={`/admin/conversations?prof=${id}`} className={textLink}>Abrir na fila</Link>}>
              {!conversations || conversations.rows.length === 0 ? (
                <EmptyState title="Nenhuma conversa registrada" className="py-8" />
              ) : (
                <ul className="divide-y divide-line border-t border-line">
                  {conversations.rows.map(c => (
                    <li key={c.id} className="px-5 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm">
                      <Link href={`/admin/conversations/${c.id}`} className="font-semibold text-heading hover:underline underline-offset-2 w-36 shrink-0 num">{c.clientPhone}</Link>
                      <span className="text-caption text-n-500 flex-1 min-w-[10rem] truncate">{c.lastMessage || '—'}</span>
                      <span className="text-caption text-n-500 num">{c.messageCount} msg</span>
                      {c.botPaused
                        ? <Badge tone="warn">esperando {formatDurationBR(c.waitingHours * 3_600_000)}</Badge>
                        : <Badge tone="neutral">bot atendendo</Badge>}
                      <span className="text-caption text-n-500 num w-32 text-right">{formatDateTimeBR(c.lastMessageAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        )}

        {/* ————— Dados ————— */}
        {active === 'data' && <EditProfessionalPanel professional={p} />}

      </div>
    </LayoutAdmin>
  );
}
