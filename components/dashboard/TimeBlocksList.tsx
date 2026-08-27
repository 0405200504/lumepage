'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TimeBlock, BlockType } from '@/types/database';
import { Plus, Trash2, Calendar, Clock, Lock, X, Save } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { PageHeader } from '../ui/PageHeader';
import { TechTable } from '../ui/TechTable';
import { StatusLabel } from '../ui/StatusDot';
import { MonoValue } from '../ui/Mono';
import { EmptyState } from '../ui/EmptyState';
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
    <div className="space-y-5">
      <PageHeader
        trail={['Bloqueios', `${initialBlocks.length} ativo(s)`]}
        title="Bloqueios de horário"
        description="Períodos em que a agenda não aceita agendamento."
        actions={
          <Button size="md" onClick={handleOpenCreate} leadingIcon={<Plus className="h-[18px] w-[18px]" />}>
            Bloquear horário
          </Button>
        }
      />

      {/* ARQUÉTIPO 2 · o período em mono é o dado da tela, e numa tabela ele
          fica alinhado em coluna: dá para varrer a lista e ver os buracos.
          Como cartões, cada data ficava num canto diferente. */}
      <Card pad="p-0" className="overflow-hidden">
        <TechTable
          rows={initialBlocks}
          rowKey={(b) => b.id}
          initialSort={{ key: 'date', dir: 'asc' }}
          empty={
            <EmptyState
              framed={false}
              title="Nenhum bloqueio cadastrado"
              description="Bloqueie férias, feriados ou compromissos pessoais para que ninguém consiga agendar nesses horários."
              actionText="Bloquear horário"
              onAction={handleOpenCreate}
            />
          }
          columns={[
            {
              key: 'date',
              header: 'Data',
              width: '1%',
              className: 'whitespace-nowrap',
              sortValue: (b) => b.date,
              cell: (b) => {
                const d = new Date(`${b.date}T12:00:00`);
                return (
                  <span className="inline-flex flex-col">
                    <MonoValue className="text-body-sm text-ink">{d.toLocaleDateString('pt-BR')}</MonoValue>
                    <span className="mono-micro text-n-500">
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase()}
                    </span>
                  </span>
                );
              },
            },
            {
              key: 'period',
              header: 'Período',
              className: 'whitespace-nowrap',
              cell: (b) =>
                b.block_type === 'full_day' ? (
                  <StatusLabel tone="danger">Dia inteiro</StatusLabel>
                ) : (
                  <MonoValue className="text-body-sm text-ink">
                    {b.start_time?.substring(0, 5)}–{b.end_time?.substring(0, 5)}
                  </MonoValue>
                ),
            },
            {
              key: 'reason',
              header: 'Motivo',
              width: '100%',
              cell: (b) => (
                <span className={b.reason ? 'text-ink' : 'text-n-400'}>
                  {b.reason || '—'}
                </span>
              ),
            },
          ]}
          mobileRow={(b) => {
            const d = new Date(`${b.date}T12:00:00`);
            return (
              <>
                <div className="flex items-baseline gap-2">
                  <MonoValue className="text-body-sm text-heading">{d.toLocaleDateString('pt-BR')}</MonoValue>
                  <span className="text-caption text-n-500 truncate">{b.reason || '—'}</span>
                </div>
                <div className="mt-1">
                  {b.block_type === 'full_day' ? (
                    <StatusLabel tone="danger">Dia inteiro</StatusLabel>
                  ) : (
                    <MonoValue className="text-micro text-n-500">
                      {b.start_time?.substring(0, 5)}–{b.end_time?.substring(0, 5)}
                    </MonoValue>
                  )}
                </div>
              </>
            );
          }}
          actions={(b) => (
            <Button
              size="sm" variant="ghost" iconOnly
              aria-label={`Remover bloqueio de ${new Date(`${b.date}T12:00:00`).toLocaleDateString('pt-BR')}`}
              onClick={() => { setBlockToDelete(b.id); setIsDeleteOpen(true); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        />
      </Card>

      {/* Modal para Adicionar Bloqueio */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-xs" onClick={() => !isSubmitting && setIsOpenModal(false)} />
          
          <form 
            onSubmit={handleSave}
            className="relative bg-white rounded-3xl p-6 shadow-xl max-w-md w-full mx-4 border border-n-200 z-10 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-n-100 pb-3">
              <h3 className="text-body font-semibold text-n-900 tracking-tight flex items-center gap-1.5">
                <Lock className="h-4.5 w-4.5 text-wine-700" />
                <span>Bloquear Horário</span>
              </h3>
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={() => setIsOpenModal(false)}
                className="text-n-400 hover:text-n-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-caption">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Selecione a Data *
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Tipo de Bloqueio *
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockType('full_day')}
                    className={`flex-1 py-2 px-3 text-center font-bold rounded-xl transition-ui cursor-pointer ${
                      blockType === 'full_day'
                        ? 'bg-wine-700 text-white shadow-sm'
                        : 'bg-n-50 text-n-600 border border-n-200'
                    }`}
                  >
                    Dia Inteiro
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockType('custom_time')}
                    className={`flex-1 py-2 px-3 text-center font-bold rounded-xl transition-ui cursor-pointer ${
                      blockType === 'custom_time'
                        ? 'bg-wine-700 text-white shadow-sm'
                        : 'bg-n-50 text-n-600 border border-n-200'
                    }`}
                  >
                    Horário Específico
                  </button>
                </div>
              </div>

              {blockType === 'custom_time' && (
                <div className="grid grid-cols-2 gap-3 animate-slide-down">
                  <div>
                    <label className="mono-micro text-n-500 block mb-1.5">
                      Horário Inicial *
                    </label>
                    <input
                      type="time"
                      required={blockType === 'custom_time'}
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="block w-full px-3 py-2 border border-n-200 rounded-xl text-caption text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="mono-micro text-n-500 block mb-1.5">
                      Horário Final *
                    </label>
                    <input
                      type="time"
                      required={blockType === 'custom_time'}
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="block w-full px-3 py-2 border border-n-200 rounded-xl text-caption text-center font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Motivo do Bloqueio (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Folga, compromisso médico, feriado, etc..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-n-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsOpenModal(false)}
                className="px-4 py-2 border border-n-200 rounded-xl text-caption font-semibold text-n-600 hover:bg-n-50 "
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1"
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
