'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { linkHublaEventAction, dismissHublaEventAction } from '@/app/actions/admin-crm';
import { button, fieldSm, cx } from './ui';

/**
 * Um pagamento sem dona: o admin escolhe a conta e vincula. Se o evento for de
 * liberação, o plano é aplicado na hora (igual ao webhook). Ou descarta.
 */
export function HublaReconcileRow({ eventKey, accounts, suggestedId }: {
  eventKey: string;
  accounts: { value: string; label: string }[];
  /** Conta com telefone/nome parecido, se houver. */
  suggestedId?: string | null;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [account, setAccount] = useState(suggestedId ?? '');
  const [pending, start] = useTransition();

  const link = () => start(async () => {
    const res = await linkHublaEventAction(eventKey, account);
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    success('Pagamento conciliado', res.applied ?? 'vinculado');
    router.refresh();
  });

  const dismiss = () => {
    if (!confirm('Descartar este evento? Ele some da fila, mas continua no histórico.')) return;
    start(async () => {
      const res = await dismissHublaEventAction(eventKey);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      success('Pronto', 'Evento descartado.');
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={account} onChange={e => setAccount(e.target.value)} aria-label="Conta" className={cx(fieldSm, 'w-auto max-w-[16rem]')}>
        <option value="">Escolher a conta…</option>
        {accounts.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
      </select>
      <button type="button" disabled={pending || !account} onClick={link} className={button('primary', 'sm')}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2 className="h-3.5 w-3.5" />} Vincular
      </button>
      <button type="button" disabled={pending} onClick={dismiss} className={button('ghost', 'sm')} title="Descartar">
        <XCircle className="h-3.5 w-3.5" /> Descartar
      </button>
    </div>
  );
}

export default HublaReconcileRow;
