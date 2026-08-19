import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { daysAgoISO } from './queries';

/**
 * RELATÓRIOS DE PRODUTO
 * ---------------------
 * O que a tela antiga não respondia: as contas ficam? elas ativam? quem está
 * escorregando? Tudo recortado pelo período escolhido na tela.
 */

const db = () => getSupabaseAdmin() || supabase;
const REVENUE = ['completed', 'confirmed'];
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export interface ReportsData {
  activation: { label: string; count: number; pct: number }[];
  cohorts: { cohort: string; size: number; retained: number[] }[];
  atRisk: { id: string; name: string; reason: string; lastActivity: string | null }[];
  attendance: { id: string; name: string; total: number; completed: number; noShow: number; cancelled: number; noShowPct: number }[];
  services: { name: string; count: number; minCents: number; avgCents: number; maxCents: number }[];
  totals: { professionals: number; appointments: number; completed: number; noShow: number; cancelled: number; newClients: number };
  monthly: { label: string; appointments: number; newProfessionals: number; newClients: number }[];
}

export async function getReports(from: string | null, to: string | null): Promise<ReportsData> {
  const empty: ReportsData = {
    activation: [], cohorts: [], atRisk: [], attendance: [], services: [],
    totals: { professionals: 0, appointments: 0, completed: 0, noShow: 0, cancelled: 0, newClients: 0 },
    monthly: [],
  };
  if (!isSupabaseConfigured) return empty;

  const apptQuery = () => {
    let q = db().from('appointments')
      .select('professional_id, status, date, service:services(name, price_cents)')
      .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000);
    if (from) q = q.gte('date', from);
    if (to) q = q.lte('date', to);
    return q;
  };

  const [profsRes, apptsRes, allApptsRes, clientsRes, servicesRes, settingsRes, availRes] = await Promise.all([
    db().from('professionals').select('id, name, brand_name, created_at, status')
      .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
    apptQuery(),
    db().from('appointments').select('professional_id, date').is('deleted_at', null)
      .neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000),
    db().from('clients').select('professional_id, created_at').is('deleted_at', null)
      .neq('professional_id', DEMO_PROFESSIONAL_ID).limit(20000),
    db().from('services').select('professional_id, name, price_cents').limit(5000),
    db().from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token'),
    db().from('availability_rules').select('professional_id').eq('is_active', true).limit(5000),
  ]);

  type P = { id: string; name: string; brand_name: string; created_at: string; status: string };
  type A = { professional_id: string; status: string; date: string; service: { name?: string; price_cents?: number } | null };

  const profs = (profsRes.data || []) as P[];
  const appts = (apptsRes.data || []) as unknown as A[];
  const allAppts = (allApptsRes.data || []) as { professional_id: string; date: string }[];
  const clients = (clientsRes.data || []) as { professional_id: string; created_at: string }[];
  const services = (servicesRes.data || []) as { professional_id: string; name: string; price_cents: number }[];
  const withBot = new Set(((settingsRes.data || []) as { professional_id: string; uazapi_url: string; uazapi_token: string }[])
    .filter(s => s.uazapi_url && s.uazapi_token).map(s => s.professional_id));
  const withAvail = new Set(((availRes.data || []) as { professional_id: string }[]).map(a => a.professional_id));
  const withServices = new Set(services.map(s => s.professional_id));
  const withAppt = new Set(allAppts.map(a => a.professional_id));
  const withClients = new Set(clients.map(c => c.professional_id));

  const total = profs.length || 1;
  const activation = [
    { label: 'Contas cadastradas', count: profs.length },
    { label: 'Cadastrou serviço', count: profs.filter(p => withServices.has(p.id)).length },
    { label: 'Configurou disponibilidade', count: profs.filter(p => withAvail.has(p.id)).length },
    { label: 'Recebeu 1º agendamento', count: profs.filter(p => withAppt.has(p.id)).length },
    { label: 'Tem clientes', count: profs.filter(p => withClients.has(p.id)).length },
    { label: 'Configurou o bot', count: profs.filter(p => withBot.has(p.id)).length },
  ].map(s => ({ ...s, pct: (s.count / total) * 100 }));

  // Coortes por mês de cadastro: em quais meses seguintes a conta ainda teve agendamento.
  const activityByProf = new Map<string, Set<string>>();
  for (const a of allAppts) {
    const key = a.date.slice(0, 7);
    const set = activityByProf.get(a.professional_id) ?? new Set<string>();
    set.add(key);
    activityByProf.set(a.professional_id, set);
  }
  const cohortMap = new Map<string, P[]>();
  for (const p of profs) {
    const key = p.created_at.slice(0, 7);
    cohortMap.set(key, [...(cohortMap.get(key) ?? []), p]);
  }
  const cohorts = [...cohortMap.entries()].sort().slice(-6).map(([key, members]) => {
    const [y, m] = key.split('-').map(Number);
    const retained: number[] = [];
    for (let offset = 0; offset < 6; offset++) {
      const d = new Date(y, m - 1 + offset, 1);
      if (d > new Date()) break;
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      retained.push(members.filter(p => activityByProf.get(p.id)?.has(monthKey)).length);
    }
    return { cohort: `${MONTHS[m - 1]}/${String(y).slice(2)}`, size: members.length, retained };
  });

  // Contas em risco
  const since30 = daysAgoISO(30);
  const recent = new Set(allAppts.filter(a => a.date >= since30).map(a => a.professional_id));
  const lastActivityOf = (id: string) => allAppts.filter(a => a.professional_id === id).map(a => a.date).sort().pop() ?? null;
  const atRisk = profs
    .filter(p => p.status === 'active' && !recent.has(p.id))
    .map(p => ({
      id: p.id,
      name: p.brand_name || p.name,
      reason: withAppt.has(p.id) ? 'Sem agendamento há mais de 30 dias' : 'Nunca recebeu um agendamento',
      lastActivity: lastActivityOf(p.id),
    }))
    .sort((a, b) => (b.lastActivity ?? '').localeCompare(a.lastActivity ?? ''));

  // Comparecimento e faltas por profissional
  const nameOf = new Map(profs.map(p => [p.id, p.brand_name || p.name]));
  const attMap = new Map<string, { total: number; completed: number; noShow: number; cancelled: number }>();
  for (const a of appts) {
    const e = attMap.get(a.professional_id) ?? { total: 0, completed: 0, noShow: 0, cancelled: 0 };
    e.total++;
    if (a.status === 'completed') e.completed++;
    if (a.status === 'no_show') e.noShow++;
    if (a.status === 'cancelled') e.cancelled++;
    attMap.set(a.professional_id, e);
  }
  const attendance = [...attMap.entries()]
    .map(([id, v]) => ({ id, name: nameOf.get(id) || '—', ...v, noShowPct: v.total ? (v.noShow / v.total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total);

  // Preços praticados na rede, por nome de serviço
  const priceMap = new Map<string, number[]>();
  for (const s of services) {
    const key = s.name.trim().toLowerCase();
    priceMap.set(key, [...(priceMap.get(key) ?? []), s.price_cents]);
  }
  const serviceStats = [...priceMap.entries()]
    .map(([name, prices]) => ({
      name,
      count: prices.length,
      minCents: Math.min(...prices),
      avgCents: Math.round(prices.reduce((s, p) => s + p, 0) / prices.length),
      maxCents: Math.max(...prices),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  // Série mensal (12 meses)
  const now = new Date();
  const monthly: { label: string; appointments: number; newProfessionals: number; newClients: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly.push({
      label: MONTHS[d.getMonth()],
      appointments: allAppts.filter(a => a.date.startsWith(key)).length,
      newProfessionals: profs.filter(p => p.created_at.startsWith(key)).length,
      newClients: clients.filter(c => c.created_at.startsWith(key)).length,
    });
  }

  const inPeriod = (iso: string) => (!from || iso >= from) && (!to || iso <= `${to}T23:59:59`);

  return {
    activation,
    cohorts,
    atRisk,
    attendance,
    services: serviceStats,
    totals: {
      professionals: profs.length,
      appointments: appts.length,
      completed: appts.filter(a => a.status === 'completed').length,
      noShow: appts.filter(a => a.status === 'no_show').length,
      cancelled: appts.filter(a => a.status === 'cancelled').length,
      newClients: clients.filter(c => inPeriod(c.created_at)).length,
    },
    monthly,
  };
}

export const revenueStatuses = REVENUE;
