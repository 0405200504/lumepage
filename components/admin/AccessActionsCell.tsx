'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Link2, Copy, Check, X, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { sendPasswordResetAction, createMagicLinkAction } from '@/app/actions/admin-access';

/**
 * Redefinir e Link mágico direto na linha da visão de acessos — os dois pedidos que
 * chegam por WhatsApp e não deveriam custar três cliques.
 *
 * "Definir senha temporária" ficou de fora daqui de propósito: invalida a senha atual
 * da profissional, então merece o contexto da aba Acesso, não um clique de passagem.
 */
export function AccessActionsCell({ id, brandName, hasAuthUser }: {
  id: string; brandName: string; hasAuthUser: boolean;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [link, setLink] = useState<{ title: string; value: string; note: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const btn = 'inline-flex items-center gap-1 h-7 px-2 rounded-xl text-caption font-bold text-muted hover:text-ink hover:bg-surface-2 transition-colors disabled:opacity-40';

  return (
    <>
      <button
        type="button" disabled={pending || !hasAuthUser} className={btn} title="Enviar link de redefinição por e-mail"
        onClick={() => start(async () => {
          const res = await sendPasswordResetAction(id);
          if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
          if (res.url) setLink({ title: 'Link de redefinição', value: res.url, note: res.error ?? 'Vale 1 hora, uso único.' });
          else success('Enviado', `Link de redefinição a caminho de ${brandName}.`);
          router.refresh();
        })}
      >
        <Mail className="h-3.5 w-3.5" aria-hidden /> Redefinir
      </button>

      <button
        type="button" disabled={pending} className={btn} title="Gerar link mágico (15 min, uso único)"
        onClick={() => start(async () => {
          const res = await createMagicLinkAction(id);
          if (!res.success || !res.url) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
          setLink({ title: 'Link mágico', value: res.url, note: 'Vale 15 minutos, só funciona uma vez e não aparece de novo.' });
          router.refresh();
        })}
      >
        <Link2 className="h-3.5 w-3.5" aria-hidden /> Link
      </button>

      {link && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label={link.title}>
          <div className="absolute inset-0 bg-wine-950/45" onClick={() => setLink(null)} />
          <div className="relative w-full max-w-lg card p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-label font-bold text-ink">{link.title}</h2>
                <p className="text-caption text-muted mt-0.5">{brandName}</p>
              </div>
              <button type="button" onClick={() => setLink(null)} aria-label="Fechar" className="p-1.5 rounded-lg text-muted hover:bg-surface-2"><X className="h-4 w-4" /></button>
            </div>
            <p className="rounded-xl bg-surface-2 border border-line px-3 py-2.5 font-mono text-caption text-ink break-all select-all">{link.value}</p>
            <p className="text-caption text-warning font-semibold flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" aria-hidden /> {link.note}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => { await navigator.clipboard.writeText(link.value); setCopied(true); setTimeout(() => setCopied(false), 1600); }}
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AccessActionsCell;
