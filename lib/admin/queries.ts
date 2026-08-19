import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { TableParams, toISODate } from '@/lib/query-params';
import { Appointment, Client, Professional, WhatsAppSettings } from '@/types/database';
import { accountState, AccountStateResult } from './account-state';

/**
 * CONSULTAS DO PAINEL ADMIN
 * -------------------------
 * Um lugar só para o recorte de dados das listas: filtro, ordenação, paginação e
 * contagem total — tudo no banco, nunca no cliente.
 *
 * Duas estratégias, por tamanho de tabela:
 *  - `professionals` é a tabela dos INQUILINOS (dezenas, no máximo centenas). Lemos
 *    todas as que passam no filtro, calculamos as métricas derivadas (faturamento
 *    30d, agendamentos, clientes, bot) e paginamos em memória. É o que permite
 *    ordenar por coluna calculada, coisa que SQL puro não daria sem uma view.
 *  - `appointments` e `clients` crescem sem teto: paginação e contagem no banco,
 *    sempre. Nunca carregamos a tabela inteira.
 */

const db = () => getSupabaseAdmin() || supabase;
const REVENUE_STATUSES = ['completed', 'confirmed'];

/** Escapa curingas do LIKE para a busca não virar padrão acidental. */
const like = (q: string) => `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`;

export const daysAgoISO = (days: number, from = new Date()): string => {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return toISODate(d);
};

// ═══════════════════════════════ PROFISSIONAIS ═══════════════════════════════

export interface ProfessionalRow {
  id: string;
  name: string;
  brandName: string;
  slug: string;
  email: string;
  whatsapp: string;
  status: Professional['status'];
  plan: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  /** Métricas dos últimos 30 dias. */
  appts30d: number;
  revenue30dCents: number;
  clients: number;
  botConfigured: boolean;
  botEnabled: boolean;
  lastAppointmentDate: string | null;
  lastSignInAt: string | null;
  /** Conta de teste evidente (page 1..5, "teste", e-mail example.com). */
  looksLikeTest: boolean;
}

/** Estado derivado de uma linha da lista. Um lugar só, memoizado por request. */
const stateCache = new WeakMap<object, AccountStateResult>();
function stateOf(r: ProfessionalRow): AccountStateResult {
  const hit = stateCache.get(r);
  if (hit) return hit;
  const s = accountState({
    status: r.status,
    subscription_status: r.subscriptionStatus,
    subscription_plan: r.plan,
    subscription_ends_at: r.subscriptionEndsAt,
    trial_ends_at: r.trialEndsAt,
    created_at: r.createdAt,
  });
  stateCache.set(r, s);
  return s;
}

const TEST_NAME = /^(page\s*\d+|teste|test)$/i;
const TEST_EMAIL = /@example\.com$/i;

const isTestAccount = (p: Professional): boolean =>
  TEST_NAME.test((p.name || '').trim())
  || TEST_NAME.test((p.brand_name || '').trim())
  || TEST_EMAIL.test(p.email || '');

/** Último login de cada conta, vindo do Supabase Auth. Falha silenciosa → mapa vazio. */
async function lastSignInMap(): Promise<Map<string, string>> {
  const admin = getSupabaseAdmin();
  if (!admin) return new Map();
  try {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const map = new Map<string, string>();
    for (const u of data?.users || []) {
      if (u.last_sign_in_at) map.set(u.id, u.last_sign_in_at);
    }
    return map;
  } catch {
    return new Map();
  }
}

export interface ProfessionalListResult {
  rows: ProfessionalRow[];
  total: number;
  /** Totais do filtro inteiro (não só da página) — alimentam os KPIs da tela. */
  totals: { active: number; paused: number; withBot: number; revenue30dCents: number };
}

