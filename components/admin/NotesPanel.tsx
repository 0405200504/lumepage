'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pin, PinOff, Trash2, Loader2, Save, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { addNoteAction, setNotePinnedAction, deleteNoteAction, saveAccountMetaAction } from '@/app/actions/admin-crm';
import type { AdminNote, AccountMeta } from '@/lib/admin/crm';
import { button, field, fieldLabel, cx } from './ui';
import { formatDateTimeBR } from '@/lib/format';
import { buildWhatsappLink } from '@/lib/whatsapp';

/**
 * Aba "Notas" do detalhe da conta: o CRM do admin.
 *   - à esquerda, o que foi combinado com a conta (responsável, etiquetas,
 *     próximo contato, motivo de cancelamento);
 *   - à direita, as notas de suporte, com fixar/apagar.
 */

const TAG_SUGGESTIONS = ['vip', 'indicação', 'risco', 'quer-upgrade', 'suporte-aberto', 'parceira'];

export function AccountMetaForm({ meta, admins, whatsapp, brandName }: {
  meta: AccountMeta; admins: string[]; whatsapp?: string | null; brandName: string;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [owner, setOwner] = useState(meta.owner_email ?? '');
  const [tags, setTags] = useState(meta.tags.join(', '));
  const [follow, setFollow] = useState(meta.next_follow_up ?? '');
  const [churn, setChurn] = useState(meta.churn_reason ?? '');

  const save = () => start(async () => {
    const res = await saveAccountMetaAction(meta.professional_id, {
      ownerEmail: owner, tags: tags.split(',').map(t => t.trim()).filter(Boolean), nextFollowUp: follow || null, churnReason: churn,
    });
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    success('Salvo', 'Dados da conta atualizados.');
    router.refresh();
  });

  const waMessage = `Oi, ${brandName}! Aqui é da Lume. `;

  return (
    <form onSubmit={e => { e.preventDefault(); save(); }} className="space-y-4">
      <label className="block">
        <span className={fieldLabel}>Responsável na Lume</span>
        <input list="admin-owners" value={owner} onChange={e => setOwner(e.target.value)} placeholder="e-mail de quem cuida desta conta" className={field} />
        <datalist id="admin-owners">{admins.map(a => <option key={a} value={a} />)}</datalist>
      </label>

      <label className="block">
        <span className={fieldLabel}>Etiquetas</span>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="vip, indicação, risco…" className={field} />
        <span className="mt-1.5 flex flex-wrap gap-1">
          {TAG_SUGGESTIONS.map(t => (
            <button key={t} type="button" onClick={() => setTags(v => (v.split(',').map(x => x.trim()).includes(t) ? v : [v, t].filter(Boolean).join(', ')))}
              className="h-6 px-2 rounded-full bg-surface-2 text-micro font-semibold text-n-600 hover:bg-n-150 transition-ui">
              + {t}
            </button>
          ))}
        </span>
      </label>

      <label className="block">
        <span className={fieldLabel}>Próximo contato</span>
        <input type="date" value={follow} onChange={e => setFollow(e.target.value)} className={cx(field, 'w-auto')} />
        <span className="block text-caption text-n-500 mt-1">Aparece na Início quando o dia chega.</span>
      </label>

      <label className="block">
        <span className={fieldLabel}>Motivo de cancelamento (se saiu)</span>
        <input value={churn} onChange={e => setChurn(e.target.value)} placeholder="preço, parou de atender, foi para concorrente…" className={field} />
      </label>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button type="submit" disabled={pending} className={button('primary', 'sm')}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar
        </button>
        {whatsapp && (
          <a href={buildWhatsappLink(whatsapp, waMessage)} target="_blank" rel="noopener noreferrer" className={button('secondary', 'sm')}>
            <MessageCircle className="h-3.5 w-3.5" /> Chamar no WhatsApp
          </a>
        )}
      </div>
    </form>
  );
}

export function NotesList({ professionalId, notes }: { professionalId: string; notes: AdminNote[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pending, start] = useTransition();
  const [body, setBody] = useState('');

  const run = (fn: () => Promise<{ success: boolean; error?: string }>, ok?: string) => start(async () => {
    const res = await fn();
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    if (ok) success('Pronto', ok);
    router.refresh();
  });

  return (
    <div className="space-y-4">
      <form onSubmit={e => { e.preventDefault(); if (body.trim()) { run(() => addNoteAction(professionalId, body), 'Nota salva.'); setBody(''); } }} className="space-y-2">
        <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="O que aconteceu nesta conta? Ligação, pedido, promessa, problema…"
          className={cx(field, '!h-auto')} />
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !body.trim()} className={button('primary', 'sm')}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Adicionar nota
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-caption text-n-500 text-center py-6">Nenhuma nota ainda. A primeira costuma ser “como ela chegou até nós”.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map(n => (
            <li key={n.id} className={cx('rounded-surface p-4', n.pinned ? 'bg-accent-soft' : 'bg-surface-2')}>
              <p className="text-body-sm text-heading whitespace-pre-wrap">{n.body}</p>
              <div className="mt-2 flex items-center gap-2 text-caption text-n-500">
                <span className="num">{formatDateTimeBR(n.created_at)}</span>
                {n.admin_email && <span>· {n.admin_email}</span>}
                <span className="ml-auto inline-flex gap-0.5">
                  <button type="button" disabled={pending} onClick={() => run(() => setNotePinnedAction(n.id, !n.pinned))}
                    aria-label={n.pinned ? 'Desafixar' : 'Fixar'} className="icon-chip h-7 w-7 bg-transparent">
                    {n.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                  </button>
                  <button type="button" disabled={pending} onClick={() => { if (confirm('Apagar esta nota?')) run(() => deleteNoteAction(n.id), 'Nota apagada.'); }}
                    aria-label="Apagar" className="icon-chip h-7 w-7 bg-transparent hover:!bg-danger-bg hover:!text-danger">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
