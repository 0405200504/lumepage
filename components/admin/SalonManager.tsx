'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, UserPlus, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { createSalonAction, assignProfessionalToSalonAction, createSalonManagerAction } from '@/app/actions/admin';
import { brl } from '@/lib/format';

export interface SalonView {
  id: string;
  name: string;
  members: { id: string; name: string; gmvCents: number; appointments: number }[];
  managers: { id: string; name: string; email: string }[];
}

/**
 * Grupos de verdade: criar, vincular profissionais, criar o login do gerente e ver o
 * consolidado. Antes esta tela tinha só um input e um empty state.
 */
export function SalonManager({ salons, unassigned }: {
  salons: SalonView[];
  unassigned: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { success, error } = useToast();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    const res = await createSalonAction(name);
    setBusy(false);
    if (res.success) { success('Grupo criado', name); setName(''); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <div className="space-y-4">
      <section className="card p-4 flex flex-wrap items-end gap-2">
        <label className="flex-1 min-w-[14rem]">
          <span className="block text-caption font-bold uppercase tracking-[0.1em] text-muted mb-1">Novo grupo</span>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="ex.: Studio Bella — unidade Centro"
            className="w-full h-9 px-3 rounded-xl border border-line bg-surface text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700" />
        </label>
        <button type="button" onClick={create} disabled={busy || !name.trim()}
          className="h-9 px-3.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold inline-flex items-center gap-1.5 disabled:opacity-40">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Criar grupo
        </button>
      </section>

      {salons.map(salon => <SalonCard key={salon.id} salon={salon} unassigned={unassigned} />)}

      {salons.length === 0 && (
        <div className="card py-14 text-center">
          <p className="text-label font-bold text-ink">Nenhum grupo criado</p>
          <p className="mt-1 text-caption text-muted max-w-md mx-auto">
            Um grupo junta várias profissionais sob um login de gerente, que enxerga a agenda
            e o faturamento de todas — útil para salões com mais de uma profissional.
          </p>
        </div>
      )}
    </div>
  );
}

function SalonCard({ salon, unassigned }: { salon: SalonView; unassigned: { id: string; name: string }[] }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [linking, setLinking] = useState('');
  const [busy, setBusy] = useState(false);
  const [manager, setManager] = useState({ name: '', email: '', password: '' });
  const [showManager, setShowManager] = useState(false);

  const gmv = salon.members.reduce((s, m) => s + m.gmvCents, 0);
  const appts = salon.members.reduce((s, m) => s + m.appointments, 0);

  const link = async (professionalId: string, salonId: string | null) => {
    setBusy(true);
    const res = await assignProfessionalToSalonAction(professionalId, salonId);
    setBusy(false);
    if (res.success) { success('Pronto', salonId ? 'Profissional vinculada ao grupo.' : 'Profissional desvinculada.'); setLinking(''); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const addManager = async () => {
    setBusy(true);
    const res = await createSalonManagerAction({ ...manager, salonId: salon.id });
    setBusy(false);
    if (res.success) { success('Gerente criado', manager.email); setManager({ name: '', email: '', password: '' }); setShowManager(false); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const field = 'h-9 px-3 rounded-xl border border-line bg-surface text-label text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700';

  return (
    <section className="card p-4 space-y-3">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-label font-bold text-ink flex-1">{salon.name}</h2>
        <span className="text-caption text-muted num">{salon.members.length} profissional(is) · {appts} agend.</span>
        <span className="text-label font-bold text-heading num">{brl(gmv)}</span>
      </header>

      <ul className="divide-y divide-line">
        {salon.members.map(m => (
          <li key={m.id} className="py-2 flex items-center gap-3 text-caption">
            <span className="font-semibold text-ink flex-1 truncate">{m.name}</span>
            <span className="text-muted num">{m.appointments} agend.</span>
            <span className="text-ink num font-semibold w-24 text-right">{brl(m.gmvCents)}</span>
            <button type="button" disabled={busy} onClick={() => link(m.id, null)}
              className="text-caption font-bold text-muted hover:text-danger">remover</button>
          </li>
        ))}
        {salon.members.length === 0 && <li className="py-3 text-caption text-muted">Nenhuma profissional vinculada.</li>}
      </ul>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <select value={linking} onChange={e => setLinking(e.target.value)} aria-label="Vincular profissional" className={`${field} text-caption`}>
          <option value="">Vincular profissional…</option>
          {unassigned.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" disabled={!linking || busy} onClick={() => link(linking, salon.id)}
          className="h-9 px-3 rounded-xl border border-line bg-surface text-caption font-bold text-ink hover:bg-surface-2 inline-flex items-center gap-1.5 disabled:opacity-40">
          <Link2 className="h-3.5 w-3.5" /> Vincular
        </button>

        <button type="button" onClick={() => setShowManager(v => !v)}
          className="h-9 px-3 rounded-xl border border-line bg-surface text-caption font-bold text-ink hover:bg-surface-2 inline-flex items-center gap-1.5">
          <UserPlus className="h-3.5 w-3.5" /> Criar login de gerente
        </button>
      </div>

      {salon.managers.length > 0 && (
        <p className="text-caption text-muted">
          Gerentes: {salon.managers.map(m => `${m.name} (${m.email})`).join(', ')}
        </p>
      )}

      {showManager && (
        <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-line">
          <input placeholder="Nome" value={manager.name} onChange={e => setManager(m => ({ ...m, name: e.target.value }))} className={`${field} text-caption`} />
          <input placeholder="E-mail" type="email" value={manager.email} onChange={e => setManager(m => ({ ...m, email: e.target.value }))} className={`${field} text-caption`} />
          <input placeholder="Senha (mín. 6)" type="text" value={manager.password} onChange={e => setManager(m => ({ ...m, password: e.target.value }))} className={`${field} text-caption`} />
          <button type="button" disabled={busy} onClick={addManager}
            className="h-9 px-3 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold disabled:opacity-40">
            {busy ? 'Criando…' : 'Criar gerente'}
          </button>
        </div>
      )}
    </section>
  );
}
