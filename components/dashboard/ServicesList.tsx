'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Service } from '@/types/database';
import { Plus, Pencil, Trash2, EyeOff } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Field, Toggle } from '../ui/Field';
import { PageHeader } from '../ui/PageHeader';
import { TechTable } from '../ui/TechTable';
import { StatusLabel } from '../ui/StatusDot';
import { EmptyState } from '../ui/EmptyState';
import { MonoValue } from '../ui/Mono';
import { Segmented } from '../ui/Segmented';
import { SearchField } from '../ui/SearchField';
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from '@/app/actions/professional';

interface ServicesListProps {
  initialServices: Service[];
  professionalId: string;
}

type Filtro = 'todos' | 'ativos' | 'inativos';

const brl = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

/**
 * ARQUÉTIPO 2 · TABELA DENSA.
 *
 * Esta tela era o exemplo do diagnóstico: 17 serviços renderizados como 17
 * cartazes de raio 24 em grade de duas colunas, cada um com selo pastel,
 * descrição em duas linhas e dois botões de ação sempre visíveis num rodapé
 * próprio. Dezessete linhas de dados desenhadas como dezessete pôsteres —
 * uma tela e meia de rolagem para ver o que cabe em 750px de tabela.
 *
 * O que a tabela recupera, além do espaço: COMPARAÇÃO. Duração e valor
 * alinhados em coluna, com dígito de largura fixa, deixam a profissional
 * ver de relance qual procedimento é caro por minuto — coisa impossível
 * quando cada valor está num canto diferente de um card diferente.
 *
 * `is_active` virou toggle NA LINHA: ativar/desativar era a operação mais
 * frequente da tela e exigia abrir o modal, marcar um checkbox e salvar.
 */
