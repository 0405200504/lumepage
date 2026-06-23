import { Appointment, Client, Professional, WhatsAppSettings } from '@/types/database';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const REVENUE_STATUSES = ['completed', 'confirmed'];

// ===================== SAÚDE & OPERAÇÃO DA REDE (painel admin) =====================
export interface BotHealthRow {
  id: string;
  brandName: string;
  configured: boolean;     // uazapi_url + token preenchidos
  botEnabled: boolean;     // interruptor principal do bot
  automationsOn: boolean;  // alguma automação ligada
  sentToday: number;       // mensagens automáticas enviadas hoje
  lastFiredAt: string | null; // última automática disparada (qualquer tipo)
}

export interface NetworkOps {
  totalProfessionals: number;
  withBotConfigured: number;
  withAutomationsOn: number;
  pendingConversations: number;
  newProfsThisMonth: number;
  newProfsLastMonth: number;
  apptsThisMonth: number;
  apptsLastMonth: number;
  automatedSentToday: number;
  automatedSentMonth: number;
  botHealth: BotHealthRow[];
}

const AUTOMATION_TS_FIELDS = [
  'automation_booking_sent_at',
  'automation_day_before_sent_at',
  'automation_day_of_sent_at',
  'automation_5days_sent_at',
] as const;

/** Métricas de saúde/operação da rede para o painel admin. */
export function networkOps(
  professionals: Professional[],
  appointments: Appointment[],
  settings: WhatsAppSettings[],
  pendingConversations: number,
  now: Date,
): NetworkOps {
  const y = now.getFullYear(), m = now.getMonth();
  const startThisMonth = new Date(y, m, 1).getTime();
  const startLastMonth = new Date(y, m - 1, 1).getTime();
  const startToday = new Date(y, m, now.getDate()).getTime();

  const settingsByProf = new Map(settings.map(s => [s.professional_id, s]));
  const apptsByProf: Record<string, Appointment[]> = {};
  for (const a of appointments) (apptsByProf[a.professional_id] ||= []).push(a);

  const ts = (v: unknown) => (v ? new Date(v as string).getTime() : 0);
  const isOn = (s?: WhatsAppSettings) => !!s && (
    s.automation_booking_enabled || s.automation_day_before_enabled ||
    s.automation_day_of_enabled || s.automation_5days_enabled || s.automation_followup_enabled
  );
  const isConfigured = (s?: WhatsAppSettings) => !!s && !!s.uazapi_url && !!s.uazapi_token;

  let automatedSentToday = 0, automatedSentMonth = 0;
  const botHealth: BotHealthRow[] = professionals.map((p) => {
    const s = settingsByProf.get(p.id);
    const apps = apptsByProf[p.id] || [];
    let sentToday = 0, lastFired = 0;
    for (const a of apps) {
      const rec = a as unknown as Record<string, unknown>;
      for (const f of AUTOMATION_TS_FIELDS) {
        const t = ts(rec[f]);
        if (!t) continue;
        if (t > lastFired) lastFired = t;
        if (t >= startToday) { sentToday++; automatedSentToday++; }
        if (t >= startThisMonth) automatedSentMonth++;
      }
    }
    return {
      id: p.id,
      brandName: p.brand_name || p.name,
      configured: isConfigured(s),
      botEnabled: !!s?.bot_enabled,
      automationsOn: isOn(s),
      sentToday,
      lastFiredAt: lastFired ? new Date(lastFired).toISOString() : null,
    };
  });

  const newProfsThisMonth = professionals.filter(p => ts(p.created_at) >= startThisMonth).length;
  const newProfsLastMonth = professionals.filter(p => { const t = ts(p.created_at); return t >= startLastMonth && t < startThisMonth; }).length;
  const apptsThisMonth = appointments.filter(a => ts(a.created_at) >= startThisMonth).length;
  const apptsLastMonth = appointments.filter(a => { const t = ts(a.created_at); return t >= startLastMonth && t < startThisMonth; }).length;

  return {
    totalProfessionals: professionals.length,
    withBotConfigured: botHealth.filter(b => b.configured).length,
    withAutomationsOn: botHealth.filter(b => b.automationsOn).length,
    pendingConversations,
    newProfsThisMonth, newProfsLastMonth,
    apptsThisMonth, apptsLastMonth,
    automatedSentToday, automatedSentMonth,
    botHealth: botHealth.sort((a, b) => (a.configured === b.configured ? 0 : a.configured ? 1 : -1)),
  };
}

