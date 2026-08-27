import React from 'react';
import { Info, AlertTriangle, Sparkles } from 'lucide-react';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';

/**
 * Avisos publicados pelo admin (/admin/broadcast) exibidos no painel da profissional.
 * Silencioso se a migration v34 não rodou.
 */
export async function AdminNotices({ professionalId, subscriptionStatus, hasBot }: {
  professionalId: string; subscriptionStatus?: string | null; hasBot?: boolean;
}) {
  if (!isSupabaseConfigured || !professionalId) return null;

  const nowIso = new Date().toISOString();
  const { data, error } = await (getSupabaseAdmin() || supabase)
    .from('admin_notices')
    .select('id, title, body, level, audience, ends_at')
    .eq('active', true)
    .lte('starts_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error || !data?.length) return null;

  type N = { id: string; title: string; body: string; level: string; audience: string; ends_at: string | null };
  const notices = (data as N[]).filter(n => {
    if (n.ends_at && n.ends_at < nowIso) return false;
    if (n.audience === 'active') return subscriptionStatus === 'active';
    if (n.audience === 'trialing') return subscriptionStatus !== 'active';
    if (n.audience === 'no_bot') return !hasBot;
    return true;
  });
  if (!notices.length) return null;

  const style = (level: string) =>
    level === 'warn' ? { cls: 'bg-warning-bg text-warning ring-warning-border', Icon: AlertTriangle }
      : level === 'success' ? { cls: 'bg-success-bg text-success ring-success-border', Icon: Sparkles }
      : { cls: 'bg-accent-soft text-accent-link ring-accent-soft-border', Icon: Info };

  return (
    <ul className="px-4 sm:px-6 pt-4 space-y-2">
      {notices.map(n => {
        const { cls, Icon } = style(n.level);
        return (
          <li key={n.id} className={`rounded-xl px-3.5 py-2.5 ring-1 flex items-start gap-2.5 ${cls}`}>
            <Icon className="h-4 w-4 shrink-0 mt-px" aria-hidden />
            <span className="min-w-0">
              <span className="block text-caption font-bold">{n.title}</span>
              <span className="block text-caption opacity-90 whitespace-pre-wrap">{n.body}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export default AdminNotices;
