'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, Setting, AppointmentStatus } from '@/types/database';
import {
  Search, Clock, MessageCircle, Check, X, CheckCircle, Ban, Bell, Trash2
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateAppointmentStatusAction, deleteAppointmentAction } from '@/app/actions/professional';
import { statusMeta } from '@/lib/appointments/status';
import { buildReminderLink, buildWhatsappLink, fillTemplate, formatDateBR } from '@/lib/whatsapp';

interface AppointmentsListProps {
  initialAppointments: Appointment[];
  professionalId: string;
  settings: Setting | null;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  initialAppointments,
  professionalId,
  settings,
}) => {
  const router = useRouter();
  const { success, error, info } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

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

  const iconBtn = 'tap p-2 rounded-xl transition-all-custom disabled:opacity-40';

  // Ações de um agendamento — reutilizadas na tabela (desktop) e nos cards (mobile)
  const AppointmentActions = ({ app }: { app: Appointment }) => (
    <>
      {app.status === 'pending' && (
        <button onClick={() => handleUpdateStatus(app.id, 'confirmed')} disabled={updatingId === app.id} title="Confirmar" className={`${iconBtn} hover:bg-[#2e7d5b]/10 text-[#226045]`}>
          <Check className="h-4 w-4" />
        </button>
      )}
      {app.status === 'confirmed' && (
        <button onClick={() => handleUpdateStatus(app.id, 'completed')} disabled={updatingId === app.id} title="Marcar como finalizado" className={`${iconBtn} hover:bg-wine-700/8 text-wine-700`}>
          <CheckCircle className="h-4 w-4" />
        </button>
      )}
      {(app.status === 'confirmed' || app.status === 'pending') && (
        <button onClick={() => handleUpdateStatus(app.id, 'no_show')} disabled={updatingId === app.id} title="Marcar falta (não compareceu)" className={`${iconBtn} hover:bg-[#b23a48]/10 text-[#b23a48]`}>
          <Ban className="h-4 w-4" />
        </button>
      )}
      {['pending', 'confirmed'].includes(app.status) && (
        <button onClick={() => { setSelectedApp(app); setShowCancelDialog(true); }} disabled={updatingId === app.id} title="Cancelar" className={`${iconBtn} hover:bg-gray-150 text-gray-450`}>
          <X className="h-4 w-4" />
        </button>
      )}
      {app.status !== 'cancelled' && app.status !== 'no_show' && (
        <button onClick={() => handleReminder(app)} title="Enviar lembrete no WhatsApp" className={`${iconBtn} hover:bg-[#2e7d5b]/10 text-[#226045] border border-gray-150`}>
          <Bell className="h-4 w-4" />
        </button>
      )}
      <button onClick={() => window.open(buildWhatsappLink(app.client_whatsapp, ''), '_blank')} title="Abrir conversa no WhatsApp" className={`${iconBtn} hover:bg-cream text-gray-450 border border-gray-150`}>
        <MessageCircle className="h-4 w-4" />
      </button>
      <button onClick={() => handleDeleteAppt(app.id)} disabled={updatingId === app.id} title="Excluir Agendamento" className={`${iconBtn} hover:bg-cream text-gray-450 hover:text-[#b23a48] border border-gray-150`}>
        <Trash2 className="h-4 w-4" />
      </button>
    </>
  );

  return (
    <div className="space-y-6 animate-fade-up">
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
                    <p className="text-xs text-gray-450 mt-0.5 truncate">{app.service?.name} · {app.service?.duration_minutes} min</p>
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
                        <p className="text-xs text-gray-450 mt-0.5">{app.service?.duration_minutes} minutos</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
      )}
    </div>
  );
};
export default AppointmentsList;
