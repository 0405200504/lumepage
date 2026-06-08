'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Plus, UserCog, Users, X } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Salon } from '@/types/database';
import { createSalonAction, assignProfessionalToSalonAction, createSalonManagerAction } from '@/app/actions/admin';

interface ProItem { id: string; name: string; brand: string; salon_id: string | null; }
interface Props { salons: Salon[]; professionals: ProItem[]; }

export const AdminSalons: React.FC<Props> = ({ salons, professionals }) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [newSalon, setNewSalon] = useState('');
  const [busy, setBusy] = useState(false);
  const [managerFor, setManagerFor] = useState<string | null>(null);
  const [mName, setMName] = useState(''); const [mEmail, setMEmail] = useState(''); const [mPass, setMPass] = useState('');

  const createSalon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSalon.trim()) return;
    setBusy(true);
    const res = await createSalonAction(newSalon.trim());
    setBusy(false);
    if (res.success) { success('Grupo criado!', newSalon); setNewSalon(''); router.refresh(); }
    else error('Falha', res.error || 'Erro.');
  };

  const assign = async (proId: string, salonId: string | null) => {
    const res = await assignProfessionalToSalonAction(proId, salonId);
    if (res.success) router.refresh(); else error('Falha', res.error || 'Erro.');
  };

  const createManager = async (e: React.FormEvent, salonId: string) => {
    e.preventDefault();
    setBusy(true);
    const res = await createSalonManagerAction({ name: mName, email: mEmail, password: mPass, salonId });
    setBusy(false);
    if (res.success) { success('Gerente criado!', `${mName} já pode acessar o salão.`); setManagerFor(null); setMName(''); setMEmail(''); setMPass(''); router.refresh(); }
    else error('Falha', res.error || 'Erro.');
  };

  const unassigned = professionals.filter(p => !p.salon_id);

  return (
    <div className="space-y-6 select-none animate-fade-up">
      {/* Criar grupo */}
      <form onSubmit={createSalon} className="card p-4 flex gap-2 items-center">
        <Store className="h-5 w-5 text-wine-600 shrink-0 ml-1" />
        <input value={newSalon} onChange={(e) => setNewSalon(e.target.value)} placeholder="Nome do novo grupo (ex: Studio Bella)"
          className="flex-1 min-w-0 px-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
        <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2.5 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:opacity-95 disabled:opacity-60">
          <Plus className="h-4 w-4" /> Criar grupo
        </button>
      </form>

      {salons.length === 0 ? (
        <div className="card p-10 text-center">
          <Store className="h-8 w-8 text-wine-200 mx-auto" />
          <p className="text-sm text-gray-450 mt-3">Nenhum grupo criado ainda.</p>
        </div>
      ) : salons.map((salon) => {
        const pros = professionals.filter(p => p.salon_id === salon.id);
        return (
          <div key={salon.id} className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-ink tracking-tight flex items-center gap-2"><Store className="h-4 w-4 text-wine-600" /> {salon.name}</h3>
              <span className="text-[10px] font-bold text-gray-450">{pros.length} profissional(is)</span>
            </div>

            {/* Profissionais do salão */}
            <div className="space-y-2">
              {pros.length === 0 ? (
                <p className="text-xs text-gray-450">Nenhuma profissional vinculada.</p>
              ) : pros.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-gray-150 px-3 py-2">
                  <div><p className="text-sm font-bold text-ink">{p.brand}</p><p className="text-[11px] text-gray-450">{p.name}</p></div>
                  <button onClick={() => assign(p.id, null)} className="text-[11px] font-bold text-[#b23a48] hover:underline">Remover</button>
                </div>
              ))}
            </div>

            {/* Adicionar profissional existente */}
            {unassigned.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-450 shrink-0" />
                <select onChange={(e) => { if (e.target.value) assign(e.target.value, salon.id); e.currentTarget.value = ''; }} defaultValue=""
                  className="flex-1 text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-wine-700/15">
                  <option value="">+ Vincular profissional sem grupo...</option>
                  {unassigned.map(p => <option key={p.id} value={p.id}>{p.brand} ({p.name})</option>)}
                </select>
              </div>
            )}

            {/* Gerente do salão */}
            <div className="border-t border-gray-150 pt-3">
              {managerFor === salon.id ? (
                <form onSubmit={(e) => createManager(e, salon.id)} className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-450 uppercase tracking-wider">Criar gerente (1 login p/ todos os painéis)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input required value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Nome" className="px-3 py-2 bg-cream/60 border border-gray-150 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
                    <input required type="email" value={mEmail} onChange={(e) => setMEmail(e.target.value)} placeholder="E-mail" className="px-3 py-2 bg-cream/60 border border-gray-150 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
                    <input required value={mPass} onChange={(e) => setMPass(e.target.value)} placeholder="Senha" className="px-3 py-2 bg-cream/60 border border-gray-150 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-wine-700/15" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={busy} className="px-4 py-2 surface-wine text-white text-xs font-bold rounded-xl hover:opacity-95 disabled:opacity-60">{busy ? 'Criando...' : 'Criar gerente'}</button>
                    <button type="button" onClick={() => setManagerFor(null)} className="px-3 py-2 text-xs font-bold text-gray-450 hover:bg-cream rounded-xl inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Cancelar</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setManagerFor(salon.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-wine-700 hover:underline">
                  <UserCog className="h-4 w-4" /> Criar acesso de gerente
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
export default AdminSalons;
