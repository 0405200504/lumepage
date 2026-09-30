import React from 'react';
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { StatStrip, Panel, Notice } from '@/components/admin/primitives';
import { SubNav, SISTEMA_NAV } from '@/components/admin/SubNav';
import { dbService } from '@/lib/supabase/db';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { NetworkTrashButton, TestDataButton } from '@/components/admin/SystemTools';
import { Badge } from '@/components/admin/badges';
import { formatDateTimeBR } from '@/lib/format';
import { checkMigrations, checkIntegrations } from '@/lib/admin/crm';
import { CheckCircle2, XCircle } from 'lucide-react';

export const metadata = { title: 'Saúde do sistema | Lume Admin' };

const FREE_TIER_BYTES = 500 * 1024 * 1024;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default async function AdminSystemPage() {
  const session = await requireAdmin();
  const db = () => getSupabaseAdmin() || supabase;

  const [storage, trash, settingsRes, apptsRes, migrations] = await Promise.all([
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
    checkMigrations(),
  ]);
  const integrations = checkIntegrations();
  const missingMigrations = migrations.filter(m => !m.ok);

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

  return (
    <LayoutAdmin
      session={session}
      title="Sistema"
      subtitle="Infraestrutura, integrações e manutenção da plataforma."
    >
      <div className="space-y-4">
        <SubNav items={SISTEMA_NAV} />

        <StatStrip items={[
          { label: 'Migrations pendentes', value: String(missingMigrations.length), note: missingMigrations.length ? 'ver abaixo' : 'banco em dia', tone: missingMigrations.length ? 'warn' : 'default' },
          { label: 'Banco de dados', value: storage ? mb(storage.dbSizeBytes) : '—', note: storage ? `${usedPct.toFixed(1)}% do plano Free` : 'função get_db_stats ausente (migration v21)', tone: usedPct > 80 ? 'bad' : 'default' },
          { label: 'Contas com bot', value: `${configured.length}/${settings.length || 0}`, note: `${configured.filter(s => s.bot_enabled).length} com o bot ligado` },
          { label: 'Automações no mês', value: String(automationsMonth), note: lastAutomation ? `última em ${formatDateTimeBR(new Date(lastAutomation))}` : 'nenhuma disparada' },
          { label: 'Na lixeira da rede', value: String(trash.appointments + trash.clients), note: `${trash.appointments} agendamentos · ${trash.clients} clientes` },
        ]} cols={5} />

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel flush title="Migrations do banco" note="Cada linha é uma consulta vazia à tabela ou função que a migration cria">
            <ul className="divide-y divide-line border-t border-line">
              {migrations.map(m => (
                <li key={m.file} className="px-5 py-2.5 flex items-center gap-3 text-body-sm">
                  {m.ok ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden /> : <XCircle className="h-4 w-4 text-danger shrink-0" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${m.ok ? 'text-heading' : 'text-danger font-semibold'}`}>{m.label}</span>
                    <span className="block text-caption text-n-500 font-mono truncate">supabase/{m.file}</span>
                  </span>
                  {!m.ok && <Badge tone="bad" dot={false}>rodar</Badge>}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel flush title="Integrações" note="Só presença da chave no ambiente — o valor nunca aparece">
            <ul className="divide-y divide-line border-t border-line">
              {integrations.map(i => (
                <li key={i.name} className="px-5 py-2.5 flex items-center gap-3 text-body-sm">
                  {i.configured ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden /> : <XCircle className="h-4 w-4 text-n-400 shrink-0" aria-hidden />}
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${i.configured ? 'text-heading' : 'text-n-500'}`}>{i.name}</span>
                    <span className="block text-caption text-n-500 truncate">{i.enables}</span>
                  </span>
                  <span className="text-micro font-mono text-n-400 hidden xl:block">{i.vars.join(', ')}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {storage && (
            <Panel title="Uso do banco por tabela" note={`${mb(storage.dbSizeBytes)} de 500 MB`}>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden mb-4" aria-hidden>
                <span className={`block h-full rounded-full ${usedPct > 80 ? 'bg-danger' : 'bg-wine-700'}`} style={{ width: `${Math.min(100, usedPct)}%` }} />
              </div>
              <ul className="space-y-2">
                {storage.tables.slice(0, 10).map(t => (
                  <li key={t.name} className="flex items-center gap-3 text-body-sm">
                    <span className="text-heading font-medium flex-1 truncate">{t.name}</span>
                    <span className="text-n-500 num">{mb(t.bytes)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Integração WhatsApp (uazapi)" note={`${configured.length} conta(s) com servidor configurado`}>
            {missingWebhook.length > 0 ? (
              <Notice tone="warn" className="mb-3">
                {missingWebhook.length} conta(s) com bot configurado mas <strong>sem webhook_secret</strong> — o bot não recebe mensagens.
              </Notice>
            ) : configured.length > 0 && (
              <Notice tone="ok" className="mb-3">Todas as contas com bot têm webhook configurado.</Notice>
            )}
            <div className="flex flex-wrap gap-1.5">
              {configured.map(s => (
                <Link key={s.professional_id} href={`/admin/professionals/${s.professional_id}`}>
                  <Badge tone={s.bot_enabled ? 'ok' : 'neutral'}>{s.professional_id.slice(0, 8)}…</Badge>
                </Link>
              ))}
              {configured.length === 0 && <span className="text-caption text-n-500">Nenhuma conta com bot configurado.</span>}
            </div>
          </Panel>
        </div>

        <Panel title="Manutenção" note="Ações registradas na auditoria">
          <div className="space-y-4 text-body-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-n-600 max-w-xl">
                <strong className="text-heading">Lixeira da rede.</strong> Apaga em definitivo os agendamentos e clientes já excluídos pelas profissionais. Irreversível.
              </p>
              <NetworkTrashButton appointments={trash.appointments} clients={trash.clients} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-line">
              <p className="text-n-600 max-w-xl">
                <strong className="text-heading">Contas de teste.</strong> “page 1”…“page 5”, “teste” e e-mails @example.com poluem os números. A limpeza é reversível: vão para a lixeira.
              </p>
              <TestDataButton />
            </div>
          </div>
        </Panel>
      </div>
    </LayoutAdmin>
  );
}
