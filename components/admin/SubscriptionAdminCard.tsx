'use client';

import { formatDateBR } from '@/lib/format';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional } from '@/types/database';
import { Save, Sparkles, Clock, ShieldCheck, CalendarClock } from 'lucide-react';
import { updateProfessionalSubscriptionAction } from '@/app/actions/admin';
import { isLegacyAccount, PLAN_LABEL } from '@/lib/subscription/entitlements';
import { useToast } from '../ui/Toast';

interface Props {
  professional: Professional;
}

/** yyyy-mm-dd para <input type="date"> a partir de um ISO. */
function toDateInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/** Dias restantes até o vencimento (negativo = vencido). */
function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Toda data do painel passa por lib/format.ts — nada de toLocaleDateString solto. */
const formatDate = (iso?: string | null): string => formatDateBR(iso, '—');

export const SubscriptionAdminCard: React.FC<Props> = ({ professional }) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [saving, setSaving] = useState(false);

  const legacy = isLegacyAccount(professional.created_at);

  const [plan, setPlan] = useState<string>(professional.subscription_plan ?? '');
  const [status, setStatus] = useState<'active' | 'trialing'>(
    professional.subscription_status === 'active' ? 'active' : 'trialing',
  );
  const [endsAt, setEndsAt] = useState<string>(toDateInput(professional.subscription_ends_at));

  const remaining = daysUntil(endsAt ? new Date(endsAt + 'T23:59:59').toISOString() : null);

  const addDays = (n: number) => {
    const base = new Date();
    base.setDate(base.getDate() + n);
    setEndsAt(base.toISOString().slice(0, 10));
    setStatus('active');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateProfessionalSubscriptionAction(professional.id, {
        plan: (plan || null) as 'start' | 'pro' | 'premium' | null,
        status,
        endsAt: endsAt ? new Date(endsAt + 'T23:59:59').toISOString() : null,
      });
      if (res.success) {
        success('Plano atualizado!', 'As permissões da profissional foram ajustadas.');
        router.refresh();
      } else {
        error('Falha', res.error || 'Não foi possível salvar o plano.');
      }
    } catch {
      error('Erro', 'Ocorreu uma falha na rede.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-n-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6 max-w-3xl">
      <div className="flex items-center gap-2 border-b border-n-100 pb-3">
        <Sparkles className="h-4 w-4 text-wine-700" />
        <h3 className="text-label font-bold text-n-800 uppercase tracking-wider">Assinatura & Plano</h3>
      </div>

      {legacy ? (
        <div className="flex items-start gap-3 rounded-2xl bg-warning-bg border border-warning-border px-4 py-3">
          <ShieldCheck className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-label font-bold text-warning">Conta legada — acesso cheio</p>
            <p className="text-caption text-warning mt-0.5">
              Criada em {formatDate(professional.created_at)}, antes das regras de plano. As limitações
              não se aplicam a ela. Você ainda pode registrar o plano abaixo para organização.
            </p>
          </div>
        </div>
      ) : null}

      {/* Situação atual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-n-200 p-4">
          <p className="text-caption font-bold text-n-600 uppercase tracking-wider">Plano atual</p>
          <p className="text-h3 font-semibold text-ink mt-1">
            {professional.subscription_plan ? PLAN_LABEL[professional.subscription_plan] : '—'}
          </p>
          <p className="text-caption text-n-600 mt-0.5 capitalize">{professional.subscription_status || 'sem status'}</p>
        </div>
        <div className="rounded-2xl border border-n-200 p-4">
          <p className="text-caption font-bold text-n-600 uppercase tracking-wider flex items-center gap-1"><Clock className="h-3 w-3" /> Acesso desde</p>
          <p className="text-h3 font-semibold text-ink mt-1">{formatDate(professional.created_at)}</p>
        </div>
        <div className="rounded-2xl border border-n-200 p-4">
          <p className="text-caption font-bold text-n-600 uppercase tracking-wider flex items-center gap-1"><CalendarClock className="h-3 w-3" /> Vence em</p>
          <p className="text-h3 font-semibold text-ink mt-1">{formatDate(professional.subscription_ends_at)}</p>
          {remaining !== null && (
            <p className={`text-caption font-bold mt-0.5 ${remaining < 0 ? 'text-bad' : remaining <= 7 ? 'text-warn' : 'text-ok'}`}>
              {remaining < 0 ? `Vencido há ${Math.abs(remaining)} dia(s)` : `Faltam ${remaining} dia(s)`}
            </p>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Plano</label>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}
            className="block w-full px-3 py-2.5 border border-n-200 bg-white rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
            <option value="">Sem plano</option>
            <option value="start">Start</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
          </select>
        </div>
        <div>
          <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Situação</label>
          <select value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'trialing')}
            className="block w-full px-3 py-2.5 border border-n-200 bg-white rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
            <option value="active">Ativo (acesso liberado)</option>
            <option value="trialing">Em teste (trial)</option>
          </select>
        </div>
        <div>
          <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Vencimento do acesso</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)}
            className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => addDays(30)} className="px-3 py-2 rounded-xl border border-n-200 text-caption font-semibold text-n-600 hover:bg-n-50">Liberar 1 mês</button>
        <button type="button" onClick={() => addDays(365)} className="px-3 py-2 rounded-xl border border-n-200 text-caption font-semibold text-n-600 hover:bg-n-50">Liberar 1 ano</button>
        <button type="button" onClick={() => setEndsAt('')} className="px-3 py-2 rounded-xl border border-n-200 text-caption font-semibold text-n-600 hover:bg-n-50">Sem vencimento</button>
        <div className="flex-1" />
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-3 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60">
          <Save className="h-4 w-4" />
          <span>{saving ? 'Salvando...' : 'Salvar plano'}</span>
        </button>
      </div>
    </div>
  );
};

export default SubscriptionAdminCard;