export async function listProfessionals(params: TableParams): Promise<ProfessionalListResult> {
  const empty: ProfessionalListResult = { rows: [], total: 0, totals: { active: 0, paused: 0, withBot: 0, revenue30dCents: 0 } };
  if (!isSupabaseConfigured) return empty;

  const since = daysAgoISO(30);

  const [profsRes, apptsRes, clientsRes, settingsRes, signIns] = await Promise.all([
    db().from('professionals').select('*').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
    db().from('appointments').select('professional_id, status, date, service:services(price_cents)')
      .is('deleted_at', null).gte('date', since),
    db().from('clients').select('professional_id').is('deleted_at', null),
    db().from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token, bot_enabled'),
    lastSignInMap(),
  ]);

  const professionals = (profsRes.data || []) as Professional[];

  const appts30d = new Map<string, { count: number; revenue: number }>();
  for (const a of (apptsRes.data || []) as unknown as Appointment[]) {
    if (a.status === 'cancelled') continue;
    const acc = appts30d.get(a.professional_id) || { count: 0, revenue: 0 };
    acc.count++;
    if (REVENUE_STATUSES.includes(a.status)) {
      const svc = a.service as unknown as { price_cents?: number } | { price_cents?: number }[] | null;
      const price = Array.isArray(svc) ? svc[0]?.price_cents : svc?.price_cents;
      acc.revenue += price || 0;
    }
    appts30d.set(a.professional_id, acc);
  }

  const clientCount = new Map<string, number>();
  for (const c of (clientsRes.data || []) as Pick<Client, 'professional_id'>[]) {
    clientCount.set(c.professional_id, (clientCount.get(c.professional_id) || 0) + 1);
  }

  const settings = new Map<string, WhatsAppSettings>();
  for (const s of (settingsRes.data || []) as WhatsAppSettings[]) settings.set(s.professional_id, s);

  const lastAppt = new Map<string, string>();
  for (const a of (apptsRes.data || []) as unknown as Appointment[]) {
    const cur = lastAppt.get(a.professional_id);
    if (!cur || a.date > cur) lastAppt.set(a.professional_id, a.date);
  }

  let rows: ProfessionalRow[] = professionals.map(p => {
    const m = appts30d.get(p.id) || { count: 0, revenue: 0 };
    const s = settings.get(p.id);
    return {
      id: p.id,
      name: p.name,
      brandName: p.brand_name || p.name,
      slug: p.slug,
      email: p.email,
      whatsapp: p.whatsapp,
      status: p.status,
      plan: p.subscription_plan ?? null,
      subscriptionStatus: p.subscription_status ?? null,
      trialEndsAt: p.trial_ends_at ?? null,
      subscriptionEndsAt: p.subscription_ends_at ?? null,
      createdAt: p.created_at,
      appts30d: m.count,
      revenue30dCents: m.revenue,
      clients: clientCount.get(p.id) || 0,
      botConfigured: !!s?.uazapi_url && !!s?.uazapi_token,
      botEnabled: !!s?.bot_enabled,
      lastAppointmentDate: lastAppt.get(p.id) ?? null,
      lastSignInAt: (p.owner_user_id && signIns.get(p.owner_user_id)) || null,
      looksLikeTest: isTestAccount(p),
    };
  });

  // ————— filtros —————
  const f = params.filters;
  // Filtro por SITUAÇÃO derivada, não por `professionals.status` cru — é o mesmo
  // estado que o selo da linha mostra (lib/admin/account-state.ts).
  if (f.status) rows = rows.filter(r => stateOf(r).state === f.status);
  if (f.plan) rows = rows.filter(r => (r.plan ?? 'none') === f.plan);
  if (f.bot === 'yes') rows = rows.filter(r => r.botConfigured);
  if (f.bot === 'no') rows = rows.filter(r => !r.botConfigured);
  if (f.hide === 'test') rows = rows.filter(r => !r.looksLikeTest);
  if (f.risk === 'idle30') rows = rows.filter(r => r.appts30d === 0);
  if (f.risk === 'trial7') {
    const limit = new Date(); limit.setDate(limit.getDate() + 7);
    rows = rows.filter(r => {
      const end = r.subscriptionEndsAt || r.trialEndsAt;
      return !!end && new Date(end) <= limit && new Date(end) >= new Date() && stateOf(r).hasAccess;
    });
  }
  if (f.risk === 'expired') rows = rows.filter(r => stateOf(r).state === 'expired');
  if (f.risk === 'never') rows = rows.filter(r => !r.lastSignInAt);
  if (params.q) {
    const q = params.q.toLowerCase();
    rows = rows.filter(r =>
      r.name.toLowerCase().includes(q) || r.brandName.toLowerCase().includes(q)
      || r.email.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q));
  }
  if (params.from) rows = rows.filter(r => r.createdAt >= params.from!);
  if (params.to) rows = rows.filter(r => r.createdAt <= `${params.to}T23:59:59`);

  const totals = {
    active: rows.filter(r => stateOf(r).hasAccess).length,
    paused: rows.filter(r => stateOf(r).state === 'paused').length,
    withBot: rows.filter(r => r.botConfigured).length,
    revenue30dCents: rows.reduce((s, r) => s + r.revenue30dCents, 0),
  };

  // ————— ordenação —————
  const dir = params.dir === 'asc' ? 1 : -1;
  const sorters: Record<string, (a: ProfessionalRow, b: ProfessionalRow) => number> = {
    name: (a, b) => a.brandName.localeCompare(b.brandName, 'pt-BR'),
    status: (a, b) => stateOf(a).state.localeCompare(stateOf(b).state),
    plan: (a, b) => (a.plan ?? '').localeCompare(b.plan ?? ''),
    appts: (a, b) => a.appts30d - b.appts30d,
    revenue: (a, b) => a.revenue30dCents - b.revenue30dCents,
    clients: (a, b) => a.clients - b.clients,
    access: (a, b) => (a.lastSignInAt ?? '').localeCompare(b.lastSignInAt ?? ''),
    created: (a, b) => a.createdAt.localeCompare(b.createdAt),
  };
  const sorter = sorters[params.sort ?? 'revenue'] ?? sorters.revenue;
  rows.sort((a, b) => sorter(a, b) * dir);

  const total = rows.length;
  const start = (params.page - 1) * params.pageSize;
  return { rows: rows.slice(start, start + params.pageSize), total, totals };
}

