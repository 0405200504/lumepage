import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { StatStrip, Notice } from '@/components/admin/primitives';
import { SubNav, FINANCEIRO_NAV } from '@/components/admin/SubNav';
import { PlansEditor } from '@/components/admin/PlansEditor';
import { listPlansAction } from '@/app/actions/admin-plans';
import { getSupabaseAdmin, supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';
import { brl } from '@/lib/format';

export const metadata = { title: 'Planos | Lume Admin' };

export default async function AdminPlansPage() {
  const session = await requireAdmin();
  const { plans, persisted } = await listPlansAction();

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
      subtitle="O catálogo que dá preço às assinaturas. É daqui que sai o MRR."
    >
      <div className="space-y-4">
        <SubNav items={FINANCEIRO_NAV} />

        {!persisted && (
          <Notice tone="warn" icon={<AlertTriangle />}>
            Exibindo o catálogo embutido no código. Rode <code className="font-mono">supabase/migration_v33_plans.sql</code> para editar preços e guardar o histórico.
          </Notice>
        )}

        <StatStrip cols={4} items={[
          { label: 'MRR estimado', value: brl(mrrCents), note: 'só assinaturas ativas', tone: 'accent' },
          ...plans.map(p => ({
            label: p.name, value: String(subscribers[p.key] ?? 0),
            note: `${brl(p.price_cents)}/${p.billing_cycle === 'yearly' ? 'ano' : 'mês'}`,
          })),
        ]} />

        {legacy > 0 && (
          <Notice>
            <strong className="text-heading num">{legacy}</strong> conta(s) sem plano (“legadas”): criadas antes do marco de assinatura, com acesso cheio.
            Atribua um plano no detalhe de cada conta para que entrem no MRR.
          </Notice>
        )}

        <PlansEditor plans={plans} subscribers={subscribers} />
      </div>
    </LayoutAdmin>
  );
}
