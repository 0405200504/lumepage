'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WaitlistEntry, WaitlistStatus, Service } from '@/types/database';
import { Clock, MessageCircle, X, Plus, Trash2, CalendarPlus, UserPlus } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { TechTable } from '../ui/TechTable';
import { StatusLabel } from '../ui/StatusDot';
import { MonoValue } from '../ui/Mono';
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

type WaitTone = 'warning' | 'accent' | 'success' | 'danger' | 'neutral';
const STATUS_META: Record<WaitlistStatus, { label: string; tone: WaitTone }> = {
  waiting:     { label: 'Aguardando',   tone: 'warning' },
  contacted:   { label: 'Contatada',    tone: 'accent' },
  scheduled:   { label: 'Encaixada',    tone: 'success' },
  cancelled:   { label: 'Cancelada',    tone: 'danger' },
  no_response: { label: 'Sem resposta', tone: 'neutral' },
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
    <div className="space-y-5">
      <PageHeader
        trail={[
          'Fila de espera',
          `${initialEntries.length} na lista`,
          `${initialEntries.filter(e => e.status === 'waiting').length} aguardando`,
        ]}
        title="Lista de espera"
        actions={
          <Button size="md" onClick={() => setShowAdd(true)} leadingIcon={<UserPlus className="h-[18px] w-[18px]" />}>
            Adicionar à lista
          </Button>
        }
      />

      {initialEntries.length === 0 ? (
        <Card pad="p-4">
          <EmptyState
            framed={false}
            title="Nenhuma solicitação ainda"
            description="Quando uma cliente entrar na lista de espera pela sua página de agendamento, ela aparece aqui."
          />
        </Card>
      ) : (
        /* ARQUÉTIPO 2 · a fila virou TABELA, e a ordem virou dado.
           Como cartões empilhados, a informação que mais importa numa lista de
           espera — quem chegou primeiro — não aparecia em lugar nenhum: era
           preciso inferir pela posição. Agora há uma coluna de posição em mono,
           e "Encaixar" é a ação da linha, não um botão dentro de um cartão. */
        <Card pad="p-0" className="overflow-hidden">
          <TechTable
            rows={initialEntries}
            rowKey={(e) => e.id}
            columns={[
              {
                key: 'pos',
                header: '#',
                width: '1%',
                className: 'whitespace-nowrap',
                cell: (e) => (
                  <MonoValue className="text-body-sm text-n-500">
                    {String(initialEntries.indexOf(e) + 1).padStart(2, '0')}
                  </MonoValue>
                ),
              },
              {
                key: 'name',
                header: 'Cliente',
                width: '100%',
                sortValue: (e) => e.client_name,
                cell: (e) => (
                  <div className="min-w-0">
                    <p className="text-ink truncate">{e.client_name}</p>
                    <p className="mono-micro text-n-500 truncate">
                      {e.client_whatsapp}
                      {e.service_name ? ` · ${e.service_name}` : ''}
                    </p>
                    {e.notes && <p className="text-caption text-n-500 truncate italic">“{e.notes}”</p>}
                  </div>
                ),
              },
              {
                key: 'when',
                header: 'Quando quer',
                className: 'whitespace-nowrap',
                hideOnMobile: true,
                cell: (e) =>
                  e.desired_date || e.desired_period || e.time_preference ? (
                    <span className="inline-flex flex-col">
                      {e.desired_date && <MonoValue className="text-body-sm">{formatDateBR(e.desired_date)}</MonoValue>}
                      <span className="mono-micro text-n-500">
                        {e.desired_period || e.time_preference || ''}
                      </span>
                    </span>
                  ) : (
                    <span className="mono-micro text-n-400">QUALQUER</span>
                  ),
              },
              {
                key: 'since',
                header: 'Entrou em',
                num: true,
                className: 'whitespace-nowrap',
                hideOnMobile: true,
                sortValue: (e) => e.created_at,
                cell: (e) => <MonoValue className="text-body-sm text-n-500">{formatDateBR(e.created_at.split('T')[0])}</MonoValue>,
              },
              {
                key: 'status',
                header: 'Status',
                className: 'whitespace-nowrap',
                cell: (e) => {
                  const meta = STATUS_META[e.status] ?? STATUS_META.waiting;
                  return (
                    <select
                      value={e.status}
                      disabled={busyId === e.id}
                      onClick={(ev) => ev.stopPropagation()}
                      onChange={(ev) => changeStatus(e, ev.target.value as WaitlistStatus)}
                      aria-label={`Status de ${e.client_name}`}
                      /* O status é editável NA LINHA: mudar "aguardando" para
                         "contatada" era a operação mais frequente da tela e
                         exigia rolar até o rodapé do cartão. */
                      className="mono-micro bg-transparent border border-line rounded-badge px-1.5 h-6 cursor-pointer hover:border-line-strong transition-ui"
                    >
                      {STATUS_ORDER.map((st) => (
                        <option key={st} value={st}>{STATUS_META[st].label}</option>
                      ))}
                    </select>
                  );
                },
              },
            ]}
            mobileRow={(e) => {
              const meta = STATUS_META[e.status] ?? STATUS_META.waiting;
              return (
                <>
                  <div className="flex items-baseline gap-2">
                    <MonoValue className="text-micro text-n-400 shrink-0">
                      {String(initialEntries.indexOf(e) + 1).padStart(2, '0')}
                    </MonoValue>
                    <span className="text-body-sm text-heading truncate flex-1">{e.client_name}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 pl-6">
                    <StatusLabel tone={meta.tone}>{meta.label}</StatusLabel>
                    {e.desired_date && (
                      <>
                        <span className="text-n-300" aria-hidden>·</span>
                        <MonoValue className="text-micro text-n-500">{formatDateBR(e.desired_date)}</MonoValue>
                      </>
                    )}
                  </div>
                </>
              );
            }}
            actions={(e) => (
              <>
                {activeServices.length > 0 && e.status !== 'scheduled' && (
                  <Button
                    size="sm" variant="secondary"
                    onClick={(ev) => { ev.stopPropagation(); openFit(e); }}
                    leadingIcon={<CalendarPlus className="h-3.5 w-3.5" />}
                  >
                    Encaixar
                  </Button>
                )}
                <Button
                  size="sm" variant="ghost" iconOnly aria-label={`Falar com ${e.client_name}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    window.open(buildWhatsappLink(e.client_whatsapp, `Oi, ${e.client_name.split(' ')[0]}! Sobre a lista de espera aqui da agenda 💛`), '_blank');
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  size="sm" variant="ghost" iconOnly aria-label={`Remover ${e.client_name}`}
                  onClick={(ev) => { ev.stopPropagation(); removeEntry(e); }}
                  disabled={busyId === e.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          />
        </Card>
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
                className="field-input" />
              <input required inputMode="tel" value={aPhone} onChange={(e) => setAPhone(e.target.value)} placeholder="WhatsApp *"
                className="field-input" />
              <select value={aServiceId} onChange={(e) => setAServiceId(e.target.value)}
                className="field-input">
                <option value="">Serviço desejado (opcional)</option>
                {activeServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={aPeriod} onChange={(e) => setAPeriod(e.target.value)} placeholder="Dia/período desejado (ex.: sábado, manhã)"
                className="field-input" />
              <input value={aPref} onChange={(e) => setAPref(e.target.value)} placeholder="Preferência de horário (ex.: depois das 18h)"
                className="field-input" />
              <textarea value={aNotes} onChange={(e) => setANotes(e.target.value)} rows={2} placeholder="Observação (opcional)"
                className="field-input resize-y" />
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
                <label className="mono-micro text-n-500 block mb-1.5">Serviço *</label>
                <select required value={fServiceId} onChange={(e) => onFitService(e.target.value)}
                  className="field-input">
                  {activeServices.map(s => <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Data *</label>
                  <input required type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                    className="field-input" />
                </div>
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Início *</label>
                  <input required type="time" value={fTime} onChange={(e) => setFTime(e.target.value)}
                    className="field-input" />
                </div>
              </div>
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">Duração (min) *</label>
                <input required type="number" min={5} step={5} value={fDuration}
                  onChange={(e) => setFDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
                  className="field-input" />
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