/** Lista enxuta para selects de filtro. */
export async function professionalOptions(): Promise<{ value: string; label: string }[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await db().from('professionals')
    .select('id, name, brand_name').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID).order('name');
  return (data || []).map((p: { id: string; name: string; brand_name: string }) => ({
    value: p.id, label: p.brand_name || p.name,
  }));
}

// ═══════════════════════════════ AGENDAMENTOS ═══════════════════════════════

export interface AppointmentRow {
  id: string;
  professionalId: string;
  professionalName: string;
  clientName: string;
  clientWhatsapp: string;
  serviceName: string;
  priceCents: number;
  date: string;
  startTime: string;
  endTime: string;
  status: Appointment['status'];
  notes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  /** De onde veio: bot, link público ou lançamento manual. */
  origin: 'bot' | 'público' | 'manual';
}

const SORT_COLUMNS: Record<string, string> = {
  date: 'date', created: 'created_at', client: 'client_name', status: 'status',
};

/** Heurística de origem: o bot marca a automação de confirmação; manual não tem client_id. */
function originOf(a: Appointment): AppointmentRow['origin'] {
  if (a.automation_booking_sent_at) return 'bot';
  return a.client_id ? 'público' : 'manual';
}

export async function listAppointments(
  params: TableParams,
  profNames: Map<string, string>,
): Promise<{ rows: AppointmentRow[]; total: number; totals: { revenueCents: number; byStatus: Record<string, number> } }> {
  const empty = { rows: [], total: 0, totals: { revenueCents: 0, byStatus: {} } };
  if (!isSupabaseConfigured) return empty;

  const sortCol = SORT_COLUMNS[params.sort ?? 'date'] ?? 'date';
  const from = (params.page - 1) * params.pageSize;

  const build = () => {
    let q = db().from('appointments')
      .select('*, service:services(name, price_cents)', { count: 'exact' })
      .is('deleted_at', null)
      .neq('professional_id', DEMO_PROFESSIONAL_ID);
    if (params.filters.status) q = q.eq('status', params.filters.status);
    if (params.filters.prof) q = q.eq('professional_id', params.filters.prof);
    if (params.q) q = q.or(`client_name.ilike.${like(params.q)},client_whatsapp.ilike.${like(params.q)}`);
    if (params.from) q = q.gte('date', params.from);
    if (params.to) q = q.lte('date', params.to);
    return q;
  };

  const [pageRes, aggRes] = await Promise.all([
    build().order(sortCol, { ascending: params.dir === 'asc' })
      .order('start_time', { ascending: false })
      .range(from, from + params.pageSize - 1),
    // Agregados do filtro inteiro, sem trazer as linhas para o cliente.
    build().select('status, service:services(price_cents)').limit(5000),
  ]);

  const rows: AppointmentRow[] = ((pageRes.data || []) as unknown as Appointment[]).map(a => {
    const svc = a.service as unknown as { name?: string; price_cents?: number } | null;
    return {
      id: a.id,
      professionalId: a.professional_id,
      professionalName: profNames.get(a.professional_id) || '—',
      clientName: a.client_name,
      clientWhatsapp: a.client_whatsapp,
      serviceName: svc?.name || 'Serviço',
      priceCents: svc?.price_cents || 0,
      date: a.date,
      startTime: a.start_time,
      endTime: a.end_time,
      status: a.status,
      notes: a.notes,
      cancellationReason: a.cancellation_reason,
      createdAt: a.created_at,
      origin: originOf(a),
    };
  });

  const byStatus: Record<string, number> = {};
  let revenueCents = 0;
  for (const a of (aggRes.data || []) as unknown as { status: string; service: { price_cents?: number } | null }[]) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
    if (REVENUE_STATUSES.includes(a.status)) revenueCents += a.service?.price_cents || 0;
  }

  return { rows, total: pageRes.count || 0, totals: { revenueCents, byStatus } };
}

