import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { daysAgoISO } from './queries';

/**
 * ALERTAS PROATIVOS
 * -----------------
 * O painel só respondia perguntas que você já sabia fazer. Aqui as regras são
 * avaliadas na renderização (sem job, sem tabela nova) e viram itens acionáveis:
 * trial vencendo, conta inativa, pagamento em atraso, conversa parada, banco cheio.
 */

const db = () => getSupabaseAdmin() || supabase;

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

  const [profsRes, apptsRes, convRes, settingsRes] = await Promise.all([
    db().from('professionals')
      .select('id, brand_name, name, status, subscription_status, subscription_ends_at, trial_ends_at')
      .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID),
    db().from('appointments').select('professional_id').is('deleted_at', null).gte('date', since30).limit(20000),
    db().from('whatsapp_conversations').select('id, bot_paused, last_message_at')
      .eq('bot_paused', true).not('client_phone', 'like', '_debug_%').limit(2000),
    db().from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token'),
  ]);

  type P = { id: string; brand_name: string; name: string; status: string; subscription_status: string | null; subscription_ends_at: string | null; trial_ends_at: string | null };
  const profs = (profsRes.data || []) as P[];
  const activeIds = new Set((apptsRes.data || []).map((a: { professional_id: string }) => a.professional_id));
  const withBot = new Set(((settingsRes.data || []) as { professional_id: string; uazapi_url: string; uazapi_token: string }[])
    .filter(s => s.uazapi_url && s.uazapi_token).map(s => s.professional_id));

  const alerts: AdminAlert[] = [];

  const expiring = profs.filter(p => {
    const end = p.subscription_ends_at || p.trial_ends_at;
    if (!end) return false;
    const d = new Date(end);
    return d >= new Date() && d <= in7;
  });
  if (expiring.length) {
    alerts.push({
      id: 'trial-expiring', level: 'warn', count: expiring.length,
      title: `${expiring.length} conta(s) com acesso vencendo em 7 dias`,
      detail: expiring.slice(0, 5).map(p => p.brand_name || p.name).join(', '),
      href: '/admin/professionals?risk=trial7',
    });
  }

  const expired = profs.filter(p => {
    const end = p.subscription_ends_at || p.trial_ends_at;
    return !!end && new Date(end) < new Date() && p.status === 'active';
  });
  if (expired.length) {
    alerts.push({
      id: 'expired', level: 'bad', count: expired.length,
      title: `${expired.length} conta(s) ativa(s) com acesso já vencido`,
      detail: 'Continuam usando a plataforma sem assinatura válida.',
      href: '/admin/professionals',
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

  const idle = profs.filter(p => p.status === 'active' && !activeIds.has(p.id));
  if (idle.length) {
    alerts.push({
      id: 'idle', level: 'warn', count: idle.length,
      title: `${idle.length} conta(s) sem nenhum agendamento há 30 dias`,
      detail: 'Risco de churn: a conta está aberta mas parada.',
      href: '/admin/professionals?risk=idle30',
    });
  }

  const noBot = profs.filter(p => p.status === 'active' && !withBot.has(p.id));
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
  return alerts.sort((a, b) => order[a.level] - order[b.level] || b.count - a.count);
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