export interface ProfMetric {
  id: string;
  name: string;
  brandName: string;
  slug: string;
  status: Professional['status'];
  total: number;        // agendamentos ativos (não cancelados)
  completed: number;
  noShow: number;
  pending: number;
  revenueCents: number; // confirmados + concluídos
  clients: number;
  lastAppointmentDate: string | null; // data do último agendamento (atividade)
}

/** Métricas por profissional (ordenadas por faturamento desc). */
export function professionalMetrics(
  professionals: Professional[],
  appointments: Appointment[],
  clients: Client[]
): ProfMetric[] {
  const byProf: Record<string, Appointment[]> = {};
  for (const a of appointments) (byProf[a.professional_id] ||= []).push(a);
  const clientCount: Record<string, number> = {};
  for (const c of clients) clientCount[c.professional_id] = (clientCount[c.professional_id] || 0) + 1;

  return professionals.map((p) => {
    const apps = byProf[p.id] || [];
    const active = apps.filter(a => a.status !== 'cancelled');
    const lastAppointmentDate = active.reduce<string | null>((max, a) => (!max || a.date > max ? a.date : max), null);
    return {
      id: p.id,
      name: p.name,
      brandName: p.brand_name,
      slug: p.slug,
      status: p.status,
      total: active.length,
      completed: apps.filter(a => a.status === 'completed').length,
      noShow: apps.filter(a => a.status === 'no_show').length,
      pending: apps.filter(a => a.status === 'pending').length,
      revenueCents: apps.filter(a => REVENUE_STATUSES.includes(a.status)).reduce((s, a) => s + (a.service?.price_cents || 0), 0),
      clients: clientCount[p.id] || 0,
      lastAppointmentDate,
    };
  }).sort((a, b) => b.revenueCents - a.revenueCents);
}

export interface MonthPoint { key: string; label: string; count: number; revenueCents: number; }

/** Série dos últimos N meses (agendamentos ativos + faturamento). `ref` = data base (string YYYY-MM-DD). */
export function monthlySeries(appointments: Appointment[], refISO: string, months = 6): MonthPoint[] {
  const [ry, rm] = refISO.split('-').map(Number);
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    let y = ry, m = rm - 1 - i;
    while (m < 0) { m += 12; y--; }
    points.push({ key: `${y}-${m}`, label: MONTHS_SHORT[m], count: 0, revenueCents: 0 });
  }
  const idx: Record<string, MonthPoint> = {};
  points.forEach(p => { idx[p.key] = p; });
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    const [ay, am] = a.date.split('-').map(Number);
    const p = idx[`${ay}-${am - 1}`];
    if (p) {
      p.count++;
      if (REVENUE_STATUSES.includes(a.status)) p.revenueCents += a.service?.price_cents || 0;
    }
  }
  return points;
}

export interface StatusCounts { pending: number; confirmed: number; completed: number; cancelled: number; no_show: number; }

export function statusCounts(appointments: Appointment[]): StatusCounts {
  const c: StatusCounts = { pending: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
  for (const a of appointments) c[a.status]++;
  return c;
}

export interface ServiceCount { name: string; count: number; revenueCents: number; }

/** Serviços mais agendados na plataforma. */
export function topServices(appointments: Appointment[], limit = 6): ServiceCount[] {
  const map: Record<string, ServiceCount> = {};
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    const name = a.service?.name || 'Serviço';
    const s = (map[name] ||= { name, count: 0, revenueCents: 0 });
    s.count++;
    if (REVENUE_STATUSES.includes(a.status)) s.revenueCents += a.service?.price_cents || 0;
  }
  return Object.values(map).sort((a, b) => b.count - a.count).slice(0, limit);
}

export const moneyBR = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
