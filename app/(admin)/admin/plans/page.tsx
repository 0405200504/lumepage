import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { PlansEditor } from '@/components/admin/PlansEditor';
import { listPlansAction } from '@/app/actions/admin-plans';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { brl } from '@/lib/format';

export const metadata = { title: 'Planos | Lume Admin' };

export default async function AdminPlansPage() {
  const session = await requireAdmin();
  const { plans, persisted } = await listPlansAction();

  // Quantas contas em cada plano — o número que dá sentido ao catálogo.
  const subscribers: Record<string, number> = {};
  let legacy = 0;
  let mrrCents = 0;
  if (isSupabaseConfigured) {
    const { data } = await (getSupabaseAdmin() || supabase)
      .from('professionals').select('subscription_plan, subscription_status')
      .is('deleted_at', null).neq('id', DEMO_PROFESSIONAL_ID);
    for (const p of (data || []) as { subscription_plan: string | null; subscription_status: string | null }[]) {
      if (!p.subscription_plan) { legacy++; continue; }
      subscribers[p.subscription_plan] = (subscribers[p.subscription_plan] || 0) + 1;
      if (p.subscription_status === 'active') {
        const plan = plans.find(pl => pl.key === p.subscription_plan);
        mrrCents += plan ? (plan.billing_cycle === 'yearly' ? Math.round(plan.price_cents / 12) : plan.price_cents) : 0;
      }
    }
  }

  return (
    <LayoutAdmin
      session={session}
      title="Planos"
      subtitle="O catálogo que dá preço às assinaturas. É daqui que sai o MRR do Financeiro."
    >
      <div className="space-y-4">
        {!persisted && (
          <p className="card px-4 py-3 flex items-start gap-2 text-xs text-[color:var(--color-warn)]">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-px" aria-hidden />
            <span>
              Exibindo o catálogo embutido no código. Rode <code className="font-mono">supabase/migration_v33_plans.sql</code> para
              poder editar preços e guardar o histórico de mudanças de plano.
            </span>
          </p>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="card px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">MRR estimado</p>
            <p className="text-2xl font-bold text-heading tabular-nums">{brl(mrrCents)}</p>
            <p className="text-[11px] text-muted">só contas com assinatura ativa</p>
          </div>
          {plans.map(p => (
            <div key={p.key} className="card px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{p.name}</p>
              <p className="text-2xl font-bold text-heading tabular-nums">{subscribers[p.key] ?? 0}</p>
              <p className="text-[11px] text-muted">{brl(p.price_cents)}/{p.billing_cycle === 'yearly' ? 'ano' : 'mês'}</p>
            </div>
          ))}
        </div>

        {legacy > 0 && (
          <p className="text-xs text-muted px-1">
            <strong className="text-ink tabular-nums">{legacy}</strong> conta(s) sem plano atribuído (“legadas”): criadas antes do
            marco de assinatura, com acesso cheio. Atribua um plano no detalhe de cada conta para que entrem no MRR.
          </p>
        )}

        <PlansEditor plans={plans} subscribers={subscribers} />
      </div>
    </LayoutAdmin>
  );
}
