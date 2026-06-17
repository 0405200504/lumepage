'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, Setting, AppointmentStatus, Service, Client } from '@/types/database';
import {
  Search, Clock, MessageCircle, Check, X, CheckCircle, Ban, Bell, Trash2, Plus
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { updateAppointmentStatusAction, deleteAppointmentAction } from '@/app/actions/professional';
import { createManualAppointmentAction } from '@/app/actions/booking';
import { statusMeta } from '@/lib/appointments/status';
import { buildReminderLink, buildWhatsappLink, fillTemplate, formatDateBR } from '@/lib/whatsapp';

interface AppointmentsListProps {
  initialAppointments: Appointment[];
  professionalId: string;
  settings: Setting | null;
  services?: Service[];
  clients?: Client[];
}

// Duração real usada no agendamento (fim − início, em minutos)
function realDurationMin(app: Appointment): number {
  const toMin = (t: string) => { const [h, m] = (t || '').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  return Math.max(0, toMin(app.end_time) - toMin(app.start_time));
}

// Soma minutos a um horário "HH:MM" e retorna "HH:MM"
function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h || 0) * 60 + (m || 0) + (minutes || 0);
  const hh = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  initialAppointments,
  professionalId,
  settings,
  services = [],
  clients = [],
}) => {
  const router = useRouter();
  const { success, error, info } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Novo agendamento manual (com duração personalizada)
  const activeServices = services.filter(s => s.is_active);
  const [showNew, setShowNew] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [nName, setNName] = useState('');
  const [nPhone, setNPhone] = useState('');
  const [nServiceId, setNServiceId] = useState('');
  const [nDate, setNDate] = useState('');
  const [nTime, setNTime] = useState('');
  const [nDuration, setNDuration] = useState<number>(60);
  const [nNotes, setNNotes] = useState('');
  const [nAllowOverlap, setNAllowOverlap] = useState(false);
  const [nClients, setNClients] = useState<Array<{ name: string; phone: string }>>([]);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const getSuggestions = (query: string) =>
    query.length >= 2
      ? clients.filter(c =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.whatsapp.includes(query.replace(/\D/g, ''))
        ).slice(0, 8)
      : [];

  const clientSuggestions = getSuggestions(nName);

  const openNew = () => {
    const first = activeServices[0];
    setNName(''); setNPhone(''); setNServiceId(first?.id || '');
    setNDate(''); setNTime(''); setNDuration(first?.duration_minutes || 60); setNNotes('');
    setNAllowOverlap(false); setNClients([]); setActiveSuggestionIdx(null);
    setShowNew(true);
  };

  const onSelectService = (id: string) => {
    setNServiceId(id);
    const svc = activeServices.find(s => s.id === id);
    if (svc) setNDuration(svc.duration_minutes);
  };

  const createManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNew(true);
    try {
      const clientList = nAllowOverlap
        ? nClients.filter(c => c.name.trim() && c.phone.trim())
        : [{ name: nName, phone: nPhone }];

      if (clientList.length === 0) {
        error('Atenção', 'Preencha nome e WhatsApp de ao menos uma cliente.');
        return;
      }

      let failed = false;
      for (const client of clientList) {
        const res = await createManualAppointmentAction({
          professionalId,
          serviceId: nServiceId,
          clientName: client.name,
          clientWhatsapp: client.phone,
          date: nDate,
          startTime: nTime,
          durationMinutes: nDuration,
          notes: nNotes || undefined,
          allowOverlap: nAllowOverlap,
        });
        if (!res.success) {
          error('Não foi possível agendar', res.error || 'Verifique os dados e tente novamente.');
          failed = true;
          break;
        }
      }

      if (!failed) {
        const count = clientList.length;
        success('Agendamento criado!', count > 1 ? `${count} clientes agendadas no mesmo horário.` : 'O horário foi reservado na sua agenda.');
        setShowNew(false);
        router.refresh();
      }
    } catch {
      error('Erro', 'Falha ao criar o agendamento.');
    } finally {
      setSavingNew(false);
    }
  };

  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredAppointments = initialAppointments.filter(app => {
    const matchesSearch =
      app.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.client_whatsapp.includes(searchTerm) ||
      (app.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesDate = !dateFilter || app.date === dateFilter;
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleUpdateStatus = async (id: string, status: AppointmentStatus, reason?: string) => {
    setUpdatingId(id);
    try {
      const res = await updateAppointmentStatusAction(id, professionalId, status, reason);
      if (res.success) {
        success('Atualizado!', 'Status do agendamento alterado com sucesso.');
        router.refresh();
      } else {
        error('Falha', res.error || 'Ocorreu um erro ao atualizar status.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha ao enviar solicitação.');
    } finally {
      setUpdatingId(null);
      setShowCancelDialog(false);
      setSelectedApp(null);
      setCancellationReason('');
    }
  };

  const handleDeleteAppt = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este agendamento?')) return;
    setUpdatingId(id);
    try {
      const res = await deleteAppointmentAction(id, professionalId);
      if (res.success) {
        success('Excluído!', 'Agendamento removido com sucesso.');
        router.refresh();
      } else {
        error('Falha', res.error || 'Ocorreu um erro ao excluir o agendamento.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha ao enviar solicitação.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Lembrete (24h) — abre WhatsApp com mensagem pronta
  const handleReminder = (app: Appointment) => {
    window.open(buildReminderLink(app, settings?.whatsapp_confirmation_message), '_blank');
    info('Lembrete pronto', 'Abrimos o WhatsApp com a mensagem preenchida.');
  };

  // Mensagem de cancelamento
  const handleCancelWhatsApp = (app: Appointment, reason: string) => {
    const template = settings?.whatsapp_cancel_message ||
      'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.';
    const msg = fillTemplate(template, {
      nome: app.client_name.split(' ')[0],
      servico: app.service?.name || '',
      data: formatDateBR(app.date),
      horario: app.start_time.substring(0, 5),
      motivo: reason || app.cancellation_reason || 'readequação de agenda',
    });
    window.open(buildWhatsappLink(app.client_whatsapp, msg), '_blank');
  };

  const iconBtn = 'tap flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-all-custom disabled:opacity-40';
  const iconLabel = 'text-[9px] font-bold leading-none';

  // Ações de um agendamento — reutilizadas na tabela (desktop) e nos cards (mobile)
  const AppointmentActions = ({ app }: { app: Appointment }) => (
    <>
      {app.status === 'pending' && (
        <button onClick={() => handleUpdateStatus(app.id, 'confirmed')} disabled={updatingId === app.id} title="Confirmar" className={`${iconBtn} hover:bg-[#2e7d5b]/10 text-[#226045]`}>
          <Check className="h-4 w-4" />
          <span className={iconLabel}>Confirmar</span>
        </button>
      )}
      {app.status === 'confirmed' && (
        <button onClick={() => handleUpdateStatus(app.id, 'completed')} disabled={updatingId === app.id} title="Marcar como finalizado" className={`${iconBtn} hover:bg-wine-700/8 text-wine-700`}>
          <CheckCircle className="h-4 w-4" />
          <span className={iconLabel}>Finalizar</span>
        </button>
      )}
      {(app.status === 'confirmed' || app.status === 'pending') && (
        <button onClick={() => handleUpdateStatus(app.id, 'no_show')} disabled={updatingId === app.id} title="Marcar falta (não compareceu)" className={`${iconBtn} hover:bg-[#b23a48]/10 text-[#b23a48]`}>
          <Ban className="h-4 w-4" />
          <span className={iconLabel}>Falta</span>
        </button>
      )}
      {['pending', 'confirmed'].includes(app.status) && (
        <button onClick={() => { setSelectedApp(app); setShowCancelDialog(true); }} disabled={updatingId === app.id} title="Cancelar" className={`${iconBtn} hover:bg-gray-150 text-gray-450`}>
          <X className="h-4 w-4" />
          <span className={iconLabel}>Cancelar</span>
        </button>
      )}
      {app.status !== 'cancelled' && app.status !== 'no_show' && (
        <button onClick={() => handleReminder(app)} title="Enviar lembrete no WhatsApp" className={`${iconBtn} hover:bg-[#2e7d5b]/10 text-[#226045] border border-gray-150`}>
          <Bell className="h-4 w-4" />
          <span className={iconLabel}>Lembrete</span>
        </button>
      )}
      <button onClick={() => window.open(buildWhatsappLink(app.client_whatsapp, ''), '_blank')} title="Abrir conversa no WhatsApp" className={`${iconBtn} hover:bg-cream text-gray-450 border border-gray-150`}>
        <MessageCircle className="h-4 w-4" />
        <span className={iconLabel}>WhatsApp</span>
      </button>
      <button onClick={() => handleDeleteAppt(app.id)} disabled={updatingId === app.id} title="Excluir" className={`${iconBtn} hover:bg-cream text-gray-450 hover:text-[#b23a48] border border-gray-150`}>
        <Trash2 className="h-4 w-4" />
        <span className={iconLabel}>Excluir</span>
      </button>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Ação: novo agendamento manual */}
      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="tap inline-flex items-center gap-1.5 px-4 py-2.5 surface-wine text-white text-xs font-bold rounded-xl shadow-soft hover:opacity-95 transition-all-custom"
        >
          <Plus className="h-4 w-4" /> Novo agendamento
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between card p-4">
        <div className="relative w-full lg:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-450" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, whatsapp ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-450 whitespace-nowrap">Data:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-700/15"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-xs font-bold text-wine-500 hover:underline">Limpar</button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-450">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-700/15"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
              <option value="no_show">Faltas</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards (mobile) */}
      <div className="lg:hidden space-y-3">
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((app) => {
            const m = statusMeta(app.status);
            return (
              <div key={app.id} className="card p-4 active:scale-[0.99] transition-transform">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold text-wine-700 bg-wine-700/8 px-2 py-0.5 rounded-md whitespace-nowrap">
                        {formatDateBR(app.date)}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-gray-450">
                        <Clock className="h-3.5 w-3.5" />
                        {app.start_time.substring(0, 5)}–{app.end_time.substring(0, 5)}
                      </span>
                    </div>
                    <h4 className="font-bold text-ink mt-2 truncate">{app.client_name}</h4>
                    <p className="text-xs text-gray-450 mt-0.5 truncate">{app.service?.name} · {realDurationMin(app)} min</p>
                    <a href={buildWhatsappLink(app.client_whatsapp, '')} target="_blank" rel="noreferrer" className="text-xs text-gray-450 mt-0.5 inline-block">{app.client_whatsapp}</a>
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold rounded-full px-2.5 py-1 ${m.badge}`}>{m.label}</span>
                </div>

                {app.notes && (
                  <p className="mt-2 text-[11px] font-semibold text-wine-600 bg-wine-50 border border-wine-100 rounded-lg px-2 py-1">Nota: {app.notes}</p>
                )}
                {app.cancellation_reason && (
                  <p className="mt-2 text-[11px] text-gray-450">Motivo: {app.cancellation_reason}</p>
                )}

                <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-150 flex-wrap">
                  <AppointmentActions app={app} />
                </div>
              </div>
            );
          })
        ) : (
          <div className="card py-12 text-center text-xs text-gray-450">
            Nenhum agendamento atende aos filtros aplicados.
          </div>
        )}
      </div>

      {/* Tabela de Agendamentos (desktop) */}
      <div className="hidden lg:block card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-150 text-left">
            <thead className="bg-cream/60 text-[10px] font-black text-gray-450 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data e Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-sm text-ink">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((app) => {
                  const m = statusMeta(app.status);
                  return (
                    <tr key={app.id} className="hover:bg-cream/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-bold text-ink">{formatDateBR(app.date)}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-450 mt-0.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{app.start_time.substring(0, 5)} - {app.end_time.substring(0, 5)}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-bold text-ink">{app.client_name}</p>
                        <p className="text-xs text-gray-450 mt-0.5">{app.client_whatsapp}</p>
                        {app.notes && (
                          <span className="text-[10px] font-semibold text-wine-600 bg-wine-50 border border-wine-100 rounded-md px-1.5 py-0.5 mt-1 inline-block max-w-[180px] truncate" title={app.notes}>
                            Nota: {app.notes}
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-semibold text-ink">{app.service?.name}</p>
                        <p className="text-xs text-gray-450 mt-0.5">{realDurationMin(app)} minutos</p>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${m.badge}`}>{m.label}</span>
                        {app.cancellation_reason && (
                          <p className="text-[10px] text-gray-450 font-medium mt-1 leading-tight max-w-[160px]">Motivo: {app.cancellation_reason}</p>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <AppointmentActions app={app} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-450">
                    Nenhum agendamento atende aos filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cancelamento */}
      {showCancelDialog && selectedApp && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a0e12]/40 backdrop-blur-sm" onClick={() => setShowCancelDialog(false)} />
          <div className="relative card p-6 max-w-md w-full mx-4 z-10 animate-fade-up">
            <h3 className="text-lg font-black text-ink tracking-tight">Cancelar Agendamento</h3>
            <p className="mt-2 text-xs text-gray-450 leading-relaxed">
              Você está prestes a cancelar o agendamento de <strong className="text-ink">{selectedApp.client_name}</strong> em{' '}
              {formatDateBR(selectedApp.date)} às {selectedApp.start_time.substring(0, 5)}.
            </p>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Motivo (opcional)</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={2}
                placeholder="Ex: imprevisto, readequação de agenda..."
                className="block w-full px-3 py-2 bg-cream/60 border border-gray-150 rounded-xl text-xs placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setShowCancelDialog(false)} className="px-4 py-2 border border-gray-150 rounded-xl text-xs font-bold text-gray-450 hover:bg-cream">Voltar</button>
              <button
                onClick={() => { handleCancelWhatsApp(selectedApp, cancellationReason); handleUpdateStatus(selectedApp.id, 'cancelled', cancellationReason); }}
                disabled={updatingId === selectedApp.id}
                className="px-4 py-2 surface-wine text-white text-xs font-bold rounded-xl hover:opacity-95"
              >
                Cancelar e avisar no WhatsApp
              </button>
            </div>
          </div>
        </div>
        </Portal>
      )}
      {/* Modal: Novo agendamento manual (com duração personalizada) */}
      {showNew && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={() => setShowNew(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-ink tracking-tight">Novo agendamento</h3>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-xl hover:bg-cream text-gray-450"><X className="h-5 w-5" /></button>
            </div>

            {activeServices.length === 0 ? (
              <p className="text-sm text-gray-450 py-6 text-center">
                Cadastre ao menos um serviço para criar agendamentos manuais.
              </p>
            ) : (
              <form onSubmit={createManual} className="space-y-3">
                {!nAllowOverlap ? (
                  <>
                    <div className="relative">
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Cliente *</label>
                      <input
                        required
                        autoComplete="off"
                        value={nName}
                        onChange={(e) => { setNName(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Nome da cliente"
                        className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
                      />
                      {showSuggestions && clientSuggestions.length > 0 && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-paper border border-gray-150 rounded-xl shadow-glow max-h-48 overflow-y-auto">
                          {clientSuggestions.map(c => (
                            <li key={c.id} onMouseDown={() => { setNName(c.name); setNPhone(c.whatsapp); setShowSuggestions(false); }}
                              className="flex items-center justify-between px-3 py-2.5 hover:bg-cream cursor-pointer">
                              <span className="text-sm font-semibold text-ink">{c.name}</span>
                              <span className="text-xs text-gray-450 ml-2">{c.whatsapp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">WhatsApp *</label>
                      <input required inputMode="tel" value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="11999999999"
                        className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider">Clientes *</label>
                      <span className="text-[11px] font-black text-wine-700 bg-wine-700/8 px-2 py-0.5 rounded-full">
                        {nClients.filter(c => c.name.trim()).length} cliente{nClients.filter(c => c.name.trim()).length !== 1 ? 's' : ''} neste horário
                      </span>
                    </div>
                    <div className="space-y-2">
                      {nClients.map((client, idx) => {
                        const rowSuggestions = getSuggestions(client.name);
                        return (
                          <div key={idx} className="flex gap-1.5 items-start">
                            <span className="text-[10px] font-bold text-gray-450 mt-3.5 w-5 shrink-0 text-right">{idx + 1}.</span>
                            <div className="flex-1 relative">
                              <input
                                required={idx < 2}
                                autoComplete="off"
                                value={client.name}
                                placeholder="Nome"
                                onChange={(e) => {
                                  const updated = nClients.map((c, i) => i === idx ? { ...c, name: e.target.value } : c);
                                  setNClients(updated);
                                  setActiveSuggestionIdx(idx);
                                }}
                                onFocus={() => setActiveSuggestionIdx(idx)}
                                onBlur={() => setTimeout(() => setActiveSuggestionIdx(null), 150)}
                                className="block w-full px-2.5 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
                              />
                              {activeSuggestionIdx === idx && rowSuggestions.length > 0 && (
                                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-paper border border-gray-150 rounded-xl shadow-glow max-h-40 overflow-y-auto">
                                  {rowSuggestions.map(c => (
                                    <li key={c.id}
                                      onMouseDown={() => {
                                        const updated = nClients.map((cl, i) => i === idx ? { name: c.name, phone: c.whatsapp } : cl);
                                        setNClients(updated); setActiveSuggestionIdx(null);
                                      }}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-cream cursor-pointer">
                                      <span className="text-sm font-semibold text-ink">{c.name}</span>
                                      <span className="text-xs text-gray-450 ml-2">{c.whatsapp}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <div className="flex-1">
                              <input
                                required={idx < 2}
                                inputMode="tel"
                                value={client.phone}
                                placeholder="WhatsApp"
                                onChange={(e) => {
                                  const updated = nClients.map((c, i) => i === idx ? { ...c, phone: e.target.value } : c);
                                  setNClients(updated);
                                }}
                                className="block w-full px-2.5 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700"
                              />
                            </div>
                            {nClients.length > 2 && (
                              <button type="button"
                                onClick={() => setNClients(nClients.filter((_, i) => i !== idx))}
                                className="mt-2 p-1.5 text-gray-450 hover:text-[#b23a48] rounded-lg hover:bg-cream transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button type="button"
                      onClick={() => setNClients([...nClients, { name: '', phone: '' }])}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-wine-700 hover:text-wine-800 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Adicionar outra cliente
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Serviço *</label>
                  <select required value={nServiceId} onChange={(e) => onSelectService(e.target.value)}
                    className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700">
                    {activeServices.map(s => (
                      <option key={s.id} value={s.id}>{s.name} · {s.duration_minutes} min</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Data *</label>
                    <input required type="date" value={nDate} onChange={(e) => setNDate(e.target.value)}
                      className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Início *</label>
                    <input required type="time" value={nTime} onChange={(e) => setNTime(e.target.value)}
                      className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Duração deste atendimento (min) *</label>
                  <input required type="number" min={5} step={5} value={nDuration}
                    onChange={(e) => setNDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
                    className="block w-full px-3 py-3 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Vale só para este agendamento — não altera a duração padrão do serviço.
                    {nTime && nDuration > 0 && (
                      <> Ocupa <strong className="text-ink">{nTime}</strong> → <strong className="text-ink">{addMinutes(nTime, nDuration)}</strong>.</>
                    )}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Observações do atendimento</label>
                  <textarea value={nNotes} onChange={(e) => setNNotes(e.target.value)} rows={2} placeholder="Opcional"
                    className="block w-full px-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700 resize-y" />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-gray-150 bg-cream/40 px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={nAllowOverlap}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setNAllowOverlap(checked);
                      if (checked) {
                        setNClients([{ name: nName, phone: nPhone }, { name: '', phone: '' }]);
                      } else {
                        setNName(nClients[0]?.name || '');
                        setNPhone(nClients[0]?.phone || '');
                        setNClients([]);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded accent-wine-700 shrink-0"
                  />
                  <span className="text-xs text-ink leading-snug">
                    <span className="font-bold">Permitir horário simultâneo</span>
                    <span className="text-gray-450"> — agenda mais de uma cliente no mesmo horário (ex.: procedimentos em grupo)</span>
                  </span>
                </label>
                <div className="flex justify-end gap-2.5 pt-1">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2.5 border border-gray-150 rounded-xl text-xs font-bold text-gray-450 hover:bg-cream">Cancelar</button>
                  <button type="submit" disabled={savingNew} className="tap px-4 py-2.5 surface-wine text-white text-xs font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                    {savingNew ? 'Salvando…' : 'Criar agendamento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};
export default AppointmentsList;
