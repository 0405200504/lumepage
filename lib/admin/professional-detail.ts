import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { Appointment, Client, Professional, Service, WhatsAppSettings } from '@/types/database';
import { daysAgoISO } from './queries';

/** Dados consolidados de UMA conta — alimenta as abas de /admin/professionals/[id]. */

const db = () => getSupabaseAdmin() || supabase;
const REVENUE = ['completed', 'confirmed'];

export interface ProfessionalOverview {
  professional: Professional;
  kpis: {
    revenueTotalCents: number;
    revenue30dCents: number;
    appointmentsTotal: number;
    appointments30d: number;
    clients: number;
    ticketCents: number;
    noShowRate: number;
    completionRate: number;
  };
  monthly: { label: string; count: number; revenueCents: number }[];
  onboarding: { label: string; done: boolean; hint: string }[];
  alerts: { level: 'warn' | 'bad' | 'info'; text: string }[];
  bot: {
    configured: boolean;
    enabled: boolean;
    number: string | null;
    automationsOn: boolean;
    messagesMonth: number;
    conversationsWaiting: number;
  };
  services: Service[];
  topServices: { name: string; count: number; revenueCents: number }[];
  recentAppointments: Appointment[];
  recentClients: Client[];
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export async function getProfessionalOverview(id: string): Promise<ProfessionalOverview | null> {
  if (!isSupabaseConfigured) return null;

  const { data: profData } = await db().from('professionals').select('*').eq('id', id).maybeSingle();
  if (!profData) return null;
  const professional = profData as Professional;

  const [apptsRes, clientsRes, servicesRes, settingsRes, convRes] = await Promise.all([
    db().from('appointments').select('*, service:services(name, price_cents)')
      .eq('professional_id', id).is('deleted_at', null).order('date', { ascending: false }).limit(3000),
    db().from('clients').select('*').eq('professional_id', id).is('deleted_at', null)
      .order('created_at', { ascending: false }).limit(1000),
    db().from('services').select('*').eq('professional_id', id).order('name'),
    db().from('whatsapp_settings').select('*').eq('professional_id', id).maybeSingle(),
    db().from('whatsapp_conversations').select('bot_paused, last_message_at').eq('professional_id', id).limit(2000),
  ]);

  type A = Appointment & { service: { name?: string; price_cents?: number } | null };
  const appts = (apptsRes.data || []) as unknown as A[];
  const clients = (clientsRes.data || []) as Client[];
  const services = (servicesRes.data || []) as Service[];
  const settings = settingsRes.data as WhatsAppSettings | null;

  const since30 = daysAgoISO(30);
  const priceOf = (a: A) => a.service?.price_cents || 0;
  const active = appts.filter(a => a.status !== 'cancelled');
  const paid = appts.filter(a => REVENUE.includes(a.status));
  const last30 = appts.filter(a => a.date >= since30 && a.status !== 'cancelled');

  const revenueTotalCents = paid.reduce((s, a) => s + priceOf(a), 0);
  const revenue30dCents = last30.filter(a => REVENUE.includes(a.status)).reduce((s, a) => s + priceOf(a), 0);
  const noShow = appts.filter(a => a.status === 'no_show').length;
  const completed = appts.filter(a => a.status === 'completed').length;

  // Série dos últimos 6 meses
  const now = new Date();
  const monthly: { label: string; count: number; revenueCents: number }[] = [];
  const index = new Map<string, { label: string; count: number; revenueCents: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const point = { label: MONTHS[d.getMonth()], count: 0, revenueCents: 0 };
    monthly.push(point);
    index.set(`${d.getFullYear()}-${d.getMonth()}`, point);
  }
  for (const a of active) {
    const [y, m] = a.date.split('-').map(Number);
    const p = index.get(`${y}-${m - 1}`);
    if (!p) continue;
    p.count++;
    if (REVENUE.includes(a.status)) p.revenueCents += priceOf(a);
  }

  const serviceMap = new Map<string, { name: string; count: number; revenueCents: number }>();
  for (const a of active) {
    const name = a.service?.name || 'Serviço';
    const s = serviceMap.get(name) || { name, count: 0, revenueCents: 0 };
    s.count++;
    if (REVENUE.includes(a.status)) s.revenueCents += priceOf(a);
    serviceMap.set(name, s);
  }

  const botConfigured = !!settings?.uazapi_url && !!settings?.uazapi_token;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const messagesMonth = appts.reduce((n, a) => {
    const fields = [a.automation_booking_sent_at, a.automation_day_before_sent_at, a.automation_day_of_sent_at, a.automation_5days_sent_at];
    return n + fields.filter(v => v && new Date(v).getTime() >= monthStart).length;
  }, 0);
  const conversations = (convRes.data || []) as { bot_paused: boolean; last_message_at: string }[];

  const onboarding = [
    { label: 'Cadastrou serviços', done: services.length > 0, hint: `${services.length} serviço(s)` },
    { label: 'Configurou disponibilidade', done: false, hint: '' },
    { label: 'Recebeu o primeiro agendamento', done: appts.length > 0, hint: `${appts.length} no total` },
    { label: 'Configurou o bot de WhatsApp', done: botConfigured, hint: botConfigured ? 'conectado' : 'não conectado' },
    { label: 'Tem clientes cadastradas', done: clients.length > 0, hint: `${clients.length} cliente(s)` },
  ];
  // Disponibilidade exige uma consulta extra — barata e é item de ativação.
  const { count: availCount } = await db().from('availability_rules')
    .select('id', { count: 'exact', head: true }).eq('professional_id', id).eq('is_active', true);
  onboarding[1] = { label: 'Configurou disponibilidade', done: (availCount || 0) > 0, hint: `${availCount || 0} regra(s)` };

  const alerts: { level: 'warn' | 'bad' | 'info'; text: string }[] = [];
  const endsAt = professional.subscription_ends_at || professional.trial_ends_at;
  if (endsAt) {
    const days = Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86_400_000);
    if (days < 0) alerts.push({ level: 'bad', text: `Acesso vencido há ${Math.abs(days)} dia(s).` });
    else if (days <= 7) alerts.push({ level: 'warn', text: `Acesso vence em ${days} dia(s).` });
  }
  if (last30.length === 0) alerts.push({ level: 'warn', text: 'Nenhum agendamento nos últimos 30 dias.' });
  if (!botConfigured) alerts.push({ level: 'info', text: 'Bot de WhatsApp não configurado.' });
  if (services.length === 0) alerts.push({ level: 'bad', text: 'Nenhum serviço cadastrado — a página de agendamento fica vazia.' });
  const waiting = conversations.filter(c => c.bot_paused).length;
  if (waiting > 0) alerts.push({ level: 'warn', text: `${waiting} conversa(s) esperando atendimento humano.` });

