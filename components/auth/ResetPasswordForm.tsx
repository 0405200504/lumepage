'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { resetPasswordWithTokenAction } from '@/app/actions/access';

/**
 * Formulário de nova senha. O valor sai daqui direto para a server action, que o
 * entrega ao GoTrue — não passa por nenhuma tabela nossa e não é guardado em lugar
 * nenhum de onde possa ser lido de volta.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && confirm !== password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { error('Confira', 'As duas senhas não são iguais.'); return; }

    setSaving(true);
    const res = await resetPasswordWithTokenAction(token, password);
    setSaving(false);

    if (res.success) {
      success('Senha criada', 'Pronto — agora entre com a senha nova.');
      router.push('/login');
    } else {
      error('Não deu', res.error ?? 'Tente de novo.');
    }
  };

  const field = 'block w-full pl-10 pr-10 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 transition-ui';

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="new-password" className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">
          Nova senha
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Lock className="h-4 w-4 text-n-600" aria-hidden />
          </div>
          <input
            id="new-password" type={show ? 'text' : 'password'} required autoComplete="new-password"
            placeholder="pelo menos 8 caracteres" value={password}
            onChange={e => setPassword(e.target.value)} className={field}
          />
          <button type="button" onClick={() => setShow(v => !v)} aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-n-600 hover:text-wine-700">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {tooShort && <p className="text-caption text-danger mt-1.5">Faltam {8 - password.length} caractere(s).</p>}
      </div>

      <div>
        <label htmlFor="confirm-password" className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">
          Repita a senha
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Check className="h-4 w-4 text-n-600" aria-hidden />
          </div>
          <input
            id="confirm-password" type={show ? 'text' : 'password'} required autoComplete="new-password"
            placeholder="a mesma de cima" value={confirm}
            onChange={e => setConfirm(e.target.value)} className={field}
          />
        </div>
        {mismatch && <p className="text-caption text-danger mt-1.5">As duas senhas não são iguais.</p>}
      </div>

      <button
        type="submit" disabled={saving || password.length < 8 || password !== confirm}
        className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui disabled:opacity-50"
      >
        {saving ? 'Salvando…' : 'Salvar e entrar'}
      </button>
    </form>
  );
}

export default ResetPasswordForm;
