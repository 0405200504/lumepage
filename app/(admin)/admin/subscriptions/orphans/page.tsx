import React from 'react';
import Link from 'next/link';
import { AlertTriangle, MailWarning, ShoppingBag } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { SubNav, FINANCEIRO_NAV } from '@/components/admin/SubNav';
import { StatStrip, Panel, Notice, EmptyState } from '@/components/admin/primitives';
import { Badge, PLAN_LABEL } from '@/components/admin/badges';
import { OrphanPurchaseActions } from '@/components/admin/OrphanPurchaseActions';
import { listOrphanPurchases, orphanSignupUrl, type OrphanPurchase, type OrphanStatus } from '@/lib/subscription/orphans';
import { digits } from '@/lib/subscription/hubla';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { brl, formatDateTimeBR, formatRelativeBR } from '@/lib/format';

export const metadata = { title: 'Compras órfãs | Lume Admin' };

type Account = { id: string; name: string; brand_name: string; email: string; whatsapp: string | null };

const STATUS: Record<OrphanStatus, { label: string; tone: 'warn' | 'neutral' | 'bad' }> = {
  pending: { label: 'Aguardando cadastro', tone: 'warn' },
  revoked: { label: 'Reembolsada ou cancelada', tone: 'neutral' },
  failed: { label: 'Cobrança recusada', tone: 'bad' },
};

const RESOLUTION: Record<string, string> = {
  claimed_signup: 'Ativou sozinha no cadastro',
  claimed_google: 'Ativou sozinha no cadastro com Google',
  claimed_admin: 'Ativou na conta criada pelo admin',
  linked_signup: 'Ligada no cadastro (sem pagamento válido)',
  linked_google: 'Ligada no cadastro com Google (sem pagamento válido)',
  linked_admin: 'Ligada na conta criada pelo admin',
  activated_manual: 'Vinculada no admin',
  linked_manual: 'Ligada no admin (sem pagamento válido)',
  dismissed: 'Descartada',
};

const cycle = (months: number | null) => (months === 12 ? 'anual' : months === 1 ? 'mensal' : months ? `${months} meses` : null);

function planText(p: OrphanPurchase): string {
  const plan = p.plan ? `${PLAN_LABEL[p.plan] ?? p.plan}${cycle(p.months) ? ` ${cycle(p.months)}` : ''}` : (p.offerName ?? 'oferta fora do de-para');
  return p.amountCents ? `${plan} · ${brl(p.amountCents)}` : plan;
}

