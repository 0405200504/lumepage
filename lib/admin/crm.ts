import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { accountState, AccountStateInput, AccountState } from './account-state';
import type { ProfessionalRow } from './queries';

/**
 * CRM DO ADMIN — o que o painel precisa para GERIR contas, não só olhá-las.
 * ----------------------------------------------------------------------
 * Metadados por conta (responsável, etiquetas, próximo contato), notas,
 * tarefas, alertas adiados, saúde e etapa do ciclo de vida, linha do tempo e a
 * fila de pagamentos sem dona da Hubla. Tudo com fallback: se a migration v41
 * não rodou, cada função devolve `available: false` e a tela avisa.
 */

const db = () => getSupabaseAdmin() || supabase;

export const MIGRATION_CRM = 'supabase/migration_v41_admin_360.sql';

/** Tabela ausente (migration não aplicada) — o mesmo teste de lib/audit.ts. */
export const isMissingTable = (error: { code?: string; message?: string } | null | undefined): boolean =>
  !!error && (error.code === '42P01' || error.code === 'PGRST205'
    || /does not exist|could not find the table|schema cache/i.test(error.message || ''));

// ═══════════════════════════════ META ═══════════════════════════════

export interface AccountMeta {
  professional_id: string;
  owner_email: string | null;
  tags: string[];
  next_follow_up: string | null;
  churn_reason: string | null;
  updated_by: string | null;
  updated_at: string;
}

export const EMPTY_META = (id: string): AccountMeta => ({
  professional_id: id, owner_email: null, tags: [], next_follow_up: null, churn_reason: null, updated_by: null, updated_at: '',
});

export async function getAccountMeta(id: string): Promise<{ meta: AccountMeta; available: boolean }> {
  if (!isSupabaseConfigured) return { meta: EMPTY_META(id), available: false };
  const { data, error } = await db().from('admin_account_meta').select('*').eq('professional_id', id).maybeSingle();
  if (error) return { meta: EMPTY_META(id), available: !isMissingTable(error) };
  return { meta: (data as AccountMeta | null) ?? EMPTY_META(id), available: true };
}

/** Todos os metadados, indexados por conta — para a lista e para os filtros. */
export async function listAccountMeta(): Promise<{ byId: Map<string, AccountMeta>; available: boolean }> {
  if (!isSupabaseConfigured) return { byId: new Map(), available: false };
  const { data, error } = await db().from('admin_account_meta').select('*').limit(5000);
  if (error) return { byId: new Map(), available: !isMissingTable(error) };
  return { byId: new Map(((data || []) as AccountMeta[]).map(m => [m.professional_id, m])), available: true };
}

// ═══════════════════════════════ NOTAS ═══════════════════════════════

export interface AdminNote {
  id: string;
  professional_id: string;
  admin_email: string | null;
  body: string;
  pinned: boolean;
  created_at: string;
}

export async function listNotes(professionalId: string): Promise<{ notes: AdminNote[]; available: boolean }> {
  if (!isSupabaseConfigured) return { notes: [], available: false };
  const { data, error } = await db().from('admin_notes').select('*')
    .eq('professional_id', professionalId)
    .order('pinned', { ascending: false }).order('created_at', { ascending: false }).limit(200);
  if (error) return { notes: [], available: !isMissingTable(error) };
  return { notes: (data || []) as AdminNote[], available: true };
}

// ═══════════════════════════════ TAREFAS ═══════════════════════════════

export interface AdminTask {
  id: string;
  title: string;
  professional_id: string | null;
  professional_name?: string | null;
  due_date: string | null;
  done_at: string | null;
  created_by: string | null;
  source: string | null;
  created_at: string;
}

