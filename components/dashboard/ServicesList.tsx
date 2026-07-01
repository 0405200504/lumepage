'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Service } from '@/types/database';
import {
  Plus, Edit, Trash2, Clock, DollarSign, Sparkles, X, Save, Eye, EyeOff
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { QuickAddFab } from '../ui/QuickAddFab';
import { 
  createServiceAction, 
  updateServiceAction, 
  deleteServiceAction 
} from '@/app/actions/professional';

interface ServicesListProps {
  initialServices: Service[];
  professionalId: string;
}

export const ServicesList: React.FC<ServicesListProps> = ({
  initialServices,
  professionalId
}) => {
  const router = useRouter();
  const { success, error } = useToast();

  // Estados de Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<string | null>(null);

  // Estados de Formulário
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priceStr, setPriceStr] = useState('0,00');
  const [costStr, setCostStr] = useState('0,00');
  const [isActive, setIsActive] = useState(true);
  const [clientVisible, setClientVisible] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Abrir modal de criação
  const handleOpenCreate = () => {
    setSelectedService(null);
    setName('');
    setDescription('');
    setDurationMinutes(60);
    setPriceStr('0,00');
    setCostStr('0,00');
    setIsActive(true);
    setClientVisible(true);
    setIsEditModalOpen(true);
  };

  // Abrir modal de edição
  const handleOpenEdit = (service: Service) => {
    setSelectedService(service);
    setName(service.name);
    setDescription(service.description || '');
    setDurationMinutes(service.duration_minutes);
    
    // Converte centavos para string formatada "150,00"
    const priceFormatted = (service.price_cents / 100).toFixed(2).replace('.', ',');
    setPriceStr(priceFormatted);
    setCostStr(((service.cost_cents ?? 0) / 100).toFixed(2).replace('.', ','));
    setIsActive(service.is_active);
    setClientVisible(service.client_visible !== false);
    setIsEditModalOpen(true);
  };

  // Tratar salvamento
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      error('Campo obrigatório', 'O nome do serviço é obrigatório.');
      return;
    }

    // Converter string de preço "150,00" para centavos (inteiro 15000)
    const normalizedPrice = priceStr.replace(/\D/g, ''); // remove tudo que não for dígito
    const priceCents = parseInt(normalizedPrice, 10) || 0;
    const costCents = parseInt(costStr.replace(/\D/g, ''), 10) || 0;

    setIsSubmitting(true);
    try {
      if (selectedService) {
        // Atualizar
        const res = await updateServiceAction(professionalId, selectedService.id, {
          name,
          description: description || null,
          duration_minutes: durationMinutes,
          price_cents: priceCents,
          cost_cents: costCents,
          is_active: isActive,
          client_visible: clientVisible
        });
        if (res.success) {
          success('Serviço Atualizado', 'As alterações foram salvas com sucesso.');
          setIsEditModalOpen(false);
          router.refresh();
        } else {
          error('Erro ao salvar', res.error || 'Ocorreu um erro.');
        }
      } else {
        // Criar
        const res = await createServiceAction(professionalId, {
          name,
          description: description || null,
          duration_minutes: durationMinutes,
          price_cents: priceCents,
          cost_cents: costCents,
          is_active: isActive,
          client_visible: clientVisible
        });
        if (res.success) {
          success('Serviço Criado', 'Novo procedimento adicionado com sucesso.');
          setIsEditModalOpen(false);
          router.refresh();
        } else {
          error('Erro ao cadastrar', res.error || 'Ocorreu um erro.');
        }
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha ao processar solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tratar exclusão
  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await deleteServiceAction(professionalId, serviceToDelete);
      if (res.success) {
        success('Excluído!', 'O serviço foi removido do seu catálogo.');
        router.refresh();
      } else {
        error('Falha ao excluir', res.error || 'Não foi possível deletar.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha ao enviar solicitação.');
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setServiceToDelete(null);
    }
  };

  // Formatar preço para exibição
  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Topo com Botão */}
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-[#efe9e6] shadow-xs">
        <div className="flex items-center gap-2 text-forest">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-bold">{initialServices.length} serviços cadastrados</span>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-1 px-4 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar Serviço</span>
        </button>
      </div>

      <QuickAddFab actions={[{ label: 'Cadastrar serviço', icon: Plus, onClick: handleOpenCreate }]} />

      {/* Grid de Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialServices.length > 0 ? (
          initialServices.map((service) => (
            <div 
              key={service.id} 
              className="bg-white border border-[#efe9e6] rounded-3xl p-5 shadow-xs flex flex-col justify-between gap-4 hover:border-forest/45 transition-all duration-200"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-start gap-4">
                  <h4 className="font-bold text-gray-800 text-sm truncate" title={service.name}>
                    {service.name}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {service.client_visible === false && (
                      <span
                        title="Visível apenas para você — não aparece para a cliente agendar"
                        className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100"
                      >
                        <EyeOff className="h-2.5 w-2.5" />
                        Só no painel
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      service.is_active
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-gray-100 text-gray-400 border border-gray-150'
                    }`}>
                      {service.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                
                {service.description && (
                  <p className="text-xs text-gray-450 line-clamp-2 leading-relaxed" title={service.description}>
                    {service.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{service.duration_minutes} min</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[11px] text-gray-900 font-bold">
                    <DollarSign className="h-3.5 w-3.5 text-gray-400" />
                    <span>{formatPrice(service.price_cents)}</span>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3.5">
                <button
                  onClick={() => handleOpenEdit(service)}
                  title="Editar serviço"
                  className="p-2 hover:bg-gray-50 text-gray-500 rounded-xl transition-colors border border-gray-150"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => {
                    setServiceToDelete(service.id);
                    setIsDeleteOpen(true);
                  }}
                  title="Excluir serviço"
                  className="p-2 hover:bg-red-50 text-red-600 rounded-xl transition-colors border border-red-100/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-2 py-16 text-center text-xs text-gray-450 border-2 border-dashed border-gray-250 rounded-3xl bg-white/50">
            Nenhum serviço cadastrado. Clique no botão acima para adicionar seu primeiro procedimento!
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#1a0e12]/30 backdrop-blur-xs" onClick={() => !isSubmitting && setIsEditModalOpen(false)} />
          
          <form 
            onSubmit={handleSave}
            className="relative bg-white rounded-3xl p-6 shadow-xl max-w-md w-full mx-4 border border-[#efe9e6] z-10 space-y-4"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="text-base font-black text-gray-900 tracking-tight">
                {selectedService ? 'Editar Procedimento' : 'Novo Procedimento'}
              </h3>
              <button 
                type="button" 
                disabled={isSubmitting} 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Limpeza de Pele Profunda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Duração (Minutos) *
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(parseInt(e.target.value, 10) || 30)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Preço (R$) *
                  </label>
                  <input
                    type="text"
                    required
                    value={priceStr}
                    onChange={(e) => {
                      // Máscara básica de reais
                      let val = e.target.value.replace(/\D/g, '');
                      if (val === '') val = '0';
                      const cents = parseInt(val, 10);
                      const formatted = (cents / 100).toFixed(2).replace('.', ',');
                      setPriceStr(formatted);
                    }}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest font-semibold text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Custo de insumos (R$)
                </label>
                <input
                  type="text"
                  value={costStr}
                  onChange={(e) => {
                    let val = e.target.value.replace(/\D/g, '');
                    if (val === '') val = '0';
                    const cents = parseInt(val, 10);
                    setCostStr((cents / 100).toFixed(2).replace('.', ','));
                  }}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest font-semibold text-gray-800"
                />
                <p className="text-[10px] text-gray-450 mt-1">Material gasto por atendimento. Usado no DRE do Financeiro para calcular o lucro líquido. Opcional.</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Descrição do Serviço
                </label>
                <textarea
                  rows={3}
                  placeholder="Explique resumidamente o procedimento, benefícios e cuidados associados..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div className="flex items-center gap-2 py-1.5">
                <input
                  type="checkbox"
                  id="serviceActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-gray-200 text-forest focus:ring-forest/20"
                />
                <label htmlFor="serviceActive" className="text-xs text-gray-700 font-bold cursor-pointer">
                  Serviço ativo
                </label>
              </div>

              <div className="rounded-xl border border-gray-150 bg-gray-50/60 p-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="serviceClientVisible"
                    checked={clientVisible}
                    onChange={(e) => setClientVisible(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-gray-200 text-forest focus:ring-forest/20"
                  />
                  <div>
                    <label htmlFor="serviceClientVisible" className="flex items-center gap-1.5 text-xs text-gray-700 font-bold cursor-pointer">
                      {clientVisible ? <Eye className="h-3.5 w-3.5 text-forest" /> : <EyeOff className="h-3.5 w-3.5 text-amber-600" />}
                      Mostrar para a cliente no agendamento
                    </label>
                    <p className="text-[10px] text-gray-450 mt-1 leading-relaxed">
                      Desmarque para deixar o serviço só no seu painel (uso interno e agendamento manual).
                      Assim ele não aparece no site para a cliente agendar nem na lista que o bot oferece.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsEditModalOpen(false)}
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
                <span>{isSubmitting ? 'Salvando...' : 'Salvar'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Excluir Procedimento"
        description="Esta ação removerá permanentemente o serviço do seu catálogo de agendamentos. Deseja continuar?"
        confirmText="Confirmar Exclusão"
        cancelText="Voltar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setIsDeleteOpen(false);
          setServiceToDelete(null);
        }}
        isLoading={isSubmitting}
      />
    </div>
  );
};
export default ServicesList;
