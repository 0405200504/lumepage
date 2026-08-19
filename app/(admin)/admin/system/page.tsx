import React from 'react';
import Link from 'next/link';
import { Database, HardDrive, Bot, Trash2, Activity } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { dbService } from '@/lib/supabase/db';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { NetworkTrashButton, TestDataButton } from '@/components/admin/SystemTools';
import { Badge } from '@/components/admin/badges';
import { formatDateTimeBR } from '@/lib/format';

export const metadata = { title: 'Saúde do sistema | Lume Admin' };

const FREE_TIER_BYTES = 500 * 1024 * 1024; // plano Free do Supabase
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function AdminSystemPage() {
  const session = await requireAdmin();
  const db = () => getSupabaseAdmin() || supabase;

  const [storage, trash, settingsRes, apptsRes] = await Promise.all([
    dbService.getDatabaseStats().catch(() => null),
    dbService.getNetworkTrashStats().catch(() => ({ appointments: 0, clients: 0 })),
    isSupabaseConfigured
      ? db().from('whatsapp_settings').select('professional_id, uazapi_url, uazapi_token, bot_enabled, webhook_secret')
      : Promise.resolve({ data: [] }),
    isSupabaseConfigured
      ? db().from('appointments').select('professional_id, automation_booking_sent_at, automation_day_before_sent_at, automation_day_of_sent_at, automation_5days_sent_at')
        .is('deleted_at', null).neq('professional_id', DEMO_PROFESSIONAL_ID)
        // eslint-disable-next-line react-hooks/purity -- Server Component: relógio por request.
        .gte('date', new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10)).limit(20000)
      : Promise.resolve({ data: [] }),
  ]);

  type S = { professional_id: string; uazapi_url: string; uazapi_token: string; bot_enabled: boolean; webhook_secret: string | null };
  const settings = (settingsRes.data || []) as S[];
  const configured = settings.filter(s => s.uazapi_url && s.uazapi_token);
  const missingWebhook = configured.filter(s => !s.webhook_secret);

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  let automationsMonth = 0;
  let lastAutomation = 0;
  for (const a of (apptsRes.data || []) as Record<string, string | null>[]) {
    for (const key of ['automation_booking_sent_at', 'automation_day_before_sent_at', 'automation_day_of_sent_at', 'automation_5days_sent_at']) {
      const v = a[key];
      if (!v) continue;
      const t = new Date(v).getTime();
      if (t > lastAutomation) lastAutomation = t;
      if (t >= monthStart) automationsMonth++;
    }
  }

  const usedPct = storage ? (storage.dbSizeBytes / FREE_TIER_BYTES) * 100 : 0;

  const card = (icon: React.ReactNode, label: string, value: string, hint?: string) => (
    <div className="card px-4 py-3 flex items-start gap-3">
      <span className="h-9 w-9 rounded-xl bg-surface-2 text-muted flex items-center justify-center shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{label}</span>
        <span className="block text-lg font-bold text-heading tabular-nums leading-tight">{value}</span>
        {hint && <span className="block text-[11px] text-muted">{hint}</span>}
      </span>
    </div>
  );

  return (
    <LayoutAdmin
      session={session}
      title="Saúde do sistema"
      subtitle="Infraestrutura e integrações. Isto saiu da home — lá o espaço nobre é do negócio."
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {card(<Database className="h-4 w-4" />, 'Banco de dados', storage ? mb(storage.dbSizeBytes) : '—', storage ? `${usedPct.toFixed(1)}% do plano Free` : 'função get_db_stats ausente (migration v21)')}
          {card(<Bot className="h-4 w-4" />, 'Contas com bot', `${configured.length}/${settings.length || 0}`, `${configured.filter(s => s.bot_enabled).length} com o bot ligado`)}
          {card(<Activity className="h-4 w-4" />, 'Automações no mês', String(automationsMonth), lastAutomation ? `última em ${formatDateTimeBR(new Date(lastAutomation))}` : 'nenhuma disparada')}
          {card(<Trash2 className="h-4 w-4" />, 'Na lixeira da rede', `${trash.appointments + trash.clients}`, `${trash.appointments} agendamentos · ${trash.clients} clientes`)}
        </div>

        {storage && (
          <section className="card p-4">
            <h2 className="text-sm font-bold text-ink mb-3">Uso do banco por tabela</h2>
            <div className="h-2 rounded-full bg-surface-2 overflow-hidden mb-4" aria-hidden>
              <span className={`block h-full rounded-full ${usedPct > 80 ? 'bg-[color:var(--color-bad)]' : 'bg-accent'}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
            </div>
            <ul className="space-y-1.5">
              {storage.tables.slice(0, 10).map(t => (
                <li key={t.name} className="flex items-center gap-3 text-xs">
                  <span className="text-ink font-semibold flex-1 truncate">{t.name}</span>
                  <span className="text-muted tabular-nums">{mb(t.bytes)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card p-4 space-y-3">
          <h2 className="text-sm font-bold text-ink flex items-center gap-2"><HardDrive className="h-4 w-4 text-muted" /> Manutenção</h2>
          <p className="text-xs text-muted">
            Esvaziar a lixeira apaga em definitivo os agendamentos e clientes já excluídos pelas profissionais.
            Ação irreversível, registrada na auditoria.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <NetworkTrashButton appointments={trash.appointments} clients={trash.clients} />
            <TestDataButton />
          </div>
          <p className="text-xs text-muted">
            Contas de teste (“page 1”…“page 5”, “teste”, e-mails @example.com) poluem KPIs, ranking e
            gráficos. A limpeza é reversível: elas vão para a lixeira, não somem.
          </p>
        </section>

        <section className="card p-4">
          <h2 className="text-sm font-bold text-ink mb-2">Integração WhatsApp (uazapi)</h2>
          {missingWebhook.length > 0 ? (
            <p className="text-xs text-[color:var(--color-warn)]">
              {missingWebhook.length} conta(s) com bot configurado mas <strong>sem webhook_secret</strong> — o bot não recebe mensagens.
            </p>
          ) : (
            <p className="text-xs text-muted">Todas as contas com bot têm webhook configurado.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {configured.map(s => (
              <Link key={s.professional_id} href={`/admin/professionals/${s.professional_id}?tab=bot`}>
                <Badge tone={s.bot_enabled ? 'ok' : 'neutral'}>{s.professional_id.slice(0, 8)}…</Badge>
              </Link>
            ))}
            {configured.length === 0 && <span className="text-xs text-muted">Nenhuma conta com bot configurado.</span>}
          </div>
        </section>
      </div>
    </LayoutAdmin>
  );
}
