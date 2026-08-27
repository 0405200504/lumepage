'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Appointment, Setting, AppointmentStatus, Service, Client } from '@/types/database';
import {
  MessageCircle, Check, X, CheckCircle, Ban, Bell, Trash2, Plus, Pencil, RotateCcw
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Portal } from '../ui/Portal';
import { PageHeader } from '../ui/PageHeader';
import { SearchField } from '../ui/SearchField';
import { Button } from '../ui/Button';
import { PillGroup } from '../ui/PillGroup';
import { StatusPill } from '../ui/StatusPill';
import { EmptyState } from '../ui/EmptyState';
import {
  updateAppointmentStatusAction, deleteAppointmentAction, updateAppointmentAction,
  getTrashedAppointmentsAction, restoreAppointmentAction, purgeAppointmentAction,
} from '@/app/actions/professional';
import { createManualAppointmentAction } from '@/app/actions/booking';
import { statusMeta } from '@/lib/appointments/status';
import { resolveAppointmentServices, sumPriceCents, sumDurationMinutes, formatServiceNames, serviceIdsOf } from '@/lib/appointments/services';
import { buildReminderLink, buildWhatsappLink, fillTemplate, formatDateBR, formatPriceBRL } from '@/lib/whatsapp';

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Não sei ainda'];

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
  const [nServiceIds, setNServiceIds] = useState<string[]>([]);
  const [nDate, setNDate] = useState('');
  const [nTime, setNTime] = useState('');
  const [nDuration, setNDuration] = useState<number>(60);
  const [nDurationTouched, setNDurationTouched] = useState(false);
  const [nNotes, setNNotes] = useState('');
  const [nAllowOverlap, setNAllowOverlap] = useState(false);
  const [nClients, setNClients] = useState<Array<{ name: string; phone: string }>>([]);
  const [nPaymentMethod, setNPaymentMethod] = useState('');
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Edição de agendamento
  const [editApp, setEditApp] = useState<Appointment | null>(null);
  const [eServiceIds, setEServiceIds] = useState<string[]>([]);
  const [eDate, setEDate] = useState('');
  const [eTime, setETime] = useState('');
  const [eDuration, setEDuration] = useState<number>(60);
  const [eNotes, setENotes] = useState('');
  const [ePaymentMethod, setEPaymentMethod] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Lixeira de agendamentos
  const [showTrash, setShowTrash] = useState(false);
  const [trashedAppts, setTrashedAppts] = useState<Appointment[]>([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashBusyId, setTrashBusyId] = useState<string | null>(null);

  // Serviços resolvidos / rótulo / total de um agendamento (multi-serviço)
  const apptServices = (app: Appointment) => resolveAppointmentServices(app, services);
  const apptServiceLabel = (app: Appointment) => formatServiceNames(apptServices(app)) || app.service?.name || 'Serviço';
  const apptTotalCents = (app: Appointment) => sumPriceCents(apptServices(app));

  // Campo vazio → mostra TODAS as clientes cadastradas (a profissional só seleciona).
  // Com texto → filtra por nome; se digitou números, também casa pelo WhatsApp.
  // (Importante: só filtra por WhatsApp quando há dígitos — senão includes('') casaria
  //  com todas e a lista nunca estreitaria ao digitar letras.)
  const getSuggestions = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return clients.slice(0, 50);
    const digits = query.replace(/\D/g, '');
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (digits.length > 0 && c.whatsapp.includes(digits))
    ).slice(0, 50);
  };

  const clientSuggestions = getSuggestions(nName);

  const openNew = () => {
    const first = activeServices[0];
    setNName(''); setNPhone(''); setNServiceIds(first ? [first.id] : []);
    setNDate(''); setNTime(''); setNDuration(first?.duration_minutes || 60); setNDurationTouched(false); setNNotes('');
    setNAllowOverlap(false); setNClients([]); setActiveSuggestionIdx(null); setNPaymentMethod('');
    setShowNew(true);
  };

  // Multi-serviço: alterna a seleção e recalcula a duração (soma) enquanto não for editada à mão
  const toggleService = (id: string) => {
    setNServiceIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!nDurationTouched) {
        const sum = sumDurationMinutes(activeServices.filter(s => next.includes(s.id)));
        if (sum > 0) setNDuration(sum);
      }
      return next;
    });
  };

  const nTotalCents = sumPriceCents(activeServices.filter(s => nServiceIds.includes(s.id)));

  const createManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNew(true);
    try {
      if (nServiceIds.length === 0) {
        error('Atenção', 'Selecione ao menos um serviço.');
        return;
      }

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
          serviceId: nServiceIds[0],
          serviceIds: nServiceIds,
          clientName: client.name,
          clientWhatsapp: client.phone,
          date: nDate,
          startTime: nTime,
          durationMinutes: nDuration,
          notes: nNotes || undefined,
          allowOverlap: nAllowOverlap,
          paymentMethod: nPaymentMethod || undefined,
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

  /* A busca e a data continuam valendo na contagem; só o status é ignorado.
     Se a contagem ignorasse os outros filtros, a pílula prometeria 12
     pendentes e a lista entregaria 2. */
  const semStatus = initialAppointments.filter(app => {
    const matchesSearch =
      app.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.client_whatsapp.includes(searchTerm) ||
      (app.service?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch && (!dateFilter || app.date === dateFilter);
  });
  const contar = (st: string) => st === 'all' ? semStatus.length : semStatus.filter(a => a.status === st).length;

  const STATUS_TABS = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'confirmed', label: 'Confirmados' },
    { key: 'completed', label: 'Finalizados' },
    { key: 'cancelled', label: 'Cancelados' },
    { key: 'no_show', label: 'Faltas' },
  ].map(t => ({ ...t, label: `${t.label} (${contar(t.key)})` }));

  /* Lista plana vira lista POR DIA. É a mudança que mais se sente: em vez de
     56 linhas soltas, a profissional lê "Hoje / Amanhã / Sexta" e sabe onde
     está sem conferir data em cada linha. */
  const hojeISO = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const amanhaISO = (() => { const d = new Date(); d.setDate(d.getDate()+1); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const rotuloDoDia = (iso: string) => {
    if (iso === hojeISO) return 'Hoje';
    if (iso === amanhaISO) return 'Amanhã';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return `${DIAS[dt.getDay()].charAt(0).toUpperCase()}${DIAS[dt.getDay()].slice(1)}, ${formatDateBR(iso)}`;
  };
  const porDia = (() => {
    const mapa = new Map<string, Appointment[]>();
    for (const a of filteredAppointments) {
      const arr = mapa.get(a.date) ?? [];
      arr.push(a);
      mapa.set(a.date, arr);
    }
    return [...mapa.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([iso, apps]) => ({
        iso,
        rotulo: rotuloDoDia(iso),
        apps: apps.sort((x, y) => x.start_time.localeCompare(y.start_time)),
      }));
  })();

  const handleUpdateStatus = async (id: string, status: AppointmentStatus, reason?: string, prevStatus?: AppointmentStatus) => {
    setUpdatingId(id);
    try {
      const res = await updateAppointmentStatusAction(id, professionalId, status, reason);
      if (res.success) {
        // Oferece desfazer: volta ao status anterior
        if (prevStatus && prevStatus !== status) {
          success('Atualizado!', 'Status do agendamento alterado.', {
            actionLabel: 'Desfazer',
            onAction: async () => {
              await updateAppointmentStatusAction(id, professionalId, prevStatus);
              router.refresh();
            },
          });
        } else {
          success('Atualizado!', 'Status do agendamento alterado com sucesso.');
        }
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

  // ── Edição de agendamento ───────────────────────────────────────────────
  const openEdit = (app: Appointment) => {
    setEditApp(app);
    setEServiceIds(serviceIdsOf(app));
    setEDate(app.date);
    setETime(app.start_time.substring(0, 5));
    setEDuration(realDurationMin(app) || 60);
    setENotes(app.notes || '');
    setEPaymentMethod(app.payment_method || '');
  };

  const toggleEditService = (id: string) => {
    setEServiceIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      const sum = sumDurationMinutes(activeServices.filter(s => next.includes(s.id)));
      if (sum > 0) setEDuration(sum);
      return next;
    });
  };

  const saveEdit = async () => {
    if (!editApp) return;
    if (eServiceIds.length === 0) { error('Atenção', 'Selecione ao menos um serviço.'); return; }
    setSavingEdit(true);
    try {
      const endTime = `${addMinutes(eTime, eDuration)}:00`;
      const res = await updateAppointmentAction(editApp.id, professionalId, {
        serviceId: eServiceIds[0],
        serviceIds: eServiceIds,
        date: eDate,
        startTime: `${eTime}:00`,
        endTime,
        notes: eNotes || '',
        paymentMethod: ePaymentMethod,
      });
      if (res.success) {
        success('Agendamento atualizado!', 'As alterações foram salvas.');
        setEditApp(null);
        router.refresh();
      } else {
        error('Falha', res.error || 'Não foi possível salvar as alterações.');
      }
    } catch {
      error('Erro', 'Falha ao salvar o agendamento.');
    } finally {
      setSavingEdit(false);
    }
  };
  const eTotalCents = sumPriceCents(activeServices.filter(s => eServiceIds.includes(s.id)));

  // ── Lixeira de agendamentos ─────────────────────────────────────────────
  const openTrash = async () => {
    setShowTrash(true);
    setTrashLoading(true);
    const items = await getTrashedAppointmentsAction(professionalId).catch(() => [] as Appointment[]);
    setTrashedAppts(items);
    setTrashLoading(false);
  };

  const handleRestore = async (id: string) => {
    setTrashBusyId(id);
    const res = await restoreAppointmentAction(id, professionalId);
    setTrashBusyId(null);
    if (res.success) {
      setTrashedAppts(prev => prev.filter(a => a.id !== id));
      success('Restaurado!', 'O agendamento voltou para a agenda.');
      router.refresh();
    } else {
      error('Falha', res.error || 'Não foi possível restaurar.');
    }
  };

  const handlePurge = async (id: string) => {
    if (!confirm('Excluir DEFINITIVAMENTE este agendamento? Não dá pra desfazer.')) return;
    setTrashBusyId(id);
    const res = await purgeAppointmentAction(id, professionalId);
    setTrashBusyId(null);
    if (res.success) {
      setTrashedAppts(prev => prev.filter(a => a.id !== id));
      success('Excluído', 'Removido definitivamente.');
    } else {
      error('Falha', res.error || 'Não foi possível excluir.');
    }
  };

  const handleDeleteAppt = async (id: string) => {
    setUpdatingId(id);
    try {
      const res = await deleteAppointmentAction(id, professionalId);
      if (res.success) {
        success('Movido para a lixeira', 'O agendamento pode ser restaurado.', {
          actionLabel: 'Desfazer',
          onAction: async () => {
            await restoreAppointmentAction(id, professionalId);
            router.refresh();
          },
        });
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

  const iconBtn = 'tap flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl transition-ui disabled:opacity-40';
  const iconLabel = 'text-caption font-bold leading-none';

  // Ações de um agendamento — reutilizadas na tabela (desktop) e nos cards (mobile)
  const AppointmentActions = ({ app }: { app: Appointment }) => (
    <>
      {app.status === 'pending' && (
        <button onClick={() => handleUpdateStatus(app.id, 'confirmed', undefined, app.status)} disabled={updatingId === app.id} title="Confirmar" className={`${iconBtn} hover:text-success`}>
          <Check className="h-4 w-4" />
          <span className={iconLabel}>Confirmar</span>
        </button>
      )}
      {app.status === 'confirmed' && (
        <button onClick={() => handleUpdateStatus(app.id, 'completed', undefined, app.status)} disabled={updatingId === app.id} title="Marcar como finalizado" className={`${iconBtn} hover:bg-wine-50 text-wine-700`}>
          <CheckCircle className="h-4 w-4" />
          <span className={iconLabel}>Finalizar</span>
        </button>
      )}
      {(app.status === 'confirmed' || app.status === 'pending') && (
        <button onClick={() => handleUpdateStatus(app.id, 'no_show', undefined, app.status)} disabled={updatingId === app.id} title="Marcar falta (não compareceu)" className={`${iconBtn} hover:text-danger`}>
          <Ban className="h-4 w-4" />
          <span className={iconLabel}>Falta</span>
        </button>
      )}
      {['pending', 'confirmed'].includes(app.status) && (
        <button onClick={() => { setSelectedApp(app); setShowCancelDialog(true); }} disabled={updatingId === app.id} title="Cancelar" className={`${iconBtn} hover:bg-n-200 text-n-600`}>
          <X className="h-4 w-4" />
          <span className={iconLabel}>Cancelar</span>
        </button>
      )}
      {app.status !== 'cancelled' && app.status !== 'no_show' && (
        <button onClick={() => handleReminder(app)} title="Enviar lembrete no WhatsApp" className={`${iconBtn} hover:text-success border border-n-200`}>
          <Bell className="h-4 w-4" />
          <span className={iconLabel}>Lembrete</span>
        </button>
      )}
      <button onClick={() => window.open(buildWhatsappLink(app.client_whatsapp, ''), '_blank')} title="Abrir conversa no WhatsApp" className={`${iconBtn} hover:bg-n-50 text-n-600 border border-n-200`}>
        <MessageCircle className="h-4 w-4" />
        <span className={iconLabel}>WhatsApp</span>
      </button>
      <button onClick={() => openEdit(app)} title="Editar agendamento" className={`${iconBtn} hover:bg-n-50 text-n-600 hover:text-wine-700 border border-n-200`}>
        <Pencil className="h-4 w-4" />
        <span className={iconLabel}>Editar</span>
      </button>
      <button onClick={() => handleDeleteAppt(app.id)} disabled={updatingId === app.id} title="Excluir" className={`${iconBtn} hover:bg-n-50 text-n-600 hover:text-danger border border-n-200`}>
        <Trash2 className="h-4 w-4" />
        <span className={iconLabel}>Excluir</span>
      </button>
    </>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        trail={[
          'Agendamentos',
          `${initialAppointments.length} no total`,
          porDia.length > 0 ? `${porDia.length} dia(s) em vista` : null,
        ]}
        title="Agendamentos"
        actions={
          <>
            <Button variant="ghost" size="md" onClick={openTrash} leadingIcon={<Trash2 className="h-[18px] w-[18px]" />}>
              <span className="hidden sm:inline">Lixeira</span>
            </Button>
            <Button size="md" onClick={openNew} leadingIcon={<Plus className="h-[18px] w-[18px]" />}>
              Novo agendamento
            </Button>
          </>
        }
      />

      {/* ---- Filtros ----
          O status era um <select> escondido dentro de um cartão cinza. Virou
          pílula COM CONTAGEM: a profissional vê que há 3 pendentes antes de
          decidir filtrar, em vez de abrir o menu para descobrir. */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <SearchField
            className="flex-1 min-w-0"
            label="Buscar agendamentos"
            placeholder="Cliente, WhatsApp ou serviço"
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label="Filtrar por data"
              className="field-input mono w-auto"
            />
            {dateFilter && (
              <Button variant="ghost" size="sm" onClick={() => setDateFilter('')}>Limpar</Button>
            )}
          </div>
        </div>

        <PillGroup
          ariaLabel="Filtrar por status"
          value={statusFilter}
          onChange={setStatusFilter}
          items={STATUS_TABS}
          className="max-w-full"
        />
      </div>

      {/* ---- Lista, agrupada por dia ---- */}
      {porDia.length === 0 ? (
        <div className="card">
          <EmptyState
            title={searchTerm || dateFilter || statusFilter !== 'all' ? 'Nenhum agendamento com esses filtros' : 'Nenhum agendamento ainda'}
            description={
              searchTerm || dateFilter || statusFilter !== 'all'
                ? 'Tente limpar a busca, a data ou o status para ver mais.'
                : 'Quando uma cliente marcar pela sua página, o horário aparece aqui.'
            }
            action={
              (searchTerm || dateFilter || statusFilter !== 'all') ? (
                <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(''); setDateFilter(''); setStatusFilter('all'); }}>
                  Limpar filtros
                </Button>
              ) : (
                <Button size="sm" onClick={openNew} leadingIcon={<Plus className="h-4 w-4" />}>Novo agendamento</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="space-y-6">
          {porDia.map(({ iso, rotulo, apps }) => (
            <section key={iso}>
              {/* Cabeçalho do dia: gruda no topo enquanto o dia rola. */}
              <div className="sticky top-[52px] lg:top-16 z-10 -mx-4 px-4 lg:mx-0 lg:px-0 py-2 bg-bg/85 backdrop-blur-[20px] flex items-baseline gap-2">
                <h2 className="mono-micro text-n-900">{rotulo}</h2>
                <span className="mono-micro text-n-500">
                  {apps.length} {apps.length === 1 ? 'HORÁRIO' : 'HORÁRIOS'}
                </span>
              </div>

              <div className="card p-0 overflow-hidden mt-1">
                <ul className="divide-y divide-line">
                  {apps.map((app) => {
                    const m = statusMeta(app.status);
                    return (
                      <li key={app.id} className="group relative transition-ui hover:bg-n-25">
                        {/* Barra de 3px do status na aresta esquerda — a mesma
                            gramática do bloco da agenda e da linha do extrato.
                            Ela deixa a lista legível na diagonal, sem precisar
                            ler o selo de cada linha. Absoluta para cobrir também
                            a faixa de ações do mobile. */}
                        <span className={`absolute left-0 top-0 bottom-0 w-[3px] ${m.bar}`} aria-hidden />
                        <div className="flex items-start gap-4 p-4 pl-5 min-w-0">
                          {/* Horário: coluna fixa, dígito de largura fixa —
                              é por ele que a lista é lida de cima a baixo. */}
                          <span className="mono shrink-0 w-[52px] text-body-sm text-heading pt-0.5">
                            {app.start_time.substring(0, 5)}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="text-body-sm font-semibold text-heading truncate">{app.client_name}</p>
                            <p className="mono-micro text-n-500 truncate mt-1">
                              {apptServiceLabel(app)} · {realDurationMin(app)}MIN
                              {apptTotalCents(app) > 0 ? ` · ${formatPriceBRL(apptTotalCents(app))}` : ''}
                            </p>
                            {app.notes && (
                              <p className="mt-1.5 text-caption text-n-600 border-l-2 border-wine-200 pl-2">
                                {app.notes}
                              </p>
                            )}
                            {app.cancellation_reason && (
                              <p className="mt-1.5 text-caption text-n-500">Motivo: {app.cancellation_reason}</p>
                            )}
                          </div>

                          {/* Ações e status na MESMA faixa, à direita.
                              Empilhadas embaixo do texto com `opacity-0`, elas
                              continuavam ocupando altura: cada linha media
                              ~165px e cabiam quatro na tela. Aqui elas trocam
                              de lugar com o selo no hover — a linha volta a
                              ter a altura do seu conteúdo. */}
                          <div className="shrink-0 flex items-center gap-2 self-center">
                            <div className="hidden lg:flex items-center gap-1.5 opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-within:opacity-100">
                              <AppointmentActions app={app} />
                            </div>
                            <StatusPill tone={m.tone} className="shrink-0 lg:group-hover:hidden lg:group-focus-within:hidden">
                              {m.label}
                            </StatusPill>
                          </div>
                        </div>
                        {/* Em ponteiro grosso não existe hover: as ações ficam
                            visíveis, numa faixa própria abaixo da linha. */}
                        <div className="lg:hidden flex items-center gap-1.5 flex-wrap px-5 pb-3 -mt-1">
                          <AppointmentActions app={app} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}


      {/* Modal de Cancelamento */}
      {showCancelDialog && selectedApp && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowCancelDialog(false)} />
          <div className="relative card p-6 max-w-md w-full mx-4 z-10 animate-fade-up">
            <h3 className="text-h3 font-semibold text-ink tracking-tight">Cancelar Agendamento</h3>
            <p className="mt-2 text-caption text-n-600 leading-relaxed">
              Você está prestes a cancelar o agendamento de <strong className="text-ink">{selectedApp.client_name}</strong> em{' '}
              {formatDateBR(selectedApp.date)} às {selectedApp.start_time.substring(0, 5)}.
            </p>

            <div className="mt-4">
              <label className="mono-micro text-n-500 block mb-1.5">Motivo (opcional)</label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={2}
                placeholder="Ex: imprevisto, readequação de agenda..."
                className="field-input"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setShowCancelDialog(false)} className="px-4 py-2 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Voltar</button>
              <button
                onClick={() => { handleCancelWhatsApp(selectedApp, cancellationReason); handleUpdateStatus(selectedApp.id, 'cancelled', cancellationReason); }}
                disabled={updatingId === selectedApp.id}
                className="px-4 py-2 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95"
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
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowNew(false)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-semibold text-ink tracking-tight">Novo agendamento</h3>
              <button onClick={() => setShowNew(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>

            {activeServices.length === 0 ? (
              <p className="text-label text-n-600 py-6 text-center">
                Cadastre ao menos um serviço para criar agendamentos manuais.
              </p>
            ) : (
              <form onSubmit={createManual} className="space-y-3">
                {!nAllowOverlap ? (
                  <>
                    <div className="relative">
                      <label className="mono-micro text-n-500 block mb-1.5">Cliente *</label>
                      <input
                        required
                        autoComplete="off"
                        value={nName}
                        onChange={(e) => { setNName(e.target.value); setShowSuggestions(true); }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        placeholder="Buscar cliente cadastrada ou digitar nome"
                        className="field-input"
                      />
                      {showSuggestions && clientSuggestions.length > 0 && (
                        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-n-200 rounded-xl shadow-glow max-h-48 overflow-y-auto">
                          {clientSuggestions.map(c => (
                            <li key={c.id} onMouseDown={() => { setNName(c.name); setNPhone(c.whatsapp); setShowSuggestions(false); }}
                              className="flex items-center justify-between px-3 py-2.5 hover:bg-n-50 cursor-pointer">
                              <span className="text-label font-semibold text-ink">{c.name}</span>
                              <span className="text-caption text-n-600 ml-2">{c.whatsapp}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label className="mono-micro text-n-500 block mb-1.5">WhatsApp *</label>
                      <input required inputMode="tel" value={nPhone} onChange={(e) => setNPhone(e.target.value)} placeholder="11999999999"
                        className="field-input" />
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block mono-micro text-n-500">Clientes *</label>
                      <span className="text-caption font-semibold text-wine-700 bg-wine-50 px-2 py-0.5 rounded-full">
                        {nClients.filter(c => c.name.trim()).length} cliente{nClients.filter(c => c.name.trim()).length !== 1 ? 's' : ''} neste horário
                      </span>
                    </div>
                    <div className="space-y-2">
                      {nClients.map((client, idx) => {
                        const rowSuggestions = getSuggestions(client.name);
                        return (
                          <div key={idx} className="flex gap-1.5 items-start">
                            <span className="text-caption font-bold text-n-600 mt-3.5 w-5 shrink-0 text-right">{idx + 1}.</span>
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
                                className="block w-full px-2.5 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                              />
                              {activeSuggestionIdx === idx && rowSuggestions.length > 0 && (
                                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-n-200 rounded-xl shadow-glow max-h-40 overflow-y-auto">
                                  {rowSuggestions.map(c => (
                                    <li key={c.id}
                                      onMouseDown={() => {
                                        const updated = nClients.map((cl, i) => i === idx ? { name: c.name, phone: c.whatsapp } : cl);
                                        setNClients(updated); setActiveSuggestionIdx(null);
                                      }}
                                      className="flex items-center justify-between px-3 py-2 hover:bg-n-50 cursor-pointer">
                                      <span className="text-label font-semibold text-ink">{c.name}</span>
                                      <span className="text-caption text-n-600 ml-2">{c.whatsapp}</span>
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
                                className="block w-full px-2.5 py-2.5 bg-n-50 border border-n-200 rounded-xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700"
                              />
                            </div>
                            {nClients.length > 2 && (
                              <button type="button"
                                onClick={() => setNClients(nClients.filter((_, i) => i !== idx))}
                                className="mt-2 p-1.5 text-n-600 hover:text-danger rounded-lg hover:bg-n-50 transition-colors shrink-0">
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button type="button"
                      onClick={() => setNClients([...nClients, { name: '', phone: '' }])}
                      className="mt-2 inline-flex items-center gap-1.5 text-caption font-bold text-wine-700 hover:text-wine-800 transition-colors">
                      <Plus className="h-3.5 w-3.5" /> Adicionar outra cliente
                    </button>
                  </div>
                )}
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Serviços * <span className="text-n-400 normal-case font-medium">(pode escolher mais de um)</span></label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {activeServices.map(s => {
                      const sel = nServiceIds.includes(s.id);
                      return (
                        <button key={s.id} type="button" onClick={() => toggleService(s.id)}
                          className={`flex items-center justify-between py-2 px-3 rounded-xl text-caption font-semibold border transition-ui text-left ${
                            sel ? 'bg-wine-700 text-white border-wine-700' : 'bg-white text-n-600 border-n-200 hover:border-wine-700/40'
                          }`}>
                          <span>{s.name} · {s.duration_minutes} min</span>
                          <span className={sel ? 'text-white/90' : 'text-n-400'}>{formatPriceBRL(s.price_cents)}</span>
                        </button>
                      );
                    })}
                  </div>
                  {nServiceIds.length > 0 && (
                    <p className="text-caption font-bold text-wine-700 mt-1.5">
                      Total: {formatPriceBRL(nTotalCents)} · {nServiceIds.length} serviço{nServiceIds.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mono-micro text-n-500 block mb-1.5">Data *</label>
                    <input required type="date" value={nDate} onChange={(e) => setNDate(e.target.value)}
                      className="field-input" />
                  </div>
                  <div>
                    <label className="mono-micro text-n-500 block mb-1.5">Início *</label>
                    <input required type="time" value={nTime} onChange={(e) => setNTime(e.target.value)}
                      className="field-input" />
                  </div>
                </div>
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Duração deste atendimento (min) *</label>
                  <input required type="number" min={5} step={5} value={nDuration}
                    onChange={(e) => { setNDurationTouched(true); setNDuration(Math.max(5, parseInt(e.target.value, 10) || 0)); }}
                    className="field-input" />
                  <span className="text-caption text-n-400 mt-1 block">
                    Vale só para este agendamento — não altera a duração padrão do serviço.
                    {nTime && nDuration > 0 && (
                      <> Ocupa <strong className="text-ink">{nTime}</strong> → <strong className="text-ink">{addMinutes(nTime, nDuration)}</strong>.</>
                    )}
                  </span>
                </div>
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Forma de pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setNPaymentMethod(nPaymentMethod === method ? '' : method)}
                        className={`py-2 px-3 rounded-xl text-caption font-semibold border transition-ui text-left ${
                          nPaymentMethod === method
                            ? 'bg-wine-700 text-white border-wine-700'
                            : 'bg-white text-n-600 border-n-200 hover:border-wine-700/40'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Observações do atendimento</label>
                  <textarea value={nNotes} onChange={(e) => setNNotes(e.target.value)} rows={2} placeholder="Opcional"
                    className="field-input resize-y" />
                </div>
                <label className="flex items-start gap-2.5 cursor-pointer select-none rounded-xl border border-n-200 bg-n-50 px-3 py-2.5">
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
                  <span className="text-caption text-ink leading-snug">
                    <span className="font-bold">Permitir horário simultâneo</span>
                    <span className="text-n-600"> — agenda mais de uma cliente no mesmo horário (ex.: procedimentos em grupo)</span>
                  </span>
                </label>
                <div className="flex justify-end gap-2.5 pt-1">
                  <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2.5 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Cancelar</button>
                  <button type="submit" disabled={savingNew} className="tap px-4 py-2.5 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                    {savingNew ? 'Salvando…' : 'Criar agendamento'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        </Portal>
      )}

      {/* Modal: Editar agendamento */}
      {editApp && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setEditApp(null)} />
          <div className="relative card w-full sm:max-w-md mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-semibold text-ink tracking-tight">Editar agendamento</h3>
              <button onClick={() => setEditApp(null)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-caption text-n-600 mb-4">Cliente: <strong className="text-ink">{editApp.client_name}</strong></p>

            <div className="space-y-3">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">Serviços * <span className="text-n-400 normal-case font-medium">(pode escolher mais de um)</span></label>
                <div className="grid grid-cols-1 gap-1.5">
                  {activeServices.map(s => {
                    const sel = eServiceIds.includes(s.id);
                    return (
                      <button key={s.id} type="button" onClick={() => toggleEditService(s.id)}
                        className={`flex items-center justify-between py-2 px-3 rounded-xl text-caption font-semibold border transition-ui text-left ${
                          sel ? 'bg-wine-700 text-white border-wine-700' : 'bg-white text-n-600 border-n-200 hover:border-wine-700/40'
                        }`}>
                        <span>{s.name} · {s.duration_minutes} min</span>
                        <span className={sel ? 'text-white/90' : 'text-n-400'}>{formatPriceBRL(s.price_cents)}</span>
                      </button>
                    );
                  })}
                </div>
                {eServiceIds.length > 0 && (
                  <p className="text-caption font-bold text-wine-700 mt-1.5">Total: {formatPriceBRL(eTotalCents)}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Data *</label>
                  <input type="date" value={eDate} onChange={(e) => setEDate(e.target.value)}
                    className="field-input" />
                </div>
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">Início *</label>
                  <input type="time" value={eTime} onChange={(e) => setETime(e.target.value)}
                    className="field-input" />
                </div>
              </div>
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">Duração (min) *</label>
                <input type="number" min={5} step={5} value={eDuration}
                  onChange={(e) => setEDuration(Math.max(5, parseInt(e.target.value, 10) || 0))}
                  className="field-input" />
                {eTime && eDuration > 0 && (
                  <span className="text-caption text-n-400 mt-1 block">Ocupa <strong className="text-ink">{eTime}</strong> → <strong className="text-ink">{addMinutes(eTime, eDuration)}</strong>.</span>
                )}
              </div>
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">Forma de pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(method => (
                    <button key={method} type="button"
                      onClick={() => setEPaymentMethod(ePaymentMethod === method ? '' : method)}
                      className={`py-2 px-3 rounded-xl text-caption font-semibold border transition-ui text-left ${
                        ePaymentMethod === method ? 'bg-wine-700 text-white border-wine-700' : 'bg-white text-n-600 border-n-200 hover:border-wine-700/40'
                      }`}>
                      {method}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">Observações</label>
                <textarea value={eNotes} onChange={(e) => setENotes(e.target.value)} rows={2} placeholder="Opcional"
                  className="field-input resize-y" />
              </div>
              <div className="flex justify-end gap-2.5 pt-1">
                <button type="button" onClick={() => setEditApp(null)} className="px-4 py-2.5 border border-n-200 rounded-xl text-caption font-bold text-n-600 hover:bg-n-50">Cancelar</button>
                <button type="button" onClick={saveEdit} disabled={savingEdit} className="tap px-4 py-2.5 surface-wine text-white text-caption font-bold rounded-xl hover:opacity-95 disabled:opacity-60">
                  {savingEdit ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
        </Portal>
      )}

      {/* Modal: Lixeira de agendamentos */}
      {showTrash && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-sm" onClick={() => setShowTrash(false)} />
          <div className="relative card w-full sm:max-w-lg mx-0 sm:mx-4 rounded-b-none sm:rounded-4xl p-6 z-10 animate-slide-up max-h-[92vh] overflow-y-auto safe-sheet">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-h3 font-semibold text-ink tracking-tight">Lixeira de agendamentos</h3>
              <button onClick={() => setShowTrash(false)} className="p-2 rounded-xl hover:bg-n-50 text-n-600"><X className="h-5 w-5" /></button>
            </div>

            {trashLoading ? (
              <p className="text-label text-n-600 py-8 text-center">Carregando…</p>
            ) : trashedAppts.length === 0 ? (
              <p className="text-label text-n-600 py-8 text-center">A lixeira está vazia.</p>
            ) : (
              <div className="space-y-2">
                {trashedAppts.map(app => (
                  <div key={app.id} className="flex items-center justify-between gap-3 bg-n-50 border border-n-200 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-label font-bold text-ink truncate">{app.client_name}</p>
                      <p className="text-caption text-n-600 truncate">{formatDateBR(app.date)} {app.start_time.substring(0, 5)} · {apptServiceLabel(app)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleRestore(app.id)} disabled={trashBusyId === app.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-success text-white text-caption font-bold hover:opacity-95 disabled:opacity-50">
                        <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                      </button>
                      <button onClick={() => handlePurge(app.id)} disabled={trashBusyId === app.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-n-200 text-danger text-caption font-bold hover:bg-white disabled:opacity-50">
                        <Trash2 className="h-3.5 w-3.5" /> Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </Portal>
      )}
    </div>
  );
};
export default AppointmentsList;