  return {
    professional,
    kpis: {
      revenueTotalCents,
      revenue30dCents,
      appointmentsTotal: active.length,
      appointments30d: last30.length,
      clients: clients.length,
      ticketCents: paid.length ? Math.round(revenueTotalCents / paid.length) : 0,
      noShowRate: appts.length ? (noShow / appts.length) * 100 : 0,
      completionRate: appts.length ? (completed / appts.length) * 100 : 0,
    },
    monthly,
    onboarding,
    alerts,
    bot: {
      configured: botConfigured,
      enabled: !!settings?.bot_enabled,
      number: settings?.uazapi_url ? (settings.uazapi_url.replace(/^https?:\/\//, '').split('/')[0]) : null,
      automationsOn: !!settings && (settings.automation_booking_enabled || settings.automation_day_before_enabled
        || settings.automation_day_of_enabled || settings.automation_5days_enabled),
      messagesMonth,
      conversationsWaiting: waiting,
    },
    services,
    topServices: [...serviceMap.values()].sort((a, b) => b.count - a.count).slice(0, 6),
    recentAppointments: appts.slice(0, 25) as unknown as Appointment[],
    recentClients: clients.slice(0, 25),
  };
}

/** Histórico de mudanças de plano (migration v33). Vazio se a tabela não existir. */
export async function getSubscriptionHistory(professionalId: string): Promise<{
  id: string; plan_key: string | null; status: string | null; current_period_end: string | null;
  note: string | null; changed_by: string | null; created_at: string;
}[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await db().from('subscription_events')
    .select('*').eq('professional_id', professionalId).order('created_at', { ascending: false }).limit(50);
  if (error) return [];
  return data || [];
}
