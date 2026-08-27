'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WaitlistEntry, WaitlistStatus, Service } from '@/types/database';
import { Clock, MessageCircle, X, Plus, Trash2, CalendarPlus, UserPlus } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { QuickAddFab } from '../ui/QuickAddFab';
import { buildWhatsappLink, formatDateBR } from '@/lib/whatsapp';
import {
  updateWaitlistStatusAction, deleteWaitlistEntryAction,
  addWaitlistManualAction, scheduleFromWaitlistAction,
} from '@/app/actions/waitlist';
import { EmptyState } from '@/components/ui/EmptyState';

interface WaitlistPanelProps {
  professionalId: string;
  initialEntries: WaitlistEntry[];
  services: Service[];
}

const STATUS_META: Record<WaitlistStatus, { label: string; badge: string }> = {
  waiting:     { label: 'Aguardando',  badge: 'bg-warning-bg text-warning' },
  contacted:   { label: 'Contatada',   badge: 'bg-wine-700/10 text-wine-700' },
  scheduled:   { label: 'Encaixada',   badge: 'bg-success-bg text-success' },
  cancelled:   { label: 'Cancelada',   badge: 'bg-danger-bg text-danger' },
  no_response: { label: 'Sem resposta', badge: 'bg-n-200 text-n-600' },
};
const STATUS_ORDER: WaitlistStatus[] = ['waiting', 'contacted', 'scheduled', 'cancelled', 'no_response'];

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + (minutes || 0);
  const hh = Math.floor((((total % 1440) + 1440) % 1440) / 60);
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const WaitlistPanel: React.FC<WaitlistPanelProps> = ({ professionalId, initialEntries, services }) => {
  const router = useRouter();
  const { success, error } = useToast();
  const activeServices = services.filter(s => s.is_active);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Adicionar manualmente
  const [showAdd, setShowAdd] = useState(false);
  const [savingAdd, setSavingAdd] = useState(false);
  const [aName, setAName] = useState('');
  const [aPhone, setAPhone] = useState('');
  const [aServiceId, setAServiceId] = useState('');
  const [aPeriod, setAPeriod] = useState('');
  const [aPref, setAPref] = useState('');
  const [aNotes, setANotes] = useState('');

  // Encaixar (criar agendamento a partir da solicitação)
  const [fit, setFit] = useState<WaitlistEntry | null>(null);
  const [savingFit, setSavingFit] = useState(false);
  const [fServiceId, setFServiceId] = useState('');
  const [fDate, setFDate] = useState('');
  const [fTime, setFTime] = useState('');
  const [fDuration, setFDuration] = useState(60);

  const changeStatus = async (entry: WaitlistEntry, status: WaitlistStatus) => {
    setBusyId(entry.id);
    try {
      const res = await updateWaitlistStatusAction(professionalId, entry.id, status);
      if (res.success) { success('Status atualizado', 'A solicitação foi atualizada.'); router.refresh(); }
      else error('Erro', res.error || 'Não foi possível atualizar.');
    } finally { setBusyId(null); }
  };

  const removeEntry = async (entry: WaitlistEntry) => {
    if (!confirm(`Remover ${entry.client_name} da lista de espera?`)) return;
    setBusyId(entry.id);
    try {
      const res = await deleteWaitlistEntryAction(professionalId, entry.id);
      if (res.success) { success('Removida da lista', 'A solicitação foi removida.'); router.refresh(); }
      else error('Erro', res.error || 'Não foi possível remover.');
    } finally { setBusyId(null); }
  };

  const submitAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAdd(true);
    try {
      const res = await addWaitlistManualAction(professionalId, {
        clientName: aName, clientWhatsapp: aPhone, serviceId: aServiceId || undefined,
        desiredPeriod: aPeriod || undefined, timePreference: aPref || undefined, notes: aNotes || undefined,
      });
      if (res.success) {
        success('Adicionada à lista', 'A pessoa entrou na lista de espera.');
        setShowAdd(false);
        setAName(''); setAPhone(''); setAServiceId(''); setAPeriod(''); setAPref(''); setANotes('');
        router.refresh();
      } else error('Erro', res.error || 'Não foi possível adicionar.');
    } finally { setSavingAdd(false); }
  };

  const openFit = (entry: WaitlistEntry) => {
    const svc = activeServices.find(s => s.id === entry.service_id) || activeServices[0];
    setFit(entry);
    setFServiceId(svc?.id || '');
    setFDate(entry.desired_date || '');
    setFTime('');
    setFDuration(svc?.duration_minutes || 60);
  };

  const submitFit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fit) return;
    setSavingFit(true);
    try {
      const res = await scheduleFromWaitlistAction(professionalId, fit.id, {
        serviceId: fServiceId, clientName: fit.client_name, clientWhatsapp: fit.client_whatsapp,
        date: fDate, startTime: fTime, durationMinutes: fDuration,
        notes: fit.notes || undefined,
      });
      if (res.success) {
        success('Encaixada!', 'Agendamento criado e solicitação marcada como Encaixada.');
        setFit(null);
        router.refresh();
      } else error('Não foi possível encaixar', (res as { error?: string }).error || 'Verifique os dados.');
    } finally { setSavingFit(false); }
  };

  const onFitService = (id: string) => {
    setFServiceId(id);
    const svc = activeServices.find(s => s.id === id);
    if (svc) setFDuration(svc.duration_minutes);
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption text-n-600">
          {initialEntries.length} {initialEntries.length === 1 ? 'solicitação' : 'solicitações'} na lista
        </p>
        <button onClick={() => setShowAdd(true)} className="tap inline-flex items-center gap-1.5 px-4 py-2.5 surface-wine text-white text-caption font-bold rounded-xl shadow-soft hover:opacity-95 transition-ui">
          <UserPlus className="h-4 w-4" /> Adicionar à lista
        </button>
      </div>

      <QuickAddFab actions={[{ label: 'Adicionar à lista', icon: UserPlus, onClick: () => setShowAdd(true) }]} />

      {initialEntries.length === 0 ? (
        <EmptyState
          title="Nenhuma solicitação ainda"
          description="Quando uma cliente entrar na lista de espera pela sua página de agendamento, ela aparece aqui."
        />
      ) : (
        <div className="space-y-3">
          {initialEntries.map((entry) => {
            const meta = STATUS_META[entry.status] ?? STATUS_META.waiting;
            return (
              <div key={entry.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-label text-ink truncate">{entry.client_name}</h3>
                      <span className={`text-caption font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>{meta.label}</span>
                    </div>
                    <p className="text-caption text-n-600 mt-0.5">{entry.client_whatsapp}</p>
                    {entry.service_name && <p className="text-caption text-ink mt-1">Serviço: <span className="text-n-600">{entry.service_name}</span></p>}
                    {(entry.desired_date || entry.desired_period) && (
                      <p className="text-caption text-n-600 mt-0.5">
                        Quando: {entry.desired_date ? formatDateBR(entry.desired_date) : ''}{entry.desired_date && entry.desired_period ? ' · ' : ''}{entry.desired_period || ''}
                      </p>
                    )}
                    {entry.time_preference && <p className="text-caption text-n-600 mt-0.5">Preferência: {entry.time_preference}</p>}
                    {entry.notes && <p className="text-caption text-n-600 mt-1 italic">“{entry.notes}”</p>}
                    <p className="text-caption text-n-400 mt-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Entrou em {formatDateBR(entry.created_at.split('T')[0])}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <select
                    value={entry.status}
                    disabled={busyId === entry.id}
                    onChange={(e) => changeStatus(entry, e.target.value as WaitlistStatus)}
                    className="text-caption font-semibold text-ink bg-n-50 border border-n-200 rounded-xl px-3 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
                  >
                    {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
                  </select>

                  <button
                    onClick={() => window.open(buildWhatsappLink(entry.client_whatsapp, `Oi, ${entry.client_name.split(' ')[0]}! Sobre a lista de espera aqui da agenda 💛`), '_blank')}
                    className="tap inline-flex items-center gap-1.5 px-3 py-2 bg-success-bg text-success border border-success-border text-caption font-bold rounded-xl hover:bg-success-bg transition-ui"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </button>

                  {activeServices.length > 0 && entry.status !== 'scheduled' && (
                    <button
                      onClick={() => openFit(entry)}
                      className="tap inline-flex items-center gap-1.5 px-3 py-2 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95 transition-ui"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" /> Encaixar
                    </button>
                  )}

                  <button
                    onClick={() => removeEntry(entry)}
                    disabled={busyId === entry.id}
                    className="tap ml-auto inline-flex items-center gap-1.5 px-3 py-2 border border-danger-border text-danger text-caption font-bold rounded-xl hover:bg-danger-bg transition-ui"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: adicionar manualmente */}
      {showAdd && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowAdd(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-semibold text-ink tracking-tight">Adicionar à lista de espera</h3>
              <button onClick={() => setShowAdd(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submitAdd} className="space-y-3">
              <input required value={aName} onChange={(e) => setAName(e.target.value)} placeholder="Nome *"
                className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              <input required inputMode="tel" value={aPhone} onChange={(e) => setAPhone(e.target.value)} placeholder="WhatsApp *"
                className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              <select value={aServiceId} onChange={(e) => setAServiceId(e.target.value)}
                className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
                <option value="">Serviço desejado (opcional)</option>
                {activeServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={aPeriod} onChange={(e) => setAPeriod(e.target.value)} placeholder="Dia/período desejado (ex.: sábado, manhã)"
                className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              <input value={aPref} onChange={(e) => setAPref(e.target.value)} placeholder="Preferência de horário (ex.: depois das 18h)"
                className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
              <textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} rows={2} placeholder="Observação (opcional)"
                className="block w-full px-3 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 resize-y" />
              <div className="flex justify-end gap-2.5 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2.5 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Cancelar</button>
                <button type="submit" disabled={savingAdd} className="tap px-4 py-2.5 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                  {savingAdd ? 'Salvando…' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}

      {/* Modal: encaixar (criar agendamento) */}
      {fit && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setFit(null)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-h3 font-semibold text-ink tracking-tight">Encaixar {fit.client_name.split(' ')[0]}</h3>
              <button onClick={() => setFit(null)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-caption text-n-600 mb-4">Ao confirmar, criamos o agendamento e a solicitação vira “Encaixada”.</p>
            <form onSubmit={submitFit} className="space-y-3">
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Serviço *</label>
                <select required value={fServiceId} onChange={(e) => onFitService(e.target.value)}
                  className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600">
                  {activeServices.map(s => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Data *</label>
                  <input required type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                    className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                </div>
                <div>
                  <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Início *</label>
                  <input required type="time" value={fTime} onChange={(e) => setFTime(e.target.value)}
                    className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                </div>
              </div>
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Duração (min) *</label>
                <input required type="number" min={5} step={5} value={fDuration}
                  onChange={(e) => setFDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
                  className="block w-full px-3 py-3 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600" />
                {fTime && fDuration > 0 && (
                  <span className="text-caption text-n-400 mt-1 block">Ocupa <strong className="text-ink">{fTime}</strong> → <strong className="text-ink">{addMinutes(fTime, fDuration)}</strong>.</span>
                )}
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button type="button" onClick={() => setFit(null)} className="px-4 py-2.5 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Cancelar</button>
                <button type="submit" disabled={savingFit} className="tap px-4 py-2.5 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                  {savingFit ? 'Encaixando…' : 'Criar agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};
export default WaitlistPanel;
