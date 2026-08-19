'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { upsertPlanAction } from '@/app/actions/admin-plans';
import { PlanRow } from '@/lib/admin/plans';
import { brl } from '@/lib/format';

/** Edita o catálogo de planos. Cada linha salva sozinha. */
export function PlansEditor({ plans, subscribers }: { plans: PlanRow[]; subscribers: Record<string, number> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {plans.map(plan => <PlanCard key={plan.key} plan={plan} subscribers={subscribers[plan.key] ?? 0} />)}
    </div>
  );
}

function PlanCard({ plan, subscribers }: { plan: PlanRow; subscribers: number }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [form, setForm] = useState(plan);
  const [saving, setSaving] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(plan);

  const save = async () => {
    setSaving(true);
    const res = await upsertPlanAction(form);
    setSaving(false);
    if (res.success) { success('Plano salvo', `${form.name} atualizado.`); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const field = 'w-full h-9 px-3 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15';
  const label = 'block text-[10px] font-bold uppercase tracking-[0.1em] text-muted mb-1';

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-ink">{form.name}</p>
          <p className="text-[11px] text-muted">chave <code className="font-mono">{form.key}</code></p>
        </div>
        <span className="text-right">
          <span className="block text-lg font-bold text-heading tabular-nums leading-none">{brl(form.price_cents)}</span>
          <span className="block text-[10px] text-muted mt-0.5">{subscribers} assinante(s)</span>
        </span>
      </div>

      <label className="block">
        <span className={label}>Nome</span>
        <input className={field} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className={label}>Preço (centavos)</span>
          <input type="number" min={0} className={field} value={form.price_cents}
            onChange={e => setForm(f => ({ ...f, price_cents: Number(e.target.value) }))} />
        </label>
        <label className="block">
          <span className={label}>Ciclo</span>
          <select className={field} value={form.billing_cycle} onChange={e => setForm(f => ({ ...f, billing_cycle: e.target.value }))}>
            <option value="monthly">Mensal</option>
            <option value="yearly">Anual</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className={label}>Descrição</span>
        <input className={field} value={form.description ?? ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
      </label>

      <label className="flex items-center gap-2 text-xs font-semibold text-ink">
        <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
          className="h-4 w-4 accent-[color:var(--color-wine-700)]" />
        Plano disponível para novas contas
      </label>

      <button type="button" disabled={!dirty || saving} onClick={save}
        className="w-full h-9 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-40 transition-colors">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
        {dirty ? 'Salvar alterações' : 'Sem alterações'}
      </button>
    </div>
  );
}

export default PlansEditor;
