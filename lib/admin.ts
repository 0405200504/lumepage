import { Appointment, Client, Professional } from '@/types/database';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const REVENUE_STATUSES = ['completed', 'confirmed'];

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