export async function listTasks(opts: { professionalId?: string; includeDone?: boolean; limit?: number } = {})
  : Promise<{ tasks: AdminTask[]; available: boolean }> {
  if (!isSupabaseConfigured) return { tasks: [], available: false };
  let q = db().from('admin_tasks').select('*').limit(opts.limit ?? 200);
  if (opts.professionalId) q = q.eq('professional_id', opts.professionalId);
  if (!opts.includeDone) q = q.is('done_at', null);
  const { data, error } = await q.order('done_at', { ascending: true, nullsFirst: true })
    .order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) return { tasks: [], available: !isMissingTable(error) };

  const tasks = (data || []) as AdminTask[];
  const ids = [...new Set(tasks.map(t => t.professional_id).filter((v): v is string => !!v))];
  if (ids.length) {
    const { data: profs } = await db().from('professionals').select('id, name, brand_name').in('id', ids);
    const names = new Map(((profs || []) as { id: string; name: string; brand_name: string }[]).map(p => [p.id, p.brand_name || p.name]));
    for (const t of tasks) t.professional_name = t.professional_id ? names.get(t.professional_id) ?? null : null;
  }
  return { tasks, available: true };
}

// ═══════════════════════════════ ALERTAS ADIADOS ═══════════════════════════════

export async function getSnoozes(): Promise<Map<string, string>> {
  if (!isSupabaseConfigured) return new Map();
  const { data, error } = await db().from('admin_alert_snoozes').select('key, until').gt('until', new Date().toISOString());
  if (error) return new Map();
  return new Map(((data || []) as { key: string; until: string }[]).map(s => [s.key, s.until]));
}

// ═══════════════════════════════ SAÚDE E ETAPA ═══════════════════════════════

export type Stage = 'nova' | 'sem-ativar' | 'ativa' | 'parada' | 'vencida' | 'pausada' | 'cancelada';

export const STAGE_LABEL: Record<Stage, string> = {
  nova: 'Nova', 'sem-ativar': 'Sem ativar', ativa: 'Ativa', parada: 'Parada',
  vencida: 'Vencida', pausada: 'Pausada', cancelada: 'Cancelada',
};

export const STAGE_TONE: Record<Stage, 'ok' | 'warn' | 'bad' | 'neutral' | 'info'> = {
  nova: 'info', 'sem-ativar': 'warn', ativa: 'ok', parada: 'warn', vencida: 'bad', pausada: 'neutral', cancelada: 'bad',
};

export interface HealthInput extends AccountStateInput {
  appts30d: number;
  lastSignInAt: string | null;
  hasServices: boolean;
  clients: number;
  botConfigured: boolean;
  botEnabled: boolean;
  everHadAppointment: boolean;
  created_at: string;
}

export interface Health {
  score: number;
  label: 'Saudável' | 'Atenção' | 'Risco';
  tone: 'ok' | 'warn' | 'bad';
  stage: Stage;
  /** O que puxa a nota para baixo, em ordem de peso. */
  gaps: string[];
}

const daysSince = (iso: string | null | undefined): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000) : null;

/**
 * Nota de 0 a 100. Não é ciência: é a leitura que um gerente de contas faria
 * olhando a linha — ela usa, ela entra, ela configurou, ela paga.
 */
export function healthOf(p: HealthInput): Health {
  const state = accountState(p);
  const gaps: string[] = [];
  let score = 0;

  if (state.hasAccess) score += 20; else gaps.push(state.label.toLowerCase());

  const signedIn = daysSince(p.lastSignInAt);
  if (signedIn !== null && signedIn <= 14) score += 20;
  else if (signedIn !== null && signedIn <= 30) { score += 10; gaps.push('sem entrar há mais de 14 dias'); }
  else gaps.push(signedIn === null ? 'nunca entrou' : 'sem entrar há mais de 30 dias');

  if (p.appts30d >= 8) score += 25;
  else if (p.appts30d >= 3) { score += 15; gaps.push('poucos agendamentos'); }
  else if (p.appts30d >= 1) { score += 8; gaps.push('quase sem agendamentos'); }
  else gaps.push('nenhum agendamento em 30 dias');

  if (p.hasServices) score += 10; else gaps.push('sem serviços');
  if (p.clients > 0) score += 10; else gaps.push('sem clientes');
  if (p.botConfigured) score += p.botEnabled ? 15 : 10; else gaps.push('sem bot');

  score = Math.min(100, score);

  const created = daysSince(p.created_at) ?? 0;
  let stage: Stage;
  const s: AccountState = state.state;
  if (s === 'cancelled') stage = 'cancelada';
  else if (s === 'paused') stage = 'pausada';
  else if (s === 'expired') stage = 'vencida';
  else if (!p.everHadAppointment) stage = created <= 14 ? 'nova' : 'sem-ativar';
  else if (p.appts30d === 0) stage = 'parada';
  else stage = 'ativa';

  const label = score >= 70 ? 'Saudável' : score >= 40 ? 'Atenção' : 'Risco';
  return { score, label, tone: label === 'Saudável' ? 'ok' : label === 'Atenção' ? 'warn' : 'bad', stage, gaps: gaps.slice(0, 3) };
}

