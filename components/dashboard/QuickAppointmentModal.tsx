'use client';

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Service, Client } from '@/types/database';
import { X, Save, CalendarPlus, Clock, Layers, UserCheck } from 'lucide-react';
import { Portal } from '../ui/Portal';
import { useToast } from '../ui/Toast';
import { createManualAppointmentAction } from '@/app/actions/booking';
import { sumDurationMinutes } from '@/lib/appointments/services';
import { normalizeWhatsapp } from '@/lib/whatsapp';

const PAYMENT_METHODS = ['PIX', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Não sei ainda'];

interface QuickAppointmentModalProps {
  professionalId: string;
  services: Service[];
  clients: Client[];
  initialDate: string;        // "YYYY-MM-DD"
  initialTime?: string;       // "HH:MM"
  onClose: () => void;
  onCreated: () => void;
}

function formatPhone(phone: string): string {
  const d = (phone || '').replace(/\D/g, '').replace(/^55/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/**
 * Modal enxuto para a profissional encaixar uma cliente direto da agenda,
 * sem ir à aba de Agendamentos. Reaproveita createManualAppointmentAction.
 */
export const QuickAppointmentModal: React.FC<QuickAppointmentModalProps> = ({
  professionalId, services, clients, initialDate, initialTime, onClose, onCreated,
}) => {
  const { success, error } = useToast();
  const activeServices = useMemo(() => services.filter(s => s.is_active), [services]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [pickedClientId, setPickedClientId] = useState<string | null>(null);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  // Clientes que batem com o que foi digitado (nome ou WhatsApp). Sem busca, mostra as mais recentes.
  const suggestions = useMemo(() => {
    const q = name.trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    const base = q
      ? clients.filter(c =>
          c.name.toLowerCase().includes(q) ||
          (digits.length >= 3 && c.whatsapp.replace(/\D/g, '').includes(digits)))
      : clients;
    return base.slice(0, 6);
  }, [clients, name]);

  // Fecha o dropdown ao clicar fora do campo de nome.
  useEffect(() => {
    if (!showSuggestions) return;
    const onDocClick = (e: MouseEvent) => {
      if (nameFieldRef.current && !nameFieldRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showSuggestions]);

  const pickClient = (c: Client) => {
    setName(c.name);
    setPhone(c.whatsapp);
    setPickedClientId(c.id);
    setShowSuggestions(false);
  };
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
        <div className="absolute inset-0 bg-wine-950/45 backdrop-blur-xs" onClick={() => !saving && onClose()} />

        <form
          onSubmit={handleSave}
          className="relative bg-white rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-xl w-full sm:max-w-lg mx-0 sm:mx-4 border border-n-200 z-10 space-y-4 max-h-[92vh] overflow-y-auto"
        >
          <div className="flex justify-between items-center border-b border-n-100 pb-3">
            <h3 className="text-body font-semibold text-n-900 tracking-tight flex items-center gap-1.5">
              <CalendarPlus className="h-4.5 w-4.5 text-wine-700" />
              <span>Encaixar cliente</span>
            </h3>
            <button type="button" disabled={saving} onClick={onClose} className="text-n-400 hover:text-n-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative" ref={nameFieldRef}>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Cliente *</label>
              <input
                value={name}
                onChange={e => { setName(e.target.value); setPickedClientId(null); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Buscar ou digitar nome"
                autoComplete="off"
                className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700" />
              {pickedClientId && (
                <UserCheck className="absolute right-2.5 top-[30px] h-4 w-4 text-wine-700 pointer-events-none" />
              )}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-1 bg-white border border-n-200 rounded-xl shadow-lg max-h-52 overflow-y-auto py-1">
                  {suggestions.map(c => (
                    <li key={c.id}>
                      <button type="button" onClick={() => pickClient(c)}
                        className="w-full text-left px-3 py-2 hover:bg-wine-700/5 transition-colors">
                        <p className="text-caption font-bold text-n-900 truncate">{c.name}</p>
                        <p className="text-caption text-n-400">{formatPhone(c.whatsapp)}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">WhatsApp *</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="5515999999999" inputMode="tel"
                className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700" />
            </div>
          </div>

          {/* Serviços */}
          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Layers className="h-3 w-3" /> Serviço(s) *
            </label>
            {activeServices.length === 0 ? (
              <p className="text-caption text-n-400 italic">Nenhum serviço ativo cadastrado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {activeServices.map(s => {
                  const on = serviceIds.includes(s.id);
                  return (
                    <button type="button" key={s.id} onClick={() => toggleService(s.id)}
                      className={`px-2.5 py-1.5 rounded-xl text-caption font-bold border transition-colors ${on ? 'bg-wine-700 text-white border-wine-700' : 'bg-n-50 text-n-600 border-n-200 hover:border-wine-700/40'}`}>
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
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Data *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="block w-full px-2 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700" />
            </div>
            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Horário *</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="block w-full px-2 py-2.5 border border-n-200 rounded-xl text-caption text-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700" />
            </div>
            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Clock className="h-3 w-3" /> Min</label>
              <input type="number" min={5} step={5} value={duration}
                onChange={e => { setDurationTouched(true); setDuration(Math.max(5, parseInt(e.target.value) || 0)); }}
                className="block w-full px-2 py-2.5 border border-n-200 rounded-xl text-caption text-center font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700" />
            </div>
          </div>

          {/* Pagamento */}
          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Forma de pagamento (opcional)</label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map(method => (
                <button type="button" key={method} onClick={() => setPaymentMethod(paymentMethod === method ? '' : method)}
                  className={`px-2.5 py-1.5 rounded-xl text-caption font-bold border transition-colors ${paymentMethod === method ? 'bg-wine-700 text-white border-wine-700' : 'bg-n-50 text-n-600 border-n-200 hover:border-wine-700/40'}`}>
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">Observações (opcional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Detalhes do atendimento..."
              className="block w-full px-3 py-2 border border-n-200 rounded-xl text-caption placeholder-n-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700 resize-none" />
          </div>

          {/* Encaixe (sobreposição) */}
          <label className="flex items-center gap-2 text-caption font-semibold text-n-600 cursor-pointer">
            <input type="checkbox" checked={allowOverlap} onChange={e => setAllowOverlap(e.target.checked)} className="accent-forest h-4 w-4" />
            Permitir encaixe mesmo com outro agendamento no horário
          </label>

          <div className="pt-3 flex justify-end gap-2 border-t border-n-100">
            <button type="button" disabled={saving} onClick={onClose}
              className="px-4 py-2 border border-n-200 rounded-xl text-caption font-semibold text-n-600 hover:bg-n-50">Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Agendando...' : 'Agendar'}
            </button>
          </div>
        </form>
      </div>
    </Portal>
  );
};

export default QuickAppointmentModal;