export const ServicesList: React.FC<ServicesListProps> = ({
  initialServices,
  professionalId,
}) => {
  const router = useRouter();
  const { success, error } = useToast();

  /* Cópia local para o toggle da linha responder na hora. O router.refresh()
     revalida no servidor logo em seguida; sem o estado local a chave só
     mudaria de posição no fim do round-trip, e o controle pareceria travado. */
  const [services, setServices] = useState<Service[]>(initialServices);
  React.useEffect(() => setServices(initialServices), [initialServices]);

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [priceStr, setPriceStr] = useState('0,00');
  const [costStr, setCostStr] = useState('0,00');
  const [isActive, setIsActive] = useState(true);
  const [clientVisible, setClientVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return services.filter((s) => {
      if (filtro === 'ativos' && !s.is_active) return false;
      if (filtro === 'inativos' && s.is_active) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        (s.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [services, busca, filtro]);

  const ativos = services.filter((s) => s.is_active).length;
  const ocultos = services.filter((s) => s.client_visible === false).length;

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

  const handleOpenEdit = (service: Service) => {
    setSelectedService(service);
    setName(service.name);
    setDescription(service.description || '');
    setDurationMinutes(service.duration_minutes);
    setPriceStr((service.price_cents / 100).toFixed(2).replace('.', ','));
    setCostStr(((service.cost_cents ?? 0) / 100).toFixed(2).replace('.', ','));
    setIsActive(service.is_active);
    setClientVisible(service.client_visible !== false);
    setIsEditModalOpen(true);
  };

  /** Liga/desliga direto na linha, com reversão em caso de falha. */
  const handleToggleActive = async (service: Service, next: boolean) => {
    setTogglingId(service.id);
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, is_active: next } : s)),
    );
    try {
      const res = await updateServiceAction(professionalId, service.id, { is_active: next });
      if (!res.success) {
        setServices((prev) =>
          prev.map((s) => (s.id === service.id ? { ...s, is_active: !next } : s)),
        );
        error('Não foi possível alterar', res.error || 'Tente novamente.');
      } else {
        router.refresh();
      }
    } catch {
      setServices((prev) =>
        prev.map((s) => (s.id === service.id ? { ...s, is_active: !next } : s)),
      );
      error('Erro', 'Falha ao alterar o serviço.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error('Campo obrigatório', 'O nome do serviço é obrigatório.');
      return;
    }
    const priceCents = parseInt(priceStr.replace(/\D/g, ''), 10) || 0;
    const costCents = parseInt(costStr.replace(/\D/g, ''), 10) || 0;
    const payload = {
      name: name.trim(),
      description: description || null,
      duration_minutes: durationMinutes,
      price_cents: priceCents,
      cost_cents: costCents,
      is_active: isActive,
      client_visible: clientVisible,
    };

    setIsSubmitting(true);
    try {
      const res = selectedService
        ? await updateServiceAction(professionalId, selectedService.id, payload)
        : await createServiceAction(professionalId, payload);
      if (res.success) {
        success(
          selectedService ? 'Serviço atualizado' : 'Serviço criado',
          selectedService ? 'As alterações foram salvas.' : 'Novo procedimento adicionado.',
        );
        setIsEditModalOpen(false);
        router.refresh();
      } else {
        error('Erro ao salvar', res.error || 'Ocorreu um erro.');
      }
    } catch {
      error('Erro', 'Ocorreu uma falha ao processar a solicitação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!serviceToDelete) return;
    setIsSubmitting(true);
    try {
      const res = await deleteServiceAction(professionalId, serviceToDelete.id);
      if (res.success) {
        success('Excluído', 'O serviço foi removido do seu catálogo.');
        router.refresh();
      } else {
        error('Falha ao excluir', res.error || 'Não foi possível deletar.');
      }
    } catch {
      error('Erro', 'Ocorreu uma falha ao enviar a solicitação.');
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setServiceToDelete(null);
    }
  };

  const moeda = (v: string, set: (s: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '') || '0';
    set((parseInt(digits, 10) / 100).toFixed(2).replace('.', ','));
  };

  return (
    <div className="space-y-5">
      <PageHeader
        trail={[
          'Serviços',
          `${services.length} cadastrados`,
          `${ativos} ativos`,
          ocultos > 0 ? `${ocultos} fora do site` : null,
        ]}
        title="Catálogo de serviços"
        actions={
          <Button size="md" onClick={handleOpenCreate} leadingIcon={<Plus className="h-[18px] w-[18px]" />}>
            Novo serviço
          </Button>
        }
      />

      {/* Busca + filtro. Com 17 linhas a busca já paga o próprio espaço; com
          40 ela é a única forma de achar um serviço sem varrer a lista. */}
      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          className="flex-1 min-w-[12rem] max-w-sm"
          label="Buscar serviço"
          placeholder="Buscar serviço"
          value={busca}
          onChange={setBusca}
        />
        <Segmented
          ariaLabel="Filtrar por status"
          value={filtro}
          onChange={setFiltro}
          items={[
            { key: 'todos', label: 'Todos' },
            { key: 'ativos', label: 'Ativos' },
            { key: 'inativos', label: 'Inativos' },
          ]}
        />
      </div>

      <Card pad="p-0" className="overflow-hidden">
        <TechTable
          rows={filtrados}
          rowKey={(s) => s.id}
          initialSort={{ key: 'name', dir: 'asc' }}
          empty={
            services.length === 0 ? (
              <EmptyState
                framed={false}
                title="Nenhum serviço cadastrado"
                description="Cadastre o primeiro procedimento para que ele apareça na sua página de agendamento."
                actionText="Novo serviço"
                onAction={handleOpenCreate}
              />
            ) : (
              <EmptyState
                framed={false}
                title="Nenhum resultado"
                description="Nenhum serviço corresponde à busca ou ao filtro selecionado."
              />
            )
          }
          columns={[
            {
              key: 'name',
              header: 'Serviço',
              /* A coluna do nome absorve TODO o excesso de largura. Sem isso o
                 layout automático da tabela reparte a sobra entre as cinco
                 colunas e abre um vão de 300px entre o nome e a duração — os
                 números deixam de ler como coluna. */
              width: '100%',
              sortValue: (s) => s.name,
              cell: (s) => (
                <div className="min-w-0">
                  <p className="text-ink truncate">{s.name}</p>
                  {s.description && (
                    /* A descrição desceu para uma linha só, truncada. No card
                       ela ocupava duas linhas em todos os 17 itens e era o que
                       mais empurrava a tela para baixo — o texto completo
                       continua no modal de edição, que é onde ele é lido. */
                    <p className="text-caption text-n-500 truncate">{s.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'duration',
              className: 'whitespace-nowrap',
              header: 'Duração',
              num: true,
              sortValue: (s) => s.duration_minutes,
              cell: (s) => `${s.duration_minutes}min`,
            },
            {
              key: 'price',
              className: 'whitespace-nowrap',
              header: 'Valor',
              num: true,
              sortValue: (s) => s.price_cents,
              cell: (s) => <span className="num font-semibold text-heading">{brl(s.price_cents)}</span>,
            },
            {
              key: 'visible',
              className: 'whitespace-nowrap',
              header: 'No site',
              hideOnMobile: true,
              sortValue: (s) => (s.client_visible === false ? 0 : 1),
              cell: (s) =>
                s.client_visible === false ? (
                  <span
                    className="inline-flex items-center gap-1.5"
                    title="Visível apenas para você — não aparece para a cliente agendar"
                  >
                    <EyeOff className="h-3.5 w-3.5 text-warning" aria-hidden />
                    <span className="mono-micro text-n-600">Só no painel</span>
                  </span>
                ) : (
                  <StatusLabel tone="success">Sim</StatusLabel>
                ),
            },
            {
              key: 'active',
              className: 'whitespace-nowrap',
              header: 'Ativo',
              sortValue: (s) => (s.is_active ? 1 : 0),
              cell: (s) => (
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Toggle
                    checked={s.is_active}
                    disabled={togglingId === s.id}
                    onChange={(v) => handleToggleActive(s, v)}
                    label={`${s.is_active ? 'Desativar' : 'Ativar'} ${s.name}`}
                  />
                  <MonoValue className="text-micro text-n-500 hidden lg:inline">
                    {s.is_active ? 'ATIVO' : 'INATIVO'}
                  </MonoValue>
                </div>
              ),
            },
          ]}
          onRowClick={handleOpenEdit}
          /* No celular a linha carrega nome em cima e os dados em mono
             embaixo — duração, valor e visibilidade, que na tabela ficariam
             atrás de um scroll horizontal invisível. O toggle vai junto das
             ações, à direita, porque ativar/desativar é a operação frequente
             e ela não pode exigir abrir o modal. */
          mobileRow={(s) => (
            <>
              <div className="flex items-baseline gap-2">
                <p className="text-body-sm text-heading truncate flex-1">{s.name}</p>
                <span className="num text-body-sm font-semibold text-heading shrink-0">
                  {brl(s.price_cents)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <MonoValue className="text-micro text-n-500">{s.duration_minutes}MIN</MonoValue>
                <span className="text-n-300" aria-hidden>·</span>
                <StatusLabel tone={s.is_active ? 'success' : 'neutral'}>
                  {s.is_active ? 'Ativo' : 'Inativo'}
                </StatusLabel>
                {s.client_visible === false && (
                  <>
                    <span className="text-n-300" aria-hidden>·</span>
                    <span className="inline-flex items-center gap-1">
                      <EyeOff className="h-3 w-3 text-warning" aria-hidden />
                      <span className="mono-micro text-n-600">Só no painel</span>
                    </span>
                  </>
                )}
              </div>
            </>
          )}
          actions={(s) => (
            <>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Editar ${s.name}`}
                onClick={(e) => { e.stopPropagation(); handleOpenEdit(s); }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                aria-label={`Excluir ${s.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setServiceToDelete(s);
                  setIsDeleteOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        />
      </Card>

      <Modal
        open={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        busy={isSubmitting}
        trail={['Catálogo', selectedService ? 'Editar' : 'Novo']}
        title={selectedService ? selectedService.name : 'Novo procedimento'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" loading={isSubmitting}>
              Salvar
            </Button>
          </>
        }
      >
        <form id="service-form" onSubmit={handleSave} className="space-y-4">
          <Field
            label="Nome do serviço"
            required
            inputProps={{
              value: name,
              onChange: (e) => setName(e.target.value),
              placeholder: 'Ex.: Limpeza de pele profunda',
              autoFocus: true,
            }}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Duração (min)"
              required
              inputProps={{
                type: 'number',
                min: 5,
                value: durationMinutes,
                onChange: (e) => setDurationMinutes(parseInt(e.target.value, 10) || 30),
              }}
            />
            <Field
              label="Valor (R$)"
              required
              inputProps={{
                value: priceStr,
                onChange: moeda(priceStr, setPriceStr),
                inputMode: 'numeric',
                className: 'field-input num font-semibold',
              }}
            />
          </div>

          <Field
            label="Custo de insumos (R$)"
            hint="Material gasto por atendimento. Alimenta o DRE do Financeiro para calcular o lucro líquido. Opcional."
            inputProps={{
              value: costStr,
              onChange: moeda(costStr, setCostStr),
              inputMode: 'numeric',
              className: 'field-input num font-semibold',
            }}
          />

          <Field label="Descrição">
            <textarea
              rows={3}
              className="field-input"
              placeholder="Explique resumidamente o procedimento, benefícios e cuidados associados…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>

          {/* Os dois interruptores dividem uma seção separada por hairline —
              sem card aninhado, que era o que fazia o rodapé do formulário
              parecer uma caixa dentro de outra. */}
          <div className="border-t border-line pt-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-body-sm text-ink">Serviço ativo</p>
                <p className="text-caption text-n-500">
                  Inativo some da agenda e do agendamento, mas o histórico é preservado.
                </p>
              </div>
              <Toggle checked={isActive} onChange={setIsActive} label="Serviço ativo" />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-body-sm text-ink">Mostrar para a cliente</p>
                <p className="text-caption text-n-500">
                  Desligado, o serviço fica só no seu painel: não aparece no site para a
                  cliente agendar nem na lista que o bot oferece.
                </p>
              </div>
              <Toggle
                checked={clientVisible}
                onChange={setClientVisible}
                label="Mostrar para a cliente no agendamento"
              />
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Excluir procedimento"
        description={
          serviceToDelete
            ? `“${serviceToDelete.name}” será removido permanentemente do seu catálogo. Os atendimentos já registrados não são afetados.`
            : ''
        }
        confirmText="Excluir"
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