/** Contas que já tiveram ao menos um agendamento (qualquer data). */
export async function everHadAppointmentSet(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data } = await db().from('appointments').select('professional_id')
    .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID).limit(50000);
  return new Set(((data || []) as { professional_id: string }[]).map(a => a.professional_id));
}

export async function servicesSet(): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set();
  const { data } = await db().from('services').select('professional_id').limit(20000);
  return new Set(((data || []) as { professional_id: string }[]).map(s => s.professional_id));
}

export function healthOfRow(r: ProfessionalRow, everHad: Set<string>, withServices: Set<string>): Health {
  return healthOf({
    status: r.status,
    subscription_status: r.subscriptionStatus,
    subscription_plan: r.plan,
    subscription_ends_at: r.subscriptionEndsAt,
    trial_ends_at: r.trialEndsAt,
    created_at: r.createdAt,
    appts30d: r.appts30d,
    lastSignInAt: r.lastSignInAt,
    hasServices: withServices.has(r.id),
    clients: r.clients,
    botConfigured: r.botConfigured,
    botEnabled: r.botEnabled,
    everHadAppointment: everHad.has(r.id),
  });
}

// ═══════════════════════════════ LINHA DO TEMPO ═══════════════════════════════

export interface TimelineItem {
  at: string;
  kind: 'conta' | 'assinatura' | 'acesso' | 'suporte' | 'nota' | 'pagamento' | 'agenda' | 'tarefa';
  title: string;
  detail?: string | null;
  by?: string | null;
}

/** Tudo o que aconteceu com a conta, de todas as fontes, mais recente primeiro. */
export async function getTimeline(professionalId: string, created_at: string, onboardingAt?: string | null): Promise<TimelineItem[]> {
  if (!isSupabaseConfigured) return [];
  const safe = async <T,>(p: PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> => {
    try { const r = await p; return (r.data || []) as T[]; } catch { return []; }
  };

  const [subs, access, audit, notes, hubla, tasks, firstAppt] = await Promise.all([
    safe<{ created_at: string; plan_key: string | null; status: string | null; current_period_end: string | null; note: string | null; changed_by: string | null }>(
      db().from('subscription_events').select('*').eq('professional_id', professionalId).order('created_at', { ascending: false }).limit(50)),
    safe<{ created_at: string; method: string; success: boolean; impersonated_by: string | null; ip: string | null }>(
      db().from('access_events').select('created_at, method, success, impersonated_by, ip').eq('professional_id', professionalId).order('created_at', { ascending: false }).limit(40)),
    safe<{ created_at: string; action: string; admin_email: string | null; after: unknown }>(
      db().from('admin_audit_log').select('created_at, action, admin_email, after').eq('entity_type', 'professional').eq('entity_id', professionalId).order('created_at', { ascending: false }).limit(60)),
    safe<AdminNote>(db().from('admin_notes').select('*').eq('professional_id', professionalId).order('created_at', { ascending: false }).limit(50)),
    safe<{ received_at: string; event_type: string | null; result: string | null; email: string | null }>(
      db().from('hubla_webhook_events').select('received_at, event_type, result, email').eq('professional_id', professionalId).order('received_at', { ascending: false }).limit(30)),
    safe<AdminTask>(db().from('admin_tasks').select('*').eq('professional_id', professionalId).not('done_at', 'is', null).order('done_at', { ascending: false }).limit(20)),
    safe<{ date: string; created_at: string }>(db().from('appointments').select('date, created_at').eq('professional_id', professionalId).is('deleted_at', null).order('created_at', { ascending: true }).limit(1)),
  ]);

  const METHOD: Record<string, string> = { password: 'senha', google: 'Google', magic: 'link mágico', impersonation: 'suporte (entrar como)', temp_password: 'senha temporária' };
  const items: TimelineItem[] = [
    { at: created_at, kind: 'conta', title: 'Conta criada' },
    ...(onboardingAt ? [{ at: onboardingAt, kind: 'conta' as const, title: 'Completou o cadastro' }] : []),
    ...firstAppt.map(a => ({ at: a.created_at, kind: 'agenda' as const, title: 'Primeiro agendamento', detail: `para ${a.date}` })),
    ...subs.map(s => ({ at: s.created_at, kind: 'assinatura' as const, title: `Plano ${s.plan_key ?? 'sem plano'} · ${s.status ?? '—'}`, detail: s.note, by: s.changed_by })),
    ...access.map(a => ({
      at: a.created_at, kind: 'acesso' as const,
      title: a.impersonated_by ? `Suporte entrou na conta` : a.success ? `Entrou por ${METHOD[a.method] ?? a.method}` : `Falha de login por ${METHOD[a.method] ?? a.method}`,
      detail: a.ip, by: a.impersonated_by,
    })),
    ...audit
      .filter(r => !r.action.startsWith('professional.impersonate'))
      .map(r => ({ at: r.created_at, kind: 'suporte' as const, title: r.action, detail: summarize(r.after), by: r.admin_email })),
    ...notes.map(n => ({ at: n.created_at, kind: 'nota' as const, title: n.pinned ? 'Nota fixada' : 'Nota', detail: n.body, by: n.admin_email })),
    ...hubla.map(h => ({ at: h.received_at, kind: 'pagamento' as const, title: `Hubla · ${h.event_type ?? 'evento'}`, detail: `${h.result ?? '—'}${h.email ? ` · ${h.email}` : ''}` })),
    ...tasks.map(t => ({ at: t.done_at as string, kind: 'tarefa' as const, title: `Tarefa concluída: ${t.title}`, by: t.created_by })),
  ];
  return items.filter(i => i.at).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 150);
}

