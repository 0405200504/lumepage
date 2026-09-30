'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createAdminUserAction } from '@/app/actions/admin-crm';
import { button, field, fieldLabel } from './ui';

/** Cria um administrador da plataforma sem abrir o Supabase. */
export function CreateAdminForm() {
  const router = useRouter();
  const { success, error } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [pending, start] = useTransition();

  const submit = () => start(async () => {
    const res = await createAdminUserAction(form);
    if (!res.success) { error('Não deu', res.error ?? 'Tente de novo.'); return; }
    success('Administrador criado', `${form.email} já pode entrar em /admin-login.`);
    setForm({ name: '', email: '', password: '' });
    setOpen(false);
    router.refresh();
  });

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={button('secondary', 'sm')}>
        <UserPlus className="h-3.5 w-3.5" /> Novo administrador
      </button>
    );
  }

  return (
    <form onSubmit={e => { e.preventDefault(); submit(); }} className="grid gap-3 sm:grid-cols-3 items-end">
      <label className="block">
        <span className={fieldLabel}>Nome</span>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={field} required />
      </label>
      <label className="block">
        <span className={fieldLabel}>E-mail</span>
        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={field} required />
      </label>
      <label className="block">
        <span className={fieldLabel}>Senha (mín. 8)</span>
        <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className={field} required minLength={8} />
      </label>
      <div className="sm:col-span-3 flex items-center gap-2">
        <button type="submit" disabled={pending} className={button('primary', 'sm')}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />} Criar
        </button>
        <button type="button" onClick={() => setOpen(false)} className={button('ghost', 'sm')}>Cancelar</button>
        <span className="text-caption text-n-500">Acesso total, como o seu. Fica registrado na auditoria.</span>
      </div>
    </form>
  );
}

export default CreateAdminForm;
