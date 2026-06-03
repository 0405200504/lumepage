'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, Setting, AppointmentStatus } from '@/types/database';
import { 
  Search, Calendar, Clock, MessageCircle, MoreVertical, Check, 
  X, CheckCircle, Ban, AlertCircle, Eye, RefreshCw
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateAppointmentStatusAction } from '@/app/actions/professional';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface AppointmentsListProps {
  initialAppointments: Appointment[];
  professionalId: string;
  settings: Setting | null;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  initialAppointments,
  professionalId,
  settings
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  
  // Estados de Modais
  const [selectedApp, setSelectedApp] = useState<Appointment | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtragem
  const filteredAppointments = initialAppointments.filter(app => {
    const matchesSearch = 
      app.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.client_whatsapp.includes(searchTerm) ||
      (app.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
    const matchesDate = !dateFilter || app.date === dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Atualizar Status
  const handleUpdateStatus = async (id: string, status: AppointmentStatus, reason?: string) => {
    setUpdatingId(id);
    try {
      const res = await updateAppointmentStatusAction(id, professionalId, status, reason);
      if (res.success) {
        success('Atualizado!', `Status do agendamento alterado com sucesso.`);
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

  // Abrir WhatsApp com mensagem
  const handleWhatsApp = (app: Appointment, type: 'confirm' | 'cancel') => {
    if (!settings) return;
    
    let template = type === 'confirm'
      ? settings.whatsapp_confirmation_message 
      : settings.whatsapp_cancel_message;
      
    if (!template) {
      template = type === 'confirm'
        ? 'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.'
        : 'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.';
    }

    const dateObj = new Date(`${app.date}T12:00:00`);
    const dateShort = dateObj.toLocaleDateString('pt-BR');

    let message = template
      .replace('{nome}', app.client_name)
      .replace('{servico}', app.service?.name || '')
      .replace('{data}', dateShort)
      .replace('{horario}', app.start_time)
      .replace('{motivo}', app.cancellation_reason || cancellationReason || 'necessidade de readequação de agenda');

    const cleanPhone = app.client_whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="text-[10px] font-bold border border-amber-100 bg-amber-50 text-amber-700 rounded-full px-2.5 py-0.5">Pendente</span>;
      case 'confirmed':
        return <span className="text-[10px] font-bold border border-emerald-100 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5">Confirmado</span>;
      case 'completed':
        return <span className="text-[10px] font-bold border border-blue-100 bg-blue-50 text-blue-700 rounded-full px-2.5 py-0.5">Finalizado</span>;
      case 'cancelled':
        return <span className="text-[10px] font-bold border border-red-100 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5">Cancelado</span>;
      default:
        return <span className="text-[10px] font-bold border border-gray-150 bg-gray-50 text-gray-500 rounded-full px-2.5 py-0.5">Não compareceu</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-[#e4e9e6] shadow-xs">
        {/* Busca por cliente */}
        <div className="relative w-full lg:max-w-xs rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por cliente, whatsapp ou serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
        </div>

        {/* Filtros de Data e Status */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Data */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">Data:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-forest/20"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-xs font-bold text-red-500 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-forest/20"
            >
              <option value="all">Todos os Status</option>
              <option value="pending">Pendentes</option>
              <option value="confirmed">Confirmados</option>
              <option value="completed">Finalizados</option>
              <option value="cancelled">Cancelados</option>
              <option value="no_show">Não compareceu</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Agendamentos */}
      <div className="bg-white border border-[#e4e9e6] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e4e9e6] text-left">
            <thead className="bg-[#f4f6f5]/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data e Hora</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e9e6] text-sm text-gray-700">
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((app) => {
                  const dateObj = new Date(`${app.date}T12:00:00`);
                  return (
                    <tr key={app.id} className="hover:bg-gray-50/20 transition-colors">
                      {/* Horário */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-gray-800">
                            {dateObj.toLocaleDateString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{app.start_time} - {app.end_time}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-bold text-gray-800">{app.client_name}</p>
                          <p className="text-xs text-gray-450 mt-0.5">{app.client_whatsapp}</p>
                          {app.notes && (
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100/50 rounded-md px-1.5 py-0.5 mt-1 inline-block max-w-[180px] truncate" title={app.notes}>
                              Nota: {app.notes}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Serviço */}
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">{app.service?.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{app.service?.duration_minutes} minutos</p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        {getStatusBadge(app.status)}
                        {app.cancellation_reason && (
                          <p className="text-[10px] text-red-500 font-medium mt-1 leading-tight">
                            Motivo: {app.cancellation_reason}
                          </p>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Confirmar */}
                          {app.status === 'pending' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'confirmed')}
                              disabled={updatingId === app.id}
                              title="Confirmar agendamento"
                              className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}

                          {/* Finalizar */}
                          {app.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'completed')}
                              disabled={updatingId === app.id}
                              title="Marcar como Finalizado"
                              className="p-2 hover:bg-blue-50 text-blue-600 rounded-xl transition-all"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}

                          {/* Não Compareceu */}
                          {app.status === 'confirmed' && (
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'no_show')}
                              disabled={updatingId === app.id}
                              title="Marcar como Não Compareceu"
                              className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition-all"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                          {/* Cancelar */}
                          {['pending', 'confirmed'].includes(app.status) && (
                            <button
                              onClick={() => {
                                setSelectedApp(app);
                                setShowCancelDialog(true);
                              }}
                              disabled={updatingId === app.id}
                              title="Cancelar agendamento"
                              className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}

                          {/* WhatsApp */}
                          <button
                            onClick={() => handleWhatsApp(app, app.status === 'cancelled' ? 'cancel' : 'confirm')}
                            title="Conversar no WhatsApp"
                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-gray-100"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                    Nenhum agendamento atende aos filtros de busca aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cancelamento com Motivo */}
      {showCancelDialog && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#0c1512]/30 backdrop-blur-xs" onClick={() => setShowCancelDialog(false)} />
          <div className="relative bg-white rounded-3xl p-6 shadow-xl max-w-md w-full mx-4 border border-[#e4e9e6] z-10">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Cancelar Agendamento</h3>
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              Você está prestes a cancelar o agendamento de <strong>{selectedApp.client_name}</strong> marcado para o dia{' '}
              {new Date(`${selectedApp.date}T12:00:00`).toLocaleDateString('pt-BR')} às {selectedApp.start_time}.
            </p>

            <div className="mt-4">
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                Motivo do Cancelamento (Opcional)
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={2}
                placeholder="Ex: Imprevisto no consultório, readequação de agenda, etc."
                className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={() => handleUpdateStatus(selectedApp.id, 'cancelled', cancellationReason)}
                disabled={updatingId === selectedApp.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AppointmentsList;