function summarize(v: unknown): string | null {
  if (!v || typeof v !== 'object') return null;
  try {
    const s = JSON.stringify(v);
    return s.length > 140 ? `${s.slice(0, 140)}…` : s;
  } catch { return null; }
}

// ═══════════════════════════════ ASSINATURAS E HUBLA ═══════════════════════════════

export interface HublaEventRow {
  idempotency_key: string;
  event_type: string | null;
  email: string | null;
  subscription_id: string | null;
  invoice_id: string | null;
  professional_id: string | null;
  result: string | null;
  payload: unknown;
  received_at: string;
  processed_at: string | null;
}

export async function listHublaEvents(opts: { unmatchedOnly?: boolean; professionalId?: string; limit?: number } = {})
  : Promise<{ events: HublaEventRow[]; available: boolean }> {
  if (!isSupabaseConfigured) return { events: [], available: false };
  let q = db().from('hubla_webhook_events').select('*').order('received_at', { ascending: false }).limit(opts.limit ?? 50);
  if (opts.unmatchedOnly) q = q.eq('result', 'unmatched');
  if (opts.professionalId) q = q.eq('professional_id', opts.professionalId);
  const { data, error } = await q;
  if (error) return { events: [], available: !isMissingTable(error) };
  return { events: (data || []) as HublaEventRow[], available: true };
}

/** Nome/telefone que vieram no payload (para o admin achar a conta certa). */
export function hublaPayerOf(payload: unknown): { name: string | null; phone: string | null; offer: string | null } {
  const p = payload as { event?: { user?: { name?: string; firstName?: string; lastName?: string; phone?: string }; product?: { id?: string; name?: string } } } | null;
  const u = p?.event?.user;
  const name = u?.name ?? [u?.firstName, u?.lastName].filter(Boolean).join(' ') ?? null;
  return { name: name || null, phone: u?.phone ?? null, offer: p?.event?.product?.name ?? p?.event?.product?.id ?? null };
}

// ═══════════════════════════════ SAÚDE DO SISTEMA ═══════════════════════════════

export interface MigrationProbe { label: string; file: string; table?: string; column?: string; fn?: string }

/**
 * As migrations que o código depende para funcionar por completo.
 * Só entram funções SEM parâmetros: chamar pelo PostgREST uma função que exige
 * argumentos devolve "não encontrada" mesmo quando ela existe (caso da v31).
 */
