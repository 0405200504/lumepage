'use client';

import React, { useMemo, useState } from 'react';
import { Search, Clock, MessageCircle } from 'lucide-react';
import { AppointmentStatus } from '@/types/database';
import { statusMeta } from '@/lib/appointments/status';
import { buildWhatsappLink, formatDateBR } from '@/lib/whatsapp';

interface Item {
  id: string; date: string; start_time: string; end_time: string;
  client_name: string; client_whatsapp: string; service_name: string;
  status: AppointmentStatus; professional_id: string; professional_name: string;
}

interface Props {
  items: Item[];
  professionals: { id: string; name: string }[];
}

export const AdminAppointments: React.FC<Props> = ({ items, professionals }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [profFilter, setProfFilter] = useState('all');

  const filtered = useMemo(() => items.filter(a => {
    const s = search.toLowerCase();
    const matchSearch = a.client_name.toLowerCase().includes(s) || a.service_name.toLowerCase().includes(s) || a.professional_name.toLowerCase().includes(s) || a.client_whatsapp.includes(search);
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    const matchProf = profFilter === 'all' || a.professional_id === profFilter;
    return matchSearch && matchStatus && matchProf;
  }), [items, search, statusFilter, profFilter]);

  return (
    <div className="space-y-5 select-none animate-fade-up">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between card p-4">
        <div className="relative w-full lg:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-450" /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, serviço, profissional..."
            className="block w-full pl-9 pr-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={profFilter} onChange={e => setProfFilter(e.target.value)} className="text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-700/15">
            <option value="all">Todas as profissionais</option>
            {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-700/15">
            <option value="all">Todos os status</option>
            <option value="pending">Pendentes</option>
            <option value="confirmed">Confirmados</option>
            <option value="completed">Finalizados</option>
            <option value="cancelled">Cancelados</option>
            <option value="no_show">Faltas</option>
          </select>
        </div>
      </div>

      <p className="text-xs font-bold text-gray-450 px-1">{filtered.length} agendamento(s)</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-150 text-left">
            <thead className="bg-cream/60 text-[10px] font-black text-gray-450 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Data e Hora</th>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Serviço</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-sm text-ink">
              {filtered.length > 0 ? filtered.map(a => {
                const m = statusMeta(a.status);
                return (
                  <tr key={a.id} className="hover:bg-cream/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="font-bold text-ink">{formatDateBR(a.date)}</p>
                      <span className="flex items-center gap-1 text-xs text-gray-450 mt-0.5"><Clock className="h-3.5 w-3.5" />{a.start_time.substring(0, 5)}–{a.end_time.substring(0, 5)}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-wine-700">{a.professional_name}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-ink">{a.client_name}</p>
                      <p className="text-xs text-gray-450">{a.client_whatsapp}</p>
                    </td>
                    <td className="px-6 py-4 text-ink">{a.service_name}</td>
                    <td className="px-6 py-4"><span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 ${m.badge}`}>{m.label}</span></td>
                    <td className="px-6 py-4 text-right">
                      <a href={buildWhatsappLink(a.client_whatsapp, '')} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 rounded-xl text-[#226045] hover:bg-[#2e7d5b]/10 border border-gray-150 transition-colors"><MessageCircle className="h-4 w-4" /></a>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="py-12 text-center text-xs text-gray-450">Nenhum agendamento encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AdminAppointments;
