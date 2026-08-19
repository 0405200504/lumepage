'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle, Trash2, Loader2, CreditCard, X, Eye, Pencil } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  bulkSetStatusAction, bulkTrashAction, impersonateAction, changePlanAction, PlanChange, SupportMode,
} from '@/app/actions/admin-professionals';

/**
 * Ações primárias do detalhe da conta: Entrar como, pausar/reativar, mudar plano,
 * lixeira. Tudo passa por server action com assertAdmin() e vai para a auditoria.
 */
export function ProfessionalActions({ id, brandName, status, plan, subscriptionStatus, endsAt }: {
  id: string;
  brandName: string;
  status: string;
  plan: string | null;
  subscriptionStatus: string | null;
  endsAt: string | null;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [showPlan, setShowPlan] = useState(false);

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string, redirect?: string) => {
    start(async () => {
      const res = await fn();
      if (res.success) {
        success('Pronto', okMsg);
        if (redirect) window.location.href = redirect;
        else router.refresh();
      } else {
        error('Não deu', res.error ?? 'Tente de novo.');
      }
    });
  };

  /** Sessão de suporte em nova aba: a aba do admin continua onde estava. */
  const enter = (mode: SupportMode) =>
    start(async () => {
      const res = await impersonateAction(id, mode);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      window.open(res.url ?? '/dashboard', '_blank', 'noopener');
      success('Sessão de suporte aberta', `${brandName} · ${mode === 'read' ? 'somente leitura' : 'pode editar'} · 30 min`);
    });

  const btn = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold transition-colors disabled:opacity-50';

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Entrar como: modo explícito e NOVA ABA — o admin não perde a tela onde estava. */}
        <span className="inline-flex rounded-[4px] overflow-hidden border border-line">
          <button
            type="button" disabled={pending}
            title="Abre o painel desta profissional em nova aba, sessão de suporte de 30 min, sem poder alterar nada"
            onClick={() => enter('read')}
            className={`${btn} rounded-none bg-forest hover:bg-forest-hover text-white`}
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
            Entrar como · só olhar
          </button>
          <button
            type="button" disabled={pending}
            title="Mesma sessão, mas com permissão de alterar dados desta conta"
            onClick={() => { if (confirm(`Entrar na conta de ${brandName} PODENDO EDITAR? Toda alteração fica registrada no seu nome.`)) enter('edit'); }}
            className={`${btn} rounded-none border-l border-white/20 bg-forest hover:bg-forest-hover text-white px-2.5`}
          >
            <Pencil className="h-3.5 w-3.5" /> editar
          </button>
        </span>

        <button type="button" disabled={pending} onClick={() => setShowPlan(true)} className={`${btn} border border-line bg-surface text-ink hover:bg-surface-2`}>
          <CreditCard className="h-3.5 w-3.5" /> Mudar plano
        </button>

        {status === 'active' ? (
          <button type="button" disabled={pending} className={`${btn} border border-line bg-surface text-ink hover:bg-surface-2`}
            onClick={() => { if (confirm(`Pausar ${brandName}? A conta some da busca pública.`)) run(() => bulkSetStatusAction([id], 'paused'), 'Conta pausada.'); }}>
            <PauseCircle className="h-3.5 w-3.5" /> Pausar
          </button>
        ) : (
          <button type="button" disabled={pending} className={`${btn} border border-line bg-surface text-ink hover:bg-surface-2`}
            onClick={() => run(() => bulkSetStatusAction([id], 'active'), 'Conta reativada.')}>
            <PlayCircle className="h-3.5 w-3.5" /> Reativar
          </button>
        )}

        <button type="button" disabled={pending} className={`${btn} text-[color:var(--color-bad)] hover:bg-[color:var(--color-bad)]/10`}
          onClick={() => { if (confirm(`Mover ${brandName} para a lixeira? Reversível.`)) run(() => bulkTrashAction([id]), 'Movida para a lixeira.', '/admin/professionals'); }}>
          <Trash2 className="h-3.5 w-3.5" /> Lixeira
        </button>
      </div>

      {showPlan && (
        <PlanDialog
          id={id} brandName={brandName} plan={plan} subscriptionStatus={subscriptionStatus} endsAt={endsAt}
          onClose={() => setShowPlan(false)}
          onSaved={() => { setShowPlan(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function PlanDialog({ id, brandName, plan, subscriptionStatus, endsAt, onClose, onSaved }: {
  id: string; brandName: string; plan: string | null; subscriptionStatus: string | null; endsAt: string | null;
  onClose: () => void; onSaved: () => void;
}) {
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PlanChange>({
    plan: (plan as PlanChange['plan']) ?? null,
    status: (subscriptionStatus as PlanChange['status']) ?? 'trialing',
    endsAt: endsAt ? endsAt.slice(0, 10) : null,
    note: '',
  });

  const save = async () => {
    setSaving(true);
    const res = await changePlanAction([id], {
      ...form,
      endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).toISOString() : null,
    });
    setSaving(false);
    if (res.success) { success('Plano atualizado', `${brandName} agora está em ${form.plan ?? 'sem plano'}.`); onSaved(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const field = 'w-full h-9 px-3 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Mudar plano">
      <div className="absolute inset-0 bg-[#1a0e12]/50" onClick={onClose} />
      <div className="relative w-full max-w-md card p-5 space-y-4 animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-ink">Mudar plano</h2>
            <p className="text-xs text-muted mt-0.5">{brandName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="p-1.5 rounded-lg text-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </div>

        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Plano</span>
          <select className={field} value={form.plan ?? ''} onChange={e => setForm(f => ({ ...f, plan: (e.target.value || null) as PlanChange['plan'] }))}>
            <option value="">Sem plano (legada)</option>
            <option value="start">Start</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Situação</span>
          <select className={field} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as PlanChange['status'] }))}>
            <option value="trialing">Em teste</option>
            <option value="active">Ativa (paga)</option>
            <option value="past_due">Inadimplente</option>
            <option value="canceled">Cancelada</option>
          </select>
        </label>

        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Acesso vence em</span>
          <input type="date" className={field} value={form.endsAt ?? ''} onChange={e => setForm(f => ({ ...f, endsAt: e.target.value || null }))} />
        </label>

        <label className="block">
          <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Observação (vai para o histórico)</span>
          <input className={field} value={form.note ?? ''} placeholder="ex.: cupom de lançamento, cortesia, upgrade" onChange={e => setForm(f => ({ ...f, note: e.target.value }))} />
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="h-9 px-3 rounded-xl text-xs font-bold text-muted hover:bg-surface-2">Cancelar</button>
          <button type="button" disabled={saving} onClick={save} className="h-9 px-4 rounded-xl bg-forest hover:bg-forest-hover text-white text-xs font-bold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalActions;
