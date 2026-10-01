'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Link2, XCircle, Loader2, Send, Copy } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import {
  linkOrphanPurchaseAction, dismissOrphanPurchaseAction, resendOrphanWelcomeAction,
} from '@/app/actions/admin-crm';
import { button, fieldSm, cx } from './ui';

/**
 * Ações de uma compra órfã: ligar a uma conta (aplica o plano, igual ao
 * webhook), reenviar o e-mail com o link do cadastro, copiar esse link para
 * mandar no WhatsApp, ou descartar.
 */
export function OrphanPurchaseActions({ purchaseKey, accounts, suggestedId, signupUrl, canWelcome }: {
  purchaseKey: string;
  accounts: { value: string; label: string }[];
  /** Conta com o mesmo e-mail ou telefone, se houver. */
  suggestedId?: string | null;
  /** Link do cadastro com o e-mail da compra (null se a Hubla não mandou e-mail). */
  signupUrl: string | null;
  /** O pagamento ainda vale — faz sentido chamar a compradora para se cadastrar. */
  canWelcome: boolean;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [account, setAccount] = useState(suggestedId ?? '');
  const [pending, start] = useTransition();

  const link = () => start(async () => {
    const res = await linkOrphanPurchaseAction(purchaseKey, account);
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    success('Compra vinculada', res.applied ?? 'vinculada');
    router.refresh();
  });

  const resend = () => start(async () => {
    const res = await resendOrphanWelcomeAction(purchaseKey);
    if (!res.success) { error('E-mail não enviado', res.error ?? 'Tente de novo.'); return; }
    success('E-mail enviado', 'Ela recebeu o link do cadastro de novo.');
    router.refresh();
  });

  const copy = async () => {
    if (!signupUrl) return;
    try {
      await navigator.clipboard.writeText(signupUrl);
      success('Link copiado', 'Cole no WhatsApp dela.');
    } catch {
      error('Não deu para copiar', signupUrl);
    }
  };

  const dismiss = () => {
    if (!confirm('Descartar esta compra? Ela sai da fila, mas continua no histórico.')) return;
    start(async () => {
      const res = await dismissOrphanPurchaseAction(purchaseKey);
      if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
      success('Pronto', 'Compra descartada.');
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
      {canWelcome && signupUrl && (
        <>
          <button type="button" disabled={pending} onClick={resend} className={button('secondary', 'sm')}>
            <Send className="h-3.5 w-3.5" /> Reenviar e-mail
          </button>
          <button type="button" onClick={copy} className={button('ghost', 'sm')} title="Copiar link do cadastro">
            <Copy className="h-3.5 w-3.5" /> Copiar link
          </button>
        </>
      )}
      <button type="button" disabled={pending} onClick={dismiss} className={button('ghost', 'sm')} title="Descartar">
        <XCircle className="h-3.5 w-3.5" /> Descartar
      </button>
    </div>
  );
}

export default OrphanPurchaseActions;
