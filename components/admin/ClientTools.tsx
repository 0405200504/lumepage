'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wand2, Loader2, Merge, Pencil, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { mergeClientsAction, normalizePhonesAction, renameClientAction } from '@/app/actions/admin-operations';
import { formatDateBR } from '@/lib/format';

/** Normaliza todos os telefones da base para E.164 (55+DDD+número). */
export function NormalizePhonesButton() {
  const router = useRouter();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm('Padronizar todos os telefones para 55+DDD+número? Isso reescreve os cadastros e é o que permite detectar duplicatas.')) return;
    setBusy(true);
    const res = await normalizePhonesAction();
    setBusy(false);
    if (res.success) { success('Telefones padronizados', `${res.count ?? 0} cadastro(s) corrigido(s).`); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <button type="button" onClick={run} disabled={busy}
      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-caption font-semibold rounded-full bg-surface text-heading ring-1 ring-inset ring-line-strong/70 shadow-[var(--shadow-xs)] hover:bg-n-25 hover:ring-line-strong transition-ui disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
      Padronizar telefones
    </button>
  );
}

/** Renomeia uma cliente cujo "nome" é o próprio telefone. */
export function RenameClientButton({ id, current }: { id: string; current: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(current);
  const [busy, setBusy] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} aria-label="Corrigir nome"
        className="icon-chip h-8 w-8">
        <Pencil className="h-3.5 w-3.5" />
      </button>
    );
  }

  const save = async () => {
    setBusy(true);
    const res = await renameClientAction(id, value);
    setBusy(false);
    if (res.success) { success('Nome corrigido', value); setEditing(false); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <span className="inline-flex items-center gap-1">
      <input value={value} onChange={e => setValue(e.target.value)} autoFocus aria-label="Novo nome"
        className="field-input h-9 w-auto text-caption w-40" />
      <button type="button" onClick={save} disabled={busy} aria-label="Salvar nome"
        className="p-1.5 rounded-lg text-success hover:bg-surface-2">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
      </button>
    </span>
  );
}

export interface MergeCandidate {
  id: string; name: string; whatsapp: string; email: string | null; visits: number; createdAt: string;
}

/**
 * Um grupo de duplicatas: escolhe-se a principal e as demais são fundidas nela.
 * O histórico de agendamentos migra junto — nada é apagado.
 */
export function MergeGroupCard({ phoneKey, professionalName, clients }: {
  phoneKey: string; professionalName: string; clients: MergeCandidate[];
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [primary, setPrimary] = useState(clients[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return null;

  const merge = async () => {
    const others = clients.filter(c => c.id !== primary).map(c => c.id);
    if (!others.length) return;
    if (!confirm(`Fundir ${others.length} cadastro(s) em "${clients.find(c => c.id === primary)?.name}"? O histórico vai junto.`)) return;
    setBusy(true);
    const res = await mergeClientsAction(primary, others);
    setBusy(false);
    if (res.success) { success('Clientes unificadas', `${res.count} cadastro(s) fundido(s).`); setDone(true); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-label text-heading num">{phoneKey}</p>
          <p className="text-caption text-n-500">{professionalName} · {clients.length} cadastros</p>
        </div>
        <button type="button" onClick={merge} disabled={busy}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-wine-700 hover:bg-wine-800 text-white shadow-[var(--shadow-wine)] transition-ui text-caption font-semibold disabled:opacity-50 transition-colors">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />} Unificar
        </button>
      </div>

      <ul className="space-y-1.5">
        {clients.map(c => (
          <li key={c.id}>
            <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-chip bg-surface-2 hover:bg-n-150 cursor-pointer text-caption transition-ui">
              <input type="radio" name={`primary-${phoneKey}`} checked={primary === c.id} onChange={() => setPrimary(c.id)}
                className="h-4 w-4 accent-[color:var(--color-wine-700)]" />
              <span className="flex-1 min-w-0">
                <span className="block font-semibold text-ink truncate">{c.name}</span>
                <span className="block text-caption text-n-500 num">{c.whatsapp} · {c.visits} visita(s) · desde {formatDateBR(c.createdAt)}</span>
              </span>
              {primary === c.id && <span className="text-caption font-bold uppercase text-accent-link">principal</span>}
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
