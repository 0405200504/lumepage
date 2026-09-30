'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { purgeNetworkTrashAction } from '@/app/actions/admin';

/** Esvazia a lixeira da rede. Confirmação por digitação — é irreversível. */
export function NetworkTrashButton({ appointments, clients }: { appointments: number; clients: number }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const total = appointments + clients;

  if (total === 0) return <p className="text-caption text-n-500">A lixeira da rede está vazia.</p>;

  const run = async () => {
    setBusy(true);
    const res = await purgeNetworkTrashAction();
    setBusy(false);
    if (res.success) { success('Lixeira esvaziada', `${total} registro(s) removido(s) em definitivo.`); setConfirming(false); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-caption font-semibold text-danger hover:bg-danger-bg transition-ui">
        <Trash2 className="h-3.5 w-3.5" /> Esvaziar lixeira ({total})
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-caption text-n-500">
        Digite <strong className="text-ink font-mono">APAGAR</strong> para confirmar:
        <input value={typed} onChange={e => setTyped(e.target.value)} aria-label="Confirmação"
          className="ml-2 field-input h-9 w-auto text-caption w-28" />
      </label>
      <button type="button" disabled={typed !== 'APAGAR' || busy} onClick={run}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-danger text-white text-caption font-semibold disabled:opacity-40">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Apagar definitivamente
      </button>
      <button type="button" onClick={() => { setConfirming(false); setTyped(''); }} className="h-8 px-3 rounded-full text-caption font-semibold text-n-600 hover:bg-n-100 hover:text-heading transition-ui">
        Cancelar
      </button>
    </div>
  );
}

/** Manda as contas obviamente de teste para a lixeira (page 1..5, "teste", @example.com). */
export function TestDataButton() {
  const router = useRouter();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm('Mover as contas de teste (page 1..5, "teste", e-mails @example.com) para a lixeira? Reversível.')) return;
    setBusy(true);
    const { trashTestAccountsAction } = await import('@/app/actions/admin-professionals');
    const res = await trashTestAccountsAction();
    setBusy(false);
    if (res.success) {
      success('Limpeza feita', res.count ? `${res.count} conta(s) de teste na lixeira.` : 'Nenhuma conta de teste encontrada.');
      router.refresh();
    } else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <button type="button" onClick={run} disabled={busy}
      className="inline-flex items-center gap-1.5 h-9 px-3.5 text-caption font-semibold rounded-full bg-surface text-heading ring-1 ring-inset ring-line-strong/70 shadow-[var(--shadow-xs)] hover:bg-n-25 hover:ring-line-strong transition-ui disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Limpar contas de teste
    </button>
  );
}
