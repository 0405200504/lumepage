'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { changeOwnPasswordAction } from '@/app/actions/access';

/**
 * Sobreposição obrigatória depois de uma senha temporária definida pelo suporte.
 * Sem botão de fechar de propósito: a senha temporária foi vista por outra pessoa
 * (quem gerou), então ela precisa deixar de valer no primeiro acesso.
 */
export function ForcePasswordChange() {
  const router = useRouter();
  const { success, error } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { error('Confira', 'As duas senhas não são iguais.'); return; }

    setSaving(true);
    const res = await changeOwnPasswordAction(current, next);
    setSaving(false);

    if (res.success) { success('Senha trocada', 'Agora só você sabe.'); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const field = 'w-full h-11 px-3 rounded-xl border border-line bg-surface text-sm text-ink focus:outline-none focus:ring-2 focus:ring-wine-700/15';

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 bg-[#1a0409]/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Trocar senha">
      <div className="w-full max-w-sm card p-6 space-y-4">
        <div className="flex items-start gap-3">
          <span className="h-9 w-9 rounded-xl bg-accent-soft text-accent-link flex items-center justify-center shrink-0">
            <KeyRound className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h2 className="text-sm font-bold text-ink">Escolha a sua senha</h2>
            <p className="text-xs text-muted mt-0.5">
              A senha atual foi criada pelo suporte para você conseguir entrar. Troque agora —
              a partir daí ninguém além de você a conhece.
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Senha atual (a que o suporte passou)</span>
            <input type="password" required autoComplete="current-password" className={field} value={current} onChange={e => setCurrent(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Nova senha</span>
            <input type="password" required autoComplete="new-password" minLength={8} className={field} value={next} onChange={e => setNext(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold uppercase tracking-[0.08em] text-muted mb-1">Repita a nova senha</span>
            <input type="password" required autoComplete="new-password" minLength={8} className={field} value={confirm} onChange={e => setConfirm(e.target.value)} />
          </label>
          <button type="submit" disabled={saving || next.length < 8 || next !== confirm}
            className="w-full h-11 rounded-xl bg-forest hover:bg-forest-hover text-white text-sm font-bold disabled:opacity-50">
            {saving ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ForcePasswordChange;
