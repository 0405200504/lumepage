import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { daysAgoISO } from './queries';
import { accountState } from './account-state';
import { getSnoozes, isMissingTable } from './crm';
import { orphanKeyOf } from '@/lib/subscription/orphans';

/**
 * ALERTAS PROATIVOS
 * -----------------
 * O painel só respondia perguntas que você já sabia fazer. Aqui as regras são
 * avaliadas na renderização (sem job, sem tabela nova) e viram itens acionáveis:
 * trial vencendo, conta inativa, pagamento em atraso, conversa parada, banco cheio.
 */

const db = () => getSupabaseAdmin() || supabase;
const toISO = (d: Date) => d.toISOString().slice(0, 10);

export type AlertLevel = 'bad' | 'warn' | 'info';

export interface AdminAlert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
  href: string;
  count: number;
}

export async function getAdminAlerts(): Promise<AdminAlert[]> {
  if (!isSupabaseConfigured) return [];

  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const since30 = daysAgoISO(30);

  const [profsRes, apptsRes, convRes, settingsRes, snoozes, unmatchedRes, tasksRes, followRes] = await Promise.all([
    db().from('professionals')
      .select('id, brand_name, name, status, created_at, subscription_status, subscription_plan, subscription_ends_at, trial_ends_at')
      .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
    db().from('appointments').select('professional_id').is('deleted_at', null).gte('date', since30).limit(20000),
    db().from('whatsapp_conversations').select('id, bot_paused, last_message_at')
      .eq('bot_paused', true).not('client_phone', 'like', '_debug_%').limit(2000),
    db().from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token'),
    getSnoozes(),
    db().from('hubla_webhook_events').select('idempotency_key, email, subscription_id').eq('result', 'unmatched').limit(200),
    db().from('admin_tasks').select('id, title, due_date').is('done_at', null).lte('due_date', toISO(new Date())).limit(50),
    db().from('admin_account_meta').select('professional_id, next_follow_up').lte('next_follow_up', toISO(new Date())).limit(50),
  ]);

  type P = { id: string; brand_name: string; name: string; status: string; created_at: string | null; subscription_status: string | null; subscription_plan: string | null; subscription_ends_at: string | null; trial_ends_at: string | null };
  const profs = (profsRes.data || []) as P[];
  const activeIds = new Set((apptsRes.data || []).map((a: { professional_id: string }) => a.professional_id));
  const withBot = new Set(((settingsRes.data || []) as { professional_id: string; uazapi_url: string; uazapi_token: string }[])
    .filter(s => s.uazapi_url && s.uazapi_token).map(s => s.professional_id));

  const alerts: AdminAlert[] = [];

  // Pagamento que chegou pela Hubla sem conta correspondente = dinheiro na mesa.
  // Uma venda chega em até três avisos; o alerta conta compradoras, não avisos.
  const unmatchedRows = unmatchedRes.error && !isMissingTable(unmatchedRes.error) ? [] : ((unmatchedRes.data || []) as { idempotency_key: string; email: string | null; subscription_id: string | null }[]);
  const unmatched = [...new Map(unmatchedRows.map(u => [orphanKeyOf(u), u])).values()];
  if (unmatched.length) {
    alerts.push({
      id: 'hubla-unmatched', level: 'bad', count: unmatched.length,
      title: `${unmatched.length} compra(s) paga(s) sem conta na Lume`,
      detail: unmatched.slice(0, 4).map(u => u.email ?? 'sem e-mail').join(', '),
      href: '/admin/subscriptions/orphans',
    });
  }

  const overdue = (tasksRes.data || []) as { id: string; title: string; due_date: string }[];
  if (overdue.length) {
    alerts.push({
      id: 'tasks-due', level: 'warn', count: overdue.length,
      title: `${overdue.length} tarefa(s) vencida(s) ou para hoje`,
      detail: overdue.slice(0, 3).map(t => t.title).join(' · '),
      href: '/admin/tasks',
    });
  }

  const follow = (followRes.data || []) as { professional_id: string; next_follow_up: string }[];
  if (follow.length) {
    const names = new Map(profs.map(p => [p.id, p.brand_name || p.name]));
    alerts.push({
      id: 'follow-ups', level: 'warn', count: follow.length,
      title: `${follow.length} contato(s) combinado(s) para hoje ou atrasado(s)`,
      detail: follow.slice(0, 4).map(f => names.get(f.professional_id) ?? '—').join(', '),
      href: '/admin/professionals?follow=due',
    });
  }

  // Estado derivado uma vez, na fonte única — os alertas e os selos das telas passam
  // a contar a MESMA história (era daqui que saía "13 ativas com acesso vencido" ao
  // lado de um selo "Ativa" na listagem).
  const state = new Map(profs.map(p => [p.id, accountState(p)]));

  const expiring = profs.filter(p => {
    const s = state.get(p.id)!;
    if (!s.hasAccess || s.days === null) return false;
    const end = p.subscription_ends_at || p.trial_ends_at;
    return !!end && new Date(end) >= new Date() && new Date(end) <= in7;
  });
  if (expiring.length) {
    alerts.push({
      id: 'trial-expiring', level: 'warn', count: expiring.length,
      title: `${expiring.length} conta(s) com acesso vencendo em 7 dias`,
      detail: expiring.slice(0, 5).map(p => p.brand_name || p.name).join(', '),
      href: '/admin/professionals?risk=trial7',
    });
  }

  const expired = profs.filter(p => state.get(p.id)!.state === 'expired');
  if (expired.length) {
    alerts.push({
      id: 'expired', level: 'bad', count: expired.length,
      title: `${expired.length} conta(s) com o acesso vencido`,
      detail: 'Continuam entrando no painel sem assinatura válida.',
      href: '/admin/professionals?risk=expired',
    });
  }

  const pastDue = profs.filter(p => p.subscription_status === 'past_due');
  if (pastDue.length) {
    alerts.push({
      id: 'past-due', level: 'bad', count: pastDue.length,
      title: `${pastDue.length} conta(s) inadimplente(s)`,
      detail: pastDue.slice(0, 5).map(p => p.brand_name || p.name).join(', '),
      href: '/admin/professionals?plan=all',
    });
  }

  const idle = profs.filter(p => state.get(p.id)!.hasAccess && !activeIds.has(p.id));
  if (idle.length) {
    alerts.push({
      id: 'idle', level: 'warn', count: idle.length,
      title: `${idle.length} conta(s) sem nenhum agendamento há 30 dias`,
      detail: 'Risco de churn: a conta está aberta mas parada.',
      href: '/admin/professionals?risk=idle30',
    });
  }

  const noBot = profs.filter(p => state.get(p.id)!.hasAccess && !withBot.has(p.id));
  if (noBot.length) {
    alerts.push({
      id: 'no-bot', level: 'info', count: noBot.length,
      title: `${noBot.length} de ${profs.length} contas sem bot de WhatsApp`,
      detail: 'O recurso que mais diferencia o produto está desligado na maioria da base.',
      href: '/admin/professionals?bot=no',
    });
  }

  const conversations = (convRes.data || []) as { id: string; last_message_at: string }[];
  const stale = conversations.filter(c => Date.now() - new Date(c.last_message_at).getTime() > 24 * 3_600_000);
  if (conversations.length) {
    alerts.push({
      id: 'conversations', level: stale.length ? 'bad' : 'warn', count: conversations.length,
      title: `${conversations.length} conversa(s) esperando atendimento humano`,
      detail: stale.length ? `${stale.length} esperando há mais de 24h.` : 'Nenhuma passou de 24h ainda.',
      href: '/admin/conversations?state=waiting',
    });
  }

  const noPlan = profs.filter(p => !p.subscription_status || p.subscription_status === 'trialing');
  if (noPlan.length > profs.length / 2) {
    alerts.push({
      id: 'monetization', level: 'info', count: noPlan.length,
      title: `${noPlan.length} de ${profs.length} contas ainda não são pagantes`,
      detail: 'A maior parte da base está em teste ou sem plano atribuído.',
      href: '/admin/plans',
    });
  }

  const order: Record<AlertLevel, number> = { bad: 0, warn: 1, info: 2 };
  return alerts
    .filter(a => !snoozes.has(a.id))
    .sort((a, b) => order[a.level] - order[b.level] || b.count - a.count);
}

/** Contagem barata para o sino da topbar (2 consultas com head:true). */
export async function getAlertCount(): Promise<number> {
  if (!isSupabaseConfigured) return 0;
  const in7 = new Date(); in7.setDate(in7.getDate() + 7);
  const [conv, expiring] = await Promise.all([
    db().from('whatsapp_conversations').select('id', { count: 'exact', head: true })
      .eq('bot_paused', true).not('client_phone', 'like', '_debug_%'),
    db().from('professionals').select('id', { count: 'exact', head: true })
      .is('deleted_at', null).lte('subscription_ends_at', in7.toISOString()),
  ]);
  return (conv.count || 0) + (expiring.count || 0);
}
