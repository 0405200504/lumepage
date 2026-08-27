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

  if (total === 0) return <p className="text-caption text-muted">A lixeira da rede está vazia.</p>;

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
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-caption font-bold text-danger hover:bg-danger-bg transition-colors">
        <Trash2 className="h-3.5 w-3.5" /> Esvaziar lixeira ({total})
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-caption text-muted">
        Digite <strong className="text-ink font-mono">APAGAR</strong> para confirmar:
        <input value={typed} onChange={e => setTyped(e.target.value)} aria-label="Confirmação"
          className="ml-2 h-8 px-2 rounded-lg border border-line bg-surface text-caption text-ink w-28" />
      </label>
      <button type="button" disabled={typed !== 'APAGAR' || busy} onClick={run}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-danger text-white text-caption font-bold disabled:opacity-40">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Apagar definitivamente
      </button>
      <button type="button" onClick={() => { setConfirming(false); setTyped(''); }} className="h-8 px-3 rounded-lg text-caption font-bold text-muted hover:bg-surface-2">
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
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border border-line bg-surface text-caption font-bold text-ink hover:bg-surface-2 transition-colors disabled:opacity-50">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Limpar contas de teste
    </button>
  );
}