/** Um agendamento com tudo o que o drawer de detalhe mostra. */
export async function getAppointmentDetail(id: string): Promise<AppointmentRow | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await db().from('appointments')
    .select('*, service:services(name, price_cents)').eq('id', id).maybeSingle();
  if (!data) return null;
  const a = data as unknown as Appointment;
  const svc = a.service as unknown as { name?: string; price_cents?: number } | null;
  const { data: prof } = await db().from('professionals').select('name, brand_name').eq('id', a.professional_id).maybeSingle();
  return {
    id: a.id,
    professionalId: a.professional_id,
    professionalName: (prof as { brand_name?: string; name?: string } | null)?.brand_name || (prof as { name?: string } | null)?.name || '—',
    clientName: a.client_name,
    clientWhatsapp: a.client_whatsapp,
    serviceName: svc?.name || 'Serviço',
    priceCents: svc?.price_cents || 0,
    date: a.date,
    startTime: a.start_time,
    endTime: a.end_time,
    status: a.status,
    notes: a.notes,
    cancellationReason: a.cancellation_reason,
    createdAt: a.created_at,
    origin: originOf(a),
  };
}

// ═══════════════════════════════ CLIENTES ═══════════════════════════════

export interface ClientRow {
  id: string;
  professionalId: string;
  professionalName: string;
  name: string;
  whatsapp: string;
  /** Telefone normalizado (E.164 sem '+'): base da deduplicação. */
  phoneKey: string;
  email: string | null;
  visits: number;
  noShows: number;
  spentCents: number;
  lastVisit: string | null;
  createdAt: string;
  /** Nome ausente: o cadastro ficou com o próprio telefone no lugar do nome. */
  namelessy: boolean;
}

/**
 * Normaliza para E.164 brasileiro sem o '+': 55 + DDD + número.
 * É o que resolve "5514981378956" e "14981378956" serem a MESMA pessoa — hoje elas
 * aparecem como duas linhas na tela de clientes.
 */
export function normalizePhone(raw: string): string {
  let d = (raw || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!d) return '';
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  // Celular antigo sem o 9: 8 dígitos após o DDD.
  if (d.length === 10) d = `${d.slice(0, 2)}9${d.slice(2)}`;
  return d.length >= 10 ? `55${d}` : d;
}

