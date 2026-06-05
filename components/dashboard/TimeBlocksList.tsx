'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimeBlock, BlockType } from '@/types/database';
import { Plus, Trash2, Calendar, Clock, Lock, X, Save } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { createTimeBlockAction, deleteTimeBlockAction } from '@/app/actions/professional';

interface TimeBlocksListProps {
  initialBlocks: TimeBlock[];
  professionalId: string;
}

export const TimeBlocksList: React.FC<TimeBlocksListProps> = ({
  initialBlocks,
  professionalId
}) => {
  const router = useRouter();
  const { success, error } = useToast();

  // Modais
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<string | null>(null);

  // Formulário
  const [date, setDate] = useState('');
  const [blockType, setBlockType] = useState<BlockType>('full_day');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [reason, setReason] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenCreate = () => {
    // Definir data padrão como amanhã
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split('T')[0]);
    
    setBlockType('full_day');
    setStartTime('09:00');
    setEndTime('18:00');
    setReason('');
    setIsOpenModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      error('Preencha a data', 'A data do bloqueio é obrigatória.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTimeBlockAction(professionalId, {
        date,
        block_type: blockType,
        start_time: blockType === 'custom_time' ? startTime : undefined,
        end_time: blockType === 'custom_time' ? endTime : undefined,
        reason: reason || undefined
      });

      if (res.success) {
        success('Bloqueio Criado', 'Horário bloqueado com sucesso na sua agenda.');
        setIsOpenModal(false);
        router.refresh();
      } else {
        error('Falha ao bloquear', res.error || 'Erro inesperado.');
      }
    } catch (e) {
      error('Erro', 'Falha ao processar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!blockToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await deleteTimeBlockAction(professionalId, blockToDelete);
      if (res.success) {
        success('Desbloqueado!', 'O bloqueio foi removido com sucesso.');
        router.refresh();
      } else {
        error('Erro ao remover', res.error || 'Erro na exclusão.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha na rede.');
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setBlockToDelete(null);
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Topo com botão */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-[#efe9e6] shadow-xs">
        <div className="flex items-center gap-2 text-forest">
          <Lock className="h-5 w-5" />
          <span className="text-xs font-bold">{initialBlocks.length} bloqueios ativos</span>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1 px-4 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Bloquear Horário</span>
        </button>
      </div>

      {/* Lista de Bloqueios */}
      <div className="bg-white border border-[#efe9e6] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#efe9e6] text-left">
            <thead className="bg-[#f4f1ec]/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data do Bloqueio</th>
                <th className="px-6 py-4">Duração / Período</th>
                <th className="px-6 py-4">Motivo / Descrição</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efe9e6] text-sm text-gray-700">
              {initialBlocks.length > 0 ? (
                initialBlocks.map((block) => {
                  const dateObj = new Date(`${block.date}T12:00:00`);
                  return (
                    <tr key={block.id} className="hover:bg-gray-50/20 transition-colors">
                      {/* Data */}
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-800">
                        {dateObj.toLocaleDateString('pt-BR')}
                      </td>

                      {/* Horário */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {block.block_type === 'full_day' ? (
                          <span className="font-bold text-red-600 bg-red-50 border border-red-100/50 rounded-md px-2 py-0.5">
                            Dia Inteiro
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 font-semibold text-gray-700">
                            <Clock className="h-3.5 w-3.5 text-gray-450" />
                            <span>{block.start_time?.substring(0, 5)} - {block.end_time?.substring(0, 5)}</span>
                          </div>
                        )}
                      </td>

                      {/* Motivo */}
                      <td className="px-6 py-4 max-w-xs truncate text-xs text-gray-500" title={block.reason || 'Sem descrição'}>
                        {block.reason || <span className="italic text-gray-400">Bloqueio manual de agenda</span>}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setBlockToDelete(block.id);
                            setIsDeleteOpen(true);
                          }}
                          title="Remover bloqueio"
                          className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-red-100/50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-gray-450">
                    Você não tem nenhum bloqueio de horário ativo na sua agenda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal para Adicionar Bloqueio */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#1a0e12]/30 backdrop-blur-xs" onClick={() => !isSubmitting && setIsOpenModal(false)} />
          
          <form 
            onSubmit={handleSave}
            className="relative bg-white rounded-3xl p-6 shadow-xl max-w-md w-full mx-4 border border-[#efe9e6] z-10 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
                <Lock className="h-4.5 w-4.5 text-forest" />
                <span>Bloquear Horário</span>
              </h3>
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={() => setIsOpenModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Selecione a Data *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Tipo de Bloqueio *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockType('full_day')}
                    className={`flex-1 py-2 px-3 text-center font-bold rounded-xl transition-all cursor-pointer ${
                      blockType === 'full_day'
                        ? 'bg-forest text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    Dia Inteiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockType('custom_time')}
                    className={`flex-1 py-2 px-3 text-center font-bold rounded-xl transition-all cursor-pointer ${
                      blockType === 'custom_time'
                        ? 'bg-forest text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 border border-gray-200'
                    }`}
                  >
                    Horário Específico
                  </button>
                </div>
              </div>

              {blockType === 'custom_time' && (
                <div className="grid grid-cols-2 gap-3 animate-slide-down">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                      Horário Inicial *
                    </label>
                    <input
                      type="time"
                      required={blockType === 'custom_time'}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                      Horário Final *
                    </label>
                    <input
                      type="time"
                      required={blockType === 'custom_time'}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 text-center font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Motivo do Bloqueio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Folga, compromisso médico, feriado, etc..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 focus:outline-none"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Salvando...' : 'Confirmar Bloqueio'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ConfirmDialog exclusão */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Remover Bloqueio"
        description="Ao remover este bloqueio, os clientes poderão agendar horários neste período novamente. Deseja prosseguir?"
        confirmText="Confirmar Desbloqueio"
        cancelText="Voltar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteOpen(false);
          setBlockToDelete(null);
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
};
export default TimeBlocksList;
