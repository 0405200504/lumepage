'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { saveAppSettingAction } from '@/app/actions/admin-system';

/**
 * Ajustes globais da plataforma. Chave/valor em `app_settings` — o app lê conforme
 * for precisando; aqui é onde se muda sem deploy.
 */
const FIELDS: { key: string; label: string; hint: string; type: 'number' | 'text' | 'boolean' }[] = [
  { key: 'trial_days', label: 'Dias de teste para conta nova', hint: 'Usado no cadastro. Hoje o padrão do banco é 7.', type: 'number' },
  { key: 'ai_monthly_message_limit', label: 'Limite de mensagens de IA por conta/mês', hint: '0 = sem limite. Serve de teto de custo por conta.', type: 'number' },
  { key: 'support_whatsapp', label: 'WhatsApp de suporte', hint: 'Exibido para as profissionais quando precisam de ajuda.', type: 'text' },
  { key: 'signups_open', label: 'Cadastro aberto ao público', hint: 'Desligue para pausar novas contas sem tirar o site do ar.', type: 'boolean' },
];

export function AppSettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {};
    for (const f of FIELDS) {
      const raw = (initial[f.key] as { value?: unknown } | undefined);
      const val = raw && typeof raw === 'object' && 'value' in raw ? raw.value : initial[f.key];
      v[f.key] = f.type === 'boolean' ? Boolean(val) : (val === undefined || val === null ? '' : String(val));
    }
    return v;
  });
  const [saving, setSaving] = useState<string | null>(null);

  const save = async (key: string) => {
    setSaving(key);
    const res = await saveAppSettingAction(key, { value: values[key] });
    setSaving(null);
    if (res.success) { success('Salvo', 'Configuração atualizada.'); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <section className="card overflow-hidden">
      <h2 className="px-4 py-3 text-sm font-bold text-ink border-b border-line">Configurações globais</h2>
      <ul className="divide-y divide-line">
        {FIELDS.map(f => (
          <li key={f.key} className="px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-ink">{f.label}</span>
              <span className="block text-[11px] text-muted">{f.hint}</span>
            </span>
            {f.type === 'boolean' ? (
              <input type="checkbox" checked={Boolean(values[f.key])} aria-label={f.label}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked }))}
                className="h-4 w-4 accent-[color:var(--color-wine-700)]" />
            ) : (
              <input type={f.type} value={String(values[f.key] ?? '')} aria-label={f.label}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="h-9 px-3 w-40 rounded-xl border border-line bg-surface text-sm text-ink" />
            )}
            <button type="button" onClick={() => save(f.key)} disabled={saving === f.key}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-xs font-bold text-ink hover:bg-surface-2 disabled:opacity-50">
              {saving === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