export async function listClients(
  params: TableParams,
  profNames: Map<string, string>,
): Promise<{ rows: ClientRow[]; total: number; duplicateGroups: number }> {
  if (!isSupabaseConfigured) return { rows: [], total: 0, duplicateGroups: 0 };

  const from = (params.page - 1) * params.pageSize;
  const sortCol = ({ name: 'name', visits: 'total_appointments', last: 'last_appointment_at', created: 'created_at' } as Record<string, string>)[params.sort ?? 'name'] ?? 'name';

  const build = () => {
    let q = db().from('clients').select('*', { count: 'exact' })
      .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID);
    if (params.filters.prof) q = q.eq('professional_id', params.filters.prof);
    if (params.q) q = q.or(`name.ilike.${like(params.q)},whatsapp.ilike.${like(params.q)},email.ilike.${like(params.q)}`);
    if (params.from) q = q.gte('created_at', params.from);
    if (params.to) q = q.lte('created_at', `${params.to}T23:59:59`);
    return q;
  };

  const [pageRes, dupRes] = await Promise.all([
    build().order(sortCol, { ascending: params.dir === 'asc', nullsFirst: false }).range(from, from + params.pageSize - 1),
    db().from('clients').select('professional_id, whatsapp').is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000),
  ]);

  const clients = (pageRes.data || []) as Client[];

  // Estatísticas de atendimento das clientes DESTA página (nada de varrer tudo).
  const ids = clients.map(c => c.id);
  const phones = clients.map(c => c.whatsapp).filter(Boolean);
  const stats = new Map<string, { visits: number; noShows: number; spent: number; last: string | null }>();
  if (phones.length) {
    const { data: appts } = await db().from('appointments')
      .select('professional_id, client_id, client_whatsapp, status, date, service:services(price_cents)')
      .is('deleted_at', null)
      .in('client_whatsapp', phones)
      .limit(5000);
    for (const a of (appts || []) as unknown as (Appointment & { service: { price_cents?: number } | null })[]) {
      const key = `${a.professional_id}|${normalizePhone(a.client_whatsapp)}`;
      const s = stats.get(key) || { visits: 0, noShows: 0, spent: 0, last: null };
      if (a.status !== 'cancelled') s.visits++;
      if (a.status === 'no_show') s.noShows++;
      if (REVENUE_STATUSES.includes(a.status)) s.spent += a.service?.price_cents || 0;
      if (['completed', 'confirmed'].includes(a.status) && (!s.last || a.date > s.last)) s.last = a.date;
      stats.set(key, s);
    }
  }
  void ids;

  // Quantos grupos de duplicata existem na base (mesma profissional + mesmo telefone).
  const seen = new Map<string, number>();
  for (const c of (dupRes.data || []) as Pick<Client, 'professional_id' | 'whatsapp'>[]) {
    const key = `${c.professional_id}|${normalizePhone(c.whatsapp)}`;
    if (!key.endsWith('|')) seen.set(key, (seen.get(key) || 0) + 1);
  }
  const duplicateGroups = [...seen.values()].filter(n => n > 1).length;

  const rows: ClientRow[] = clients.map(c => {
    const phoneKey = normalizePhone(c.whatsapp);
    const s = stats.get(`${c.professional_id}|${phoneKey}`);
    return {
      id: c.id,
      professionalId: c.professional_id,
      professionalName: profNames.get(c.professional_id) || '—',
      name: c.name,
      whatsapp: c.whatsapp,
      phoneKey,
      email: c.email,
      visits: s?.visits ?? c.total_appointments ?? 0,
      noShows: s?.noShows ?? 0,
      spentCents: s?.spent ?? 0,
      lastVisit: s?.last ?? c.last_appointment_at ?? null,
      createdAt: c.created_at,
      namelessy: (c.name || '').replace(/\D/g, '').length >= 8,
    };
  });

  return { rows, total: pageRes.count || 0, duplicateGroups };
}

/** Grupos de clientes duplicadas (mesma profissional, mesmo telefone normalizado). */
export interface DuplicateGroup {
  phoneKey: string;
  professionalId: string;
  professionalName: string;
  clients: { id: string; name: string; whatsapp: string; email: string | null; visits: number; createdAt: string }[];
}

export async function listDuplicateClients(profNames: Map<string, string>, limit = 50): Promise<DuplicateGroup[]> {
  if (!isSupabaseConfigured) return [];
  const { data } = await db().from('clients').select('*')
    .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000);

  const groups = new Map<string, Client[]>();
  for (const c of (data || []) as Client[]) {
    const phoneKey = normalizePhone(c.whatsapp);
    if (!phoneKey) continue;
    const key = `${c.professional_id}|${phoneKey}`;
    const arr = groups.get(key) || [];
    arr.push(c);
    groups.set(key, arr);
  }

  return [...groups.entries()]
    .filter(([, arr]) => arr.length > 1)
    .slice(0, limit)
    .map(([key, arr]) => {
      const [professionalId, phoneKey] = key.split('|');
      return {
        phoneKey,
        professionalId,
        professionalName: profNames.get(professionalId) || '—',
        clients: arr
          .sort((a, b) => (b.total_appointments || 0) - (a.total_appointments || 0))
          .map(c => ({
            id: c.id, name: c.name, whatsapp: c.whatsapp, email: c.email,
            visits: c.total_appointments || 0, createdAt: c.created_at,
          })),
      };
    });
}

