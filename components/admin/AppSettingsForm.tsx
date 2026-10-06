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
const FIELDS: { key: string; label: string; hint: string; type: 'number' | 'text' | 'boolean'; /** Valor assumido quando a chave nunca foi salva. */ fallback?: boolean }[] = [
  { key: 'trial_days', label: 'Dias de teste para conta nova', hint: 'Usado no cadastro. Hoje o padrão do banco é 7.', type: 'number' },
  { key: 'ai_monthly_message_limit', label: 'Limite de mensagens de IA por conta/mês', hint: '0 = sem limite. Serve de teto de custo por conta.', type: 'number' },
  { key: 'support_whatsapp', label: 'WhatsApp de suporte', hint: 'Exibido para as profissionais quando precisam de ajuda.', type: 'text' },
  { key: 'growth_call_slug', label: 'Agenda das calls de venda (endereço da conta da Lume)', hint: 'O final do link da conta interna da Lume que recebe as calls (ex.: lume-assessoria). A profissional agenda ali mesmo, na vitrine, igual a uma cliente.', type: 'text' },
  { key: 'growth_call_url', label: 'Link externo para a call (opcional)', hint: 'Só se não usar a agenda da Lume acima (Calendly, Google Agenda). Vazio e sem agenda = abre o WhatsApp de suporte.', type: 'text' },
  { key: 'lume_meta_business_id', label: 'ID do Gerenciador de Negócios da Lume', hint: 'Aparece no "Quero mais clientes" para a profissional adicionar a Lume como parceira na Meta. Fica em Configurações do negócio → Informações da empresa.', type: 'text' },
  { key: 'lume_google_email', label: 'E-mail da Lume para o Perfil da Empresa no Google', hint: 'A profissional convida este e-mail como gerente do perfil dela no Google.', type: 'text' },
  { key: 'signups_open', label: 'Cadastro aberto ao público', hint: 'Desligue para pausar novas contas sem tirar o site do ar.', type: 'boolean' },
  { key: 'notify_on_impersonation', label: 'Avisar a profissional quando o suporte entrar na conta dela', hint: 'Ligado por padrão. É o que torna o "Entrar como" defensável: ela sabe, e fica registrado.', type: 'boolean', fallback: true },
];

export function AppSettingsForm({ initial }: { initial: Record<string, unknown> }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [values, setValues] = useState<Record<string, string | boolean>>(() => {
    const v: Record<string, string | boolean> = {};
    for (const f of FIELDS) {
      const raw = (initial[f.key] as { value?: unknown } | undefined);
      const val = raw && typeof raw === 'object' && 'value' in raw ? raw.value : initial[f.key];
      const unset = val === undefined || val === null;
      v[f.key] = f.type === 'boolean'
        ? (unset ? Boolean(f.fallback) : Boolean(val))
        : (unset ? '' : String(val));
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
      <h2 className="px-5 py-4 text-h3 text-heading border-b border-line">Configurações globais</h2>
      <ul className="divide-y divide-line">
        {FIELDS.map(f => (
          <li key={f.key} className="px-4 py-3 flex flex-wrap items-center gap-3">
            <span className="min-w-0 flex-1">
              <span className="block text-caption font-semibold text-ink">{f.label}</span>
              <span className="block text-caption text-n-500">{f.hint}</span>
            </span>
            {f.type === 'boolean' ? (
              <input type="checkbox" checked={Boolean(values[f.key])} aria-label={f.label}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.checked }))}
                className="h-4 w-4 accent-[color:var(--color-wine-700)]" />
            ) : (
              <input type={f.type} value={String(values[f.key] ?? '')} aria-label={f.label}
                onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                className="field-input h-9 w-40 text-caption" />
            )}
            <button type="button" onClick={() => save(f.key)} disabled={saving === f.key}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface-2 text-caption font-semibold text-heading hover:bg-n-150 transition-ui disabled:opacity-50">
              {saving === f.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