export const MIGRATION_PROBES: MigrationProbe[] = [
  { label: 'Financeiro, tarefas e sinal', file: 'migration_v3.sql', table: 'transactions' },
  { label: 'Grupos (salões)', file: 'migration_v6.sql', table: 'salons' },
  { label: 'Lista de espera', file: 'migration_v7.sql', table: 'waitlist_entries' },
  { label: 'WhatsApp e bot', file: 'migration_v8.sql', table: 'whatsapp_settings' },
  { label: 'Estatísticas do banco', file: 'migration_v21_admin_stats.sql', fn: 'get_db_stats' },
  { label: 'Lixeira de contas', file: 'migration_v23_prof_trash.sql', table: 'professionals', column: 'deleted_at' },
  { label: 'Custo por serviço', file: 'migration_v24_service_cost.sql', table: 'services', column: 'cost_cents' },
  { label: 'Google Agenda', file: 'migration_v25_google_calendar.sql', table: 'google_calendar_connections' },
  { label: 'Planos por conta', file: 'migration_v27_subscription_plan.sql', table: 'professionals', column: 'subscription_plan' },
  { label: 'Vencimento do acesso', file: 'migration_v28_subscription_access.sql', table: 'professionals', column: 'subscription_ends_at' },
  { label: 'Fichas de anamnese', file: 'migration_v29_anamnesis.sql', table: 'anamnesis_forms' },
  { label: 'Minha Página', file: 'migration_v30_professional_sites.sql', table: 'professional_sites' },
  { label: 'Auditoria do admin', file: 'migration_v32_admin_audit.sql', table: 'admin_audit_log' },
  { label: 'Planos e histórico', file: 'migration_v33_plans.sql', table: 'plans' },
  { label: 'Avisos e configurações', file: 'migration_v34_admin_system.sql', table: 'admin_notices' },
  { label: 'Acesso (links, histórico)', file: 'migration_v36_access.sql', table: 'access_events' },
  { label: 'Webhook da Hubla', file: 'migration_v37_hubla_webhook.sql', table: 'hubla_webhook_events' },
  { label: 'Onboarding e Google sync', file: 'migration_v38_google_onboarding.sql', table: 'professionals', column: 'onboarding_completed_at' },
  { label: 'Tour de boas-vindas', file: 'migration_v40_tour.sql', table: 'professionals', column: 'tour_completed_at' },
  { label: 'CRM, tarefas e alertas do admin', file: 'migration_v41_admin_360.sql', table: 'admin_tasks' },
  { label: 'Notificações push', file: 'migration_push.sql', table: 'push_subscriptions' },
];

export interface MigrationStatus extends MigrationProbe { ok: boolean; error?: string }