// ═══════════════════════════════ CONVERSAS ═══════════════════════════════

export interface ConversationRow {
  id: string;
  professionalId: string;
  professionalName: string;
  clientPhone: string;
  clientName: string | null;
  lastMessage: string;
  lastMessageAt: string;
  waitingHours: number;
  botPaused: boolean;
  messageCount: number;
}

export async function listConversations(
  params: TableParams,
  profNames: Map<string, string>,
): Promise<{ rows: ConversationRow[]; total: number; waiting: number }> {
  if (!isSupabaseConfigured) return { rows: [], total: 0, waiting: 0 };

  const from = (params.page - 1) * params.pageSize;
  const build = () => {
    let q = db().from('whatsapp_conversations').select('*', { count: 'exact' })
      .not('client_phone', 'like', '_debug_%')
      .neq('professional_id', DEMO_PROFESSIONAL_ID);
    if (params.filters.prof) q = q.eq('professional_id', params.filters.prof);
    if (params.filters.state === 'waiting') q = q.eq('bot_paused', true);
    if (params.filters.state === 'bot') q = q.eq('bot_paused', false);
    if (params.q) q = q.ilike('client_phone', like(params.q));
    return q;
  };

  const [pageRes, waitingRes] = await Promise.all([
    // Espera mais longa primeiro: quem está há mais tempo sem resposta vem no topo.
    build().order('bot_paused', { ascending: false }).order('last_message_at', { ascending: true })
      .range(from, from + params.pageSize - 1),
    db().from('whatsapp_conversations').select('id', { count: 'exact', head: true })
      .eq('bot_paused', true).not('client_phone', 'like', '_debug_%'),
  ]);

  const now = Date.now();
  const rows: ConversationRow[] = ((pageRes.data || []) as { id: string; professional_id: string; client_phone: string; messages: { role: string; content: string }[] | null; bot_paused: boolean; client_summary: string | null; last_message_at: string }[]).map(c => {
    const msgs = Array.isArray(c.messages) ? c.messages : [];
    const last = msgs[msgs.length - 1];
    return {
      id: c.id,
      professionalId: c.professional_id,
      professionalName: profNames.get(c.professional_id) || '—',
      clientPhone: c.client_phone,
      clientName: c.client_summary,
      lastMessage: (last?.content || '').slice(0, 160),
      lastMessageAt: c.last_message_at,
      waitingHours: c.bot_paused ? Math.max(0, Math.round((now - new Date(c.last_message_at).getTime()) / 3_600_000)) : 0,
      botPaused: c.bot_paused,
      messageCount: msgs.length,
    };
  });

  return { rows, total: pageRes.count || 0, waiting: waitingRes.count || 0 };
}

export async function getConversation(id: string): Promise<{ row: ConversationRow; messages: { role: string; content: string; at: number }[] } | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await db().from('whatsapp_conversations').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const c = data as { id: string; professional_id: string; client_phone: string; messages: { role: string; content: string; at: number }[] | null; bot_paused: boolean; client_summary: string | null; last_message_at: string };
  const { data: prof } = await db().from('professionals').select('name, brand_name').eq('id', c.professional_id).maybeSingle();
  const msgs = Array.isArray(c.messages) ? c.messages : [];
  return {
    row: {
      id: c.id,
      professionalId: c.professional_id,
      professionalName: (prof as { brand_name?: string; name?: string } | null)?.brand_name || '—',
      clientPhone: c.client_phone,
      clientName: c.client_summary,
      lastMessage: msgs[msgs.length - 1]?.content || '',
      lastMessageAt: c.last_message_at,
      waitingHours: c.bot_paused ? Math.max(0, Math.round((Date.now() - new Date(c.last_message_at).getTime()) / 3_600_000)) : 0,
      botPaused: c.bot_paused,
      messageCount: msgs.length,
    },
    messages: msgs,
  };
}