export default async function AdminOrphansPage() {
  const session = await requireAdmin();

  const db = () => getSupabaseAdmin() || supabase;
  const [orphans, profsRes] = await Promise.all([
    listOrphanPurchases({ resolvedDays: 30 }),
    isSupabaseConfigured
      ? db().from('professionals').select('id, name, brand_name, email, whatsapp').is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID).order('brand_name')
      : Promise.resolve({ data: [] }),
  ]);

  const profs = (profsRes.data || []) as Account[];
  const options = profs.map(p => ({ value: p.id, label: p.brand_name || p.name }));
  const nameOf = new Map(profs.map(p => [p.id, p.brand_name || p.name]));

  /** Conta que parece ser dela: mesmo e-mail (chegou depois do aviso) ou mesmo telefone. */
  const suggest = (p: OrphanPurchase): { id: string; why: string } | null => {
    const byEmail = p.email ? profs.find(a => a.email?.toLowerCase() === p.email) : null;
    if (byEmail) return { id: byEmail.id, why: 'mesmo e-mail — a conta foi criada depois do pagamento' };
    const tail = digits(p.phone).slice(-8);
    if (tail.length === 8) {
      const byPhone = profs.find(a => digits(a.whatsapp).endsWith(tail));
      if (byPhone) return { id: byPhone.id, why: 'mesmo telefone' };
    }
    return null;
  };

  const pending = [...orphans.pending].sort((a, b) =>
    (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || b.lastAt.localeCompare(a.lastAt));
  const waiting = pending.filter(p => p.status === 'pending');
  const stuckCents = waiting.reduce((s, p) => s + (p.amountCents ?? 0), 0);
  const emailed = waiting.filter(p => p.email && orphans.notices.has(p.email)).length;
  const claimed = orphans.resolved.filter(p => p.resolution?.startsWith('claimed_') || p.resolution === 'activated_manual');
  const mailOn = Boolean(process.env.RESEND_API_KEY);

  return (
    <LayoutAdmin
      session={session}
      title="Compras órfãs"
      subtitle="Pagaram na Hubla e não existe conta na Lume com o e-mail da compra."
    >
      <div className="space-y-4">
        <SubNav items={FINANCEIRO_NAV} />

        <StatStrip items={[
          { label: 'Aguardando cadastro', value: String(waiting.length), tone: waiting.length ? 'bad' : 'default', note: 'pagaram e ainda não têm conta' },
          { label: 'Valor parado', value: brl(stuckCents), note: 'soma das compras pendentes' },
          { label: 'Com e-mail enviado', value: `${emailed}/${waiting.length}`, note: orphans.noticesAvailable ? 'link do cadastro' : 'sem registro (v42)' },
          { label: 'Vinculadas em 30 dias', value: String(claimed.length), note: 'sozinhas ou pelo admin' },
        ]} />

        {!orphans.available && (
          <Notice tone="warn" icon={<AlertTriangle />}>Rode <code className="font-mono">supabase/migration_v37_hubla_webhook.sql</code> para guardar os avisos da Hubla.</Notice>
        )}
        {orphans.available && !orphans.noticesAvailable && (
          <Notice tone="warn" icon={<AlertTriangle />}>Rode <code className="font-mono">supabase/migration_v42_hubla_orphans.sql</code> para o e-mail de boas-vindas não sair repetido e esta tela mostrar quando ele foi enviado.</Notice>
        )}
        {!mailOn && (
          <Notice tone="warn" icon={<MailWarning />}>E-mail desligado neste ambiente (<code className="font-mono">RESEND_API_KEY</code> ausente): ninguém recebe o link do cadastro. Use <strong>Copiar link</strong> e mande pelo WhatsApp.</Notice>
        )}

        <Panel flush title="Na fila" note="Uma linha por compradora. Quando ela se cadastra com o e-mail da compra, o plano ativa sozinho e a linha sai daqui.">
          {pending.length === 0 ? (
            <EmptyState icon={<ShoppingBag />} title="Nenhuma compra sem conta" description="Toda venda que chegou da Hubla já está ligada a uma conta." className="py-8" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {pending.map(p => {
                const s = suggest(p);
                const notice = p.email ? orphans.notices.get(p.email) : undefined;
                const st = STATUS[p.status];
                return (
                  <li key={p.key} className="px-5 py-4 space-y-3">
                    <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="text-body-sm font-semibold text-heading">{p.name ?? p.email ?? 'Compradora sem nome'}</span>
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </span>
                        <span className="block text-caption text-n-500 mt-0.5 break-words">
                          {p.email ?? 'sem e-mail'}{p.phone ? ` · ${p.phone}` : ''} · {planText(p)}
                        </span>
                        <span className="block text-caption text-n-500">
                          Pagou {formatRelativeBR(p.firstAt)}
                          {p.events.length > 1 ? ` · ${p.events.length} avisos da Hubla` : ''}
                          {p.status === 'pending' && (
                            notice
                              ? ` · e-mail enviado ${formatRelativeBR(notice.last_sent_at)}${notice.sent_count > 1 ? ` (${notice.sent_count}×)` : ''}`
                              : orphans.noticesAvailable ? ' · e-mail ainda não enviado' : ''
                          )}
                        </span>
                        {s && <span className="block text-caption text-success mt-0.5">Parece ser {nameOf.get(s.id)} ({s.why}).</span>}
                      </span>
                    </div>
                    <OrphanPurchaseActions
                      purchaseKey={p.key}
                      accounts={options}
                      suggestedId={s?.id ?? null}
                      signupUrl={p.email ? orphanSignupUrl(p.email, p.plan) : null}
                      canWelcome={p.status === 'pending'}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel flush title="Resolvidas nos últimos 30 dias" note="Continuam no histórico de eventos da Hubla">
          {orphans.resolved.length === 0 ? (
            <EmptyState title="Nada resolvido neste período" className="py-6" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {orphans.resolved.map(p => (
                <li key={`${p.key}-${p.lastAt}`} className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-body-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-heading truncate">{p.name ?? p.email ?? '—'}</span>
                    <span className="block text-caption text-n-500 truncate">{p.email ?? 'sem e-mail'} · {planText(p)}</span>
                  </span>
                  <span className="text-caption text-n-600">{RESOLUTION[p.resolution ?? ''] ?? p.resolution}</span>
                  {p.professionalId && (
                    <Link href={`/admin/professionals/${p.professionalId}?tab=subscription`} className="text-caption font-semibold text-accent-link hover:underline underline-offset-2">
                      {nameOf.get(p.professionalId) ?? 'Abrir conta'}
                    </Link>
                  )}
                  <span className="num text-caption text-n-500 w-36 text-right">{formatDateTimeBR(p.lastAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </LayoutAdmin>
  );
}