/** Testa cada migration com uma consulta vazia. Barato: nenhuma linha volta. */
export async function checkMigrations(): Promise<MigrationStatus[]> {
  if (!isSupabaseConfigured) return MIGRATION_PROBES.map(p => ({ ...p, ok: false, error: 'Supabase não configurado' }));
  return Promise.all(MIGRATION_PROBES.map(async p => {
    try {
      if (p.fn) {
        const { error } = await db().rpc(p.fn, {});
        // Função existe mas reclamou dos argumentos → existe. Só 42883/PGRST202 é ausência.
        const missing = !!error && (error.code === '42883' || error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''));
        return { ...p, ok: !missing, error: missing ? error?.message : undefined };
      }
      const { error } = await db().from(p.table as string).select(p.column ?? '*').limit(0);
      return { ...p, ok: !error, error: error?.message };
    } catch (e) {
      return { ...p, ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }));
}

export interface IntegrationStatus { name: string; configured: boolean; enables: string; vars: string[] }

/** Só presença/ausência de cada chave — nunca o valor. */
export function checkIntegrations(): IntegrationStatus[] {
  const has = (...keys: string[]) => keys.every(k => !!process.env[k]);
  return [
    { name: 'Supabase (service role)', vars: ['SUPABASE_SERVICE_ROLE_KEY'], configured: has('SUPABASE_SERVICE_ROLE_KEY'), enables: 'Tudo do admin: leitura e escrita sem RLS' },
    { name: 'Sessão assinada', vars: ['SESSION_SECRET'], configured: has('SESSION_SECRET'), enables: 'Login do painel e do admin' },
    { name: 'Cron (lembretes)', vars: ['CRON_SECRET'], configured: has('CRON_SECRET'), enables: 'Automações de WhatsApp agendadas' },
    { name: 'OpenAI', vars: ['OPENAI_API_KEY'], configured: has('OPENAI_API_KEY'), enables: 'Bot de WhatsApp com IA (sem ela, respostas de fallback)' },
    { name: 'Hubla (webhook)', vars: ['HUBLA_WEBHOOK_TOKEN'], configured: has('HUBLA_WEBHOOK_TOKEN'), enables: 'Ativar/cortar acesso quando a assinatura muda' },
    { name: 'E-mail (Resend)', vars: ['RESEND_API_KEY', 'MAIL_FROM'], configured: has('RESEND_API_KEY'), enables: 'Links de acesso e avisos por e-mail' },
    { name: 'Google Agenda', vars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'], configured: has('GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'), enables: 'Login com Google e sincronização de agenda' },
    { name: 'Notificações push', vars: ['NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'], configured: has('NEXT_PUBLIC_VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'), enables: 'Avisos no celular da profissional' },
    { name: 'Rate limit (Upstash)', vars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'], configured: has('UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'), enables: 'Limite de tentativas em login e agendamento público' },
    { name: 'Turnstile (anti-bot)', vars: ['TURNSTILE_SECRET_KEY'], configured: has('TURNSTILE_SECRET_KEY'), enables: 'Proteção do cadastro público' },
    { name: 'uazapi (admin)', vars: ['UAZAPI_SERVER_URL', 'UAZAPI_ADMIN_TOKEN'], configured: has('UAZAPI_SERVER_URL', 'UAZAPI_ADMIN_TOKEN'), enables: 'Criar instâncias de WhatsApp pelo painel' },
  ];
}

// ═══════════════════════════════ ADOÇÃO DE RECURSOS ═══════════════════════════════

export interface AdoptionItem { key: string; label: string; count: number; available: boolean }

/** Quantas contas usam cada recurso. Tabela ausente = recurso indisponível. */
export async function featureAdoption(): Promise<AdoptionItem[]> {
  if (!isSupabaseConfigured) return [];
  const distinct = async (table: string, column = 'professional_id', filter?: (q: ReturnType<ReturnType<typeof db>['from']>) => unknown) => {
    try {
      let q = db().from(table).select(column).limit(20000);
      if (filter) q = filter(q) as typeof q;
      const { data, error } = await q;
      if (error) return { count: 0, available: !isMissingTable(error) };
      const set = new Set(((data || []) as Record<string, string>[]).map(r => r[column]).filter(Boolean));
      return { count: set.size, available: true };
    } catch { return { count: 0, available: false }; }
  };

  const [botCfg, botOn, site, google, anam, wait, fin, push, tour] = await Promise.all([
    distinct('whatsapp_settings', 'professional_id', q => q.not('uazapi_token', 'is', null)),
    distinct('whatsapp_settings', 'professional_id', q => q.eq('bot_enabled', true)),
    distinct('professional_sites', 'professional_id', q => q.eq('status', 'published')),
    distinct('google_calendar_connections'),
    distinct('anamnesis_forms'),
    distinct('waitlist_entries'),
    distinct('transactions'),
    distinct('push_subscriptions'),
    distinct('professionals', 'id', q => q.not('tour_completed_at', 'is', null)),
  ]);

  return [
    { key: 'bot', label: 'Bot de WhatsApp configurado', ...botCfg },
    { key: 'bot_on', label: 'Bot ligado', ...botOn },
    { key: 'site', label: 'Minha Página publicada', ...site },
    { key: 'google', label: 'Google Agenda conectada', ...google },
    { key: 'anamnese', label: 'Fichas de anamnese', ...anam },
    { key: 'waitlist', label: 'Lista de espera', ...wait },
    { key: 'finance', label: 'Financeiro (lançamentos)', ...fin },
    { key: 'push', label: 'Notificações push', ...push },
    { key: 'tour', label: 'Concluiu o tour', ...tour },
  ];
}
