'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, MessageCircle, X, CheckCircle2, XCircle, UserX, CalendarClock, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { BulkActionsBar } from '@/components/ui/TableSelection';
import { setAppointmentStatusAction, rescheduleAppointmentAction } from '@/app/actions/admin-operations';
import { AppointmentStatusBadge } from './badges';
import { brl, formatDateBR, formatDateTimeBR, formatTimeBR } from '@/lib/format';
import { buildWhatsappLink } from '@/lib/whatsapp';
import type { AppointmentRow } from '@/lib/admin/queries';

/** Botão "…" de cada linha: abre o painel de detalhe do agendamento. */
export function AppointmentDetailButton({ row }: { row: AppointmentRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-label={`Abrir ${row.clientName}`}
        className="icon-chip h-8 w-8"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && <AppointmentDrawer row={row} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * Painel lateral de detalhe. É a tela que faltava: até aqui o admin via 340 linhas e
 * a única ação disponível era abrir o WhatsApp.
 */
function AppointmentDrawer({ row, onClose }: { row: AppointmentRow; onClose: () => void }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(row.date);
  const [time, setTime] = useState(formatTimeBR(row.startTime));

  const act = async (fn: () => Promise<{ success: boolean; error?: string }>, msg: string) => {
    setBusy(true);
    const res = await fn();
    setBusy(false);
    if (res.success) { success('Pronto', msg); router.refresh(); onClose(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  const btn = 'inline-flex items-center gap-1.5 h-9 px-3.5 text-caption font-semibold rounded-full bg-surface text-heading ring-1 ring-inset ring-line-strong/70 shadow-[var(--shadow-xs)] hover:bg-n-25 hover:ring-line-strong transition-ui disabled:opacity-50';
  const row2 = 'flex items-center justify-between gap-3 py-2 border-b border-line text-caption';

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true" aria-label="Detalhe do agendamento">
      <div className="absolute inset-0 sheet-backdrop" onClick={onClose} />
      <aside className="relative w-full max-w-md h-full bg-surface shadow-[var(--shadow-lg)] overflow-y-auto animate-slide-right">
        <header className="sticky top-0 bg-surface border-b border-line px-5 py-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-label text-heading truncate">{row.clientName}</h2>
            <p className="text-caption text-n-500">{formatDateBR(row.date)} às {formatTimeBR(row.startTime)}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="icon-chip h-8 w-8"><X className="h-4 w-4" /></button>
        </header>

        <div className="p-4 space-y-4">
          <dl className="text-caption">
            <div className={row2}><dt className="text-n-500">Status</dt><dd><AppointmentStatusBadge status={row.status} /></dd></div>
            <div className={row2}><dt className="text-n-500">Profissional</dt><dd className="font-semibold text-ink">{row.professionalName}</dd></div>
            <div className={row2}><dt className="text-n-500">Serviço</dt><dd className="font-semibold text-ink">{row.serviceName}</dd></div>
            <div className={row2}><dt className="text-n-500">Valor</dt><dd className="font-semibold text-ink num">{brl(row.priceCents)}</dd></div>
            <div className={row2}><dt className="text-n-500">Horário</dt><dd className="num text-ink">{formatTimeBR(row.startTime)}–{formatTimeBR(row.endTime)}</dd></div>
            <div className={row2}><dt className="text-n-500">WhatsApp</dt><dd className="num text-ink">{row.clientWhatsapp}</dd></div>
            <div className={row2}><dt className="text-n-500">Origem</dt><dd className="text-ink">{row.origin}</dd></div>
            <div className={row2}><dt className="text-n-500">Criado em</dt><dd className="num text-ink">{formatDateTimeBR(row.createdAt)}</dd></div>
            {row.notes && <div className="py-2 text-caption"><dt className="text-n-500 mb-1">Observações</dt><dd className="text-ink">{row.notes}</dd></div>}
            {row.cancellationReason && <div className="py-2 text-caption"><dt className="text-n-500 mb-1">Motivo do cancelamento</dt><dd className="text-ink">{row.cancellationReason}</dd></div>}
          </dl>

          <section>
            <h3 className="text-caption font-semibold text-n-600 mb-2">Mudar status</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={busy} className={btn} onClick={() => act(() => setAppointmentStatusAction([row.id], 'confirmed'), 'Confirmado.')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar
              </button>
              <button type="button" disabled={busy} className={btn} onClick={() => act(() => setAppointmentStatusAction([row.id], 'completed'), 'Marcado como finalizado.')}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Finalizar
              </button>
              <button type="button" disabled={busy} className={btn} onClick={() => act(() => setAppointmentStatusAction([row.id], 'no_show'), 'Marcado como falta.')}>
                <UserX className="h-3.5 w-3.5" /> Falta
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-caption font-semibold text-n-600 mb-2">Remarcar</h3>
            <div className="flex items-center gap-2">
              <input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Nova data"
                className="h-9 px-2 rounded-chip bg-surface-2 text-caption text-ink" />
              <input type="time" value={time} onChange={e => setTime(e.target.value)} aria-label="Novo horário"
                className="h-9 px-2 rounded-chip bg-surface-2 text-caption text-ink" />
              <button type="button" disabled={busy} className={btn} onClick={() => act(() => rescheduleAppointmentAction(row.id, date, time), 'Remarcado.')}>
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />} Aplicar
              </button>
            </div>
          </section>

          <section>
            <h3 className="text-caption font-semibold text-n-600 mb-2">Cancelar</h3>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (fica registrado)"
              className="w-full h-9 px-3 rounded-chip bg-surface-2 text-caption text-ink mb-2" />
            <button type="button" disabled={busy}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-caption font-semibold text-danger hover:bg-danger-bg transition-ui disabled:opacity-50"
              onClick={() => act(() => setAppointmentStatusAction([row.id], 'cancelled', reason), 'Cancelado.')}>
              <XCircle className="h-3.5 w-3.5" /> Cancelar agendamento
            </button>
          </section>

          <a href={buildWhatsappLink(row.clientWhatsapp, '')} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-caption font-semibold text-success bg-success-bg hover:bg-success hover:text-white transition-ui">
            <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp da cliente
          </a>
        </div>
      </aside>
    </div>
  );
}

/** Ações em massa da lista de agendamentos. */
export function AppointmentBulkActions() {
  const router = useRouter();
  const after = <T,>(r: T) => { router.refresh(); return r; };
  return (
    <BulkActionsBar
      noun="agendamento"
      actions={[
        { label: 'Confirmar', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onRun: ids => setAppointmentStatusAction(ids, 'confirmed').then(after) },
        { label: 'Finalizar', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onRun: ids => setAppointmentStatusAction(ids, 'completed').then(after) },
        { label: 'Falta', icon: <UserX className="h-3.5 w-3.5" />, onRun: ids => setAppointmentStatusAction(ids, 'no_show').then(after) },
        { label: 'Cancelar', icon: <XCircle className="h-3.5 w-3.5" />, destructive: true, onRun: ids => setAppointmentStatusAction(ids, 'cancelled', 'Cancelado em massa pelo administrador').then(after) },
      ]}
    />
  );
}
