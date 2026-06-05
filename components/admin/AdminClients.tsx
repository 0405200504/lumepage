'use client';

import React, { useMemo, useState } from 'react';
import { Search, MessageCircle } from 'lucide-react';
import { buildWhatsappLink, formatDateBR } from '@/lib/whatsapp';

interface Item {
  id: string; name: string; whatsapp: string; email: string | null;
  professional_id: string; professional_name: string;
  visits: number; noShows: number; last: string | null;
}

interface Props {
  items: Item[];
  professionals: { id: string; name: string }[];
}

export const AdminClients: React.FC<Props> = ({ items, professionals }) => {
  const [search, setSearch] = useState('');
  const [profFilter, setProfFilter] = useState('all');

  const filtered = useMemo(() => items.filter(c => {
    const s = search.toLowerCase();
    const matchSearch = c.name.toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s) || c.whatsapp.includes(search) || c.professional_name.toLowerCase().includes(s);
    const matchProf = profFilter === 'all' || c.professional_id === profFilter;
    return matchSearch && matchProf;
  }), [items, search, profFilter]);

  return (
    <div className="space-y-5 select-none animate-fade-up">
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between card p-4">
        <div className="relative w-full lg:max-w-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-gray-450" /></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente, e-mail, profissional..."
            className="block w-full pl-9 pr-3 py-2.5 bg-cream/60 border border-gray-150 rounded-xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700" />
        </div>
        <select value={profFilter} onChange={e => setProfFilter(e.target.value)} className="text-xs font-semibold text-ink bg-cream/60 border border-gray-150 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-wine-700/15">
          <option value="all">Todas as profissionais</option>
          {professionals.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <p className="text-xs font-bold text-gray-450 px-1">{filtered.length} cliente(s)</p>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-150 text-left">
            <thead className="bg-cream/60 text-[10px] font-black text-gray-450 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4">Visitas / Faltas</th>
                <th className="px-6 py-4">Última visita</th>
                <th className="px-6 py-4 text-right">Contato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 text-sm text-ink">
              {filtered.length > 0 ? filtered.map(c => (
                <tr key={c.id} className="hover:bg-cream/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-ink">{c.name}</p>
                    {c.email && <p className="text-xs text-gray-450">{c.email}</p>}
                    <p className="text-xs text-gray-450">{c.whatsapp}</p>
                  </td>
                  <td className="px-6 py-4 font-semibold text-wine-700">{c.professional_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-wine-700 bg-wine-700/8 px-2.5 py-0.5 rounded-full text-xs">{c.visits} visitas</span>
                    {c.noShows > 0 && <span className="ml-1.5 font-bold text-[#b23a48] bg-[#b23a48]/10 px-2 py-0.5 rounded-full text-xs">{c.noShows} falta{c.noShows > 1 ? 's' : ''}</span>}
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-gray-450">{c.last ? formatDateBR(c.last) : 'Nunca'}</td>
                  <td className="px-6 py-4 text-right">
                    <a href={buildWhatsappLink(c.whatsapp, '')} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 rounded-xl text-[#226045] hover:bg-[#2e7d5b]/10 border border-gray-150 transition-colors"><MessageCircle className="h-4 w-4" /></a>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="py-12 text-center text-xs text-gray-450">Nenhum cliente encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AdminClients;
