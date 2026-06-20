'use client';

import React, { useMemo, useState } from 'react';
import { Service } from '@/types/database';
import { X, Save, CalendarPlus, Clock, Layers } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useToast } from '../ui/Toast';
import { createManualAppointmentAction } from '@/app/actions/booking';
import { sumDurationMinutes } from '@/lib/appointments/services';
import { normalizeWhatsapp } from '@/lib/whatsapp';

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Não sei ainda'];

interface QuickAppointmentModalProps {
  professionalId: string;
  services: Service[];
  initialDate: string;        // "YYYY-MM-DD"
  initialTime?: string;       // "HH:MM"
  onClose: () => void;
  onCreated: () => void;
}

/**
 * Modal enxuto para a profissional encaixar uma cliente direto da agenda,
 * sem ir à aba de Agendamentos. Reaproveita createManualAppointmentAction.
 */
export const QuickAppointmentModal: React.FC<QuickAppointmentModalProps> = ({
  professionalId, services, initialDate, initialTime, onClose, onCreated,
}) => {
  const { success, error } = useToast();
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime || '');
  const [duration, setDuration] = useState<number>(60);
  const [durationTouched, setDurationTouched] = useState(false);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleService = (id: string) => {
    setServiceIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (!durationTouched) {
        const sel = activeServices.filter(s => next.includes(s.id));
        setDuration(sel.length ? sumDurationMinutes(sel) : 60);
      }
      return next;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceIds.length) { error('Atenção', 'Selecione ao menos um serviço.'); return; }
    if (!name.trim() || !phone.trim()) { error('Atenção', 'Preencha nome e WhatsApp da cliente.'); return; }
    if (!date || !time) { error('Atenção', 'Defina data e horário.'); return; }

    setSaving(true);
    try {
      const res = await createManualAppointmentAction({
        professionalId,
        serviceId: serviceIds[0],
        serviceIds,
        clientName: name.trim(),
        clientWhatsapp: normalizeWhatsapp(phone),
        date,
        startTime: time,
        durationMinutes: duration,
        notes: notes.trim() || undefined,
        allowOverlap,
        paymentMethod: paymentMethod || undefined,
      });
      if (res.success) {
        success('Agendamento criado!', 'O horário foi reservado na sua agenda.');
        onCreated();
      } else {
        error('Não foi possível agendar', res.error || 'Verifique os dados e tente novamente.');
      }
    } catch {
      error('Erro', 'Falha ao criar o agendamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-[#1a0e12]/30 backdrop-blur-xs" onClick={() => !saving && onClose()} />

        <form
          onSubmit={handleSave}
          className="relative bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl w-full sm:max-w-lg mx-0 sm:mx-4 border border-[#efe9e6] z-10 space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center border-b border-gray-100 pb-3">
            <h3 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-1.5">
              <CalendarPlus className="h-4.5 w-4.5 text-forest" />
              <span>Encaixar cliente</span>
            </h3>
            <button type="button" disabled={saving} onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Cliente *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome da cliente"
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">WhatsApp *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5515999999999" inputMode="tel"
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest" />
            </div>
          </div>

          {/* Serviços */}
          <div>
            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Serviço(s) *
            </label>
            {activeServices.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Nenhum serviço ativo cadastrado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {activeServices.map(s => {
                  const on = serviceIds.includes(s.id);
                  return (
                    <button type="button" key={s.id} onClick={() => toggleService(s.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${on ? 'bg-forest text-white border-forest' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-forest/40'}`}>
                      {s.name} <span className="opacity-70 font-semibold">· {s.duration_minutes}min</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Data / Hora / Duração */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Data *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="block w-full px-2 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Horário *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="block w-full px-2 py-2.5 border border-gray-200 rounded-xl text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Min</label>
              <input type="number" min={5} step={5} value={duration}
                onChange={e => { setDurationTouched(true); setDuration(Math.max(5, parseInt(e.target.value) || 0)); }}
                className="block w-full px-2 py-2.5 border border-gray-200 rounded-xl text-xs text-center font-bold focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest" />
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Forma de pagamento (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(method => (
                <button type="button" key={method} onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${paymentMethod === method ? 'bg-forest text-white border-forest' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-forest/40'}`}>
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">Observações (opcional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes do atendimento..."
              className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest resize-none" />
          </div>

          {/* Encaixe (sobreposição) */}
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer">
            <input type="checkbox" checked={allowOverlap} onChange={e => setAllowOverlap(e.target.checked)} className="accent-forest h-4 w-4" />
            Permitir encaixe mesmo com outro agendamento no horário
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
            <button type="button" disabled={saving} onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
};

export default QuickAppointmentModal;
