'use client';

import React, { useState } from 'react';
import { Client } from '@/types/database';
import { Search, Phone, History, MessageCircle, Calendar } from 'lucide-react';

interface ClientsListProps {
  initialClients: Client[];
}

export const ClientsList: React.FC<ClientsListProps> = ({
  initialClients
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtragem
  const filteredClients = initialClients.filter(c => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleWhatsApp = (client: Client) => {
    const cleanPhone = client.whatsapp.replace(/\D/g, '');
    window.open(`https://wa.me/55${cleanPhone}`, '_blank');
  };

  return (
    <div className="space-y-6 select-none">
      {/* Barra de Filtro */}
      <div className="flex bg-white p-4 rounded-3xl border border-[#e4e9e6] shadow-xs">
        <div className="relative w-full sm:max-w-xs rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, whatsapp, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
        </div>
      </div>

      {/* Tabela de Clientes */}
      <div className="bg-white border border-[#e4e9e6] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#e4e9e6] text-left">
            <thead className="bg-[#f4f6f5]/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contato / WhatsApp</th>
                <th className="px-6 py-4">Fidelidade (Agendamentos)</th>
                <th className="px-6 py-4">Última Visita</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e4e9e6] text-sm text-gray-700">
              {filteredClients.length > 0 ? (
                filteredClients.map((client) => {
                  const lastVisit = client.last_appointment_at 
                    ? new Date(client.last_appointment_at).toLocaleDateString('pt-BR') 
                    : 'Nunca';
                  
                  return (
                    <tr key={client.id} className="hover:bg-gray-50/20 transition-colors">
                      {/* Cliente */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-gray-800">{client.name}</p>
                          {client.email && <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>}
                        </div>
                      </td>

                      {/* Contato */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-850">{client.whatsapp}</span>
                      </td>

                      {/* Fidelidade */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-forest bg-forest/5 px-2.5 py-0.5 rounded-full text-xs">
                          {client.total_appointments || 0} visitas
                        </span>
                      </td>

                      {/* Última Visita */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-600">
                        {lastVisit}
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleWhatsApp(client)}
                          title="Falar no WhatsApp"
                          className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-emerald-100/50 cursor-pointer"
                        >
                          <MessageCircle className="h-4.5 w-4.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                    Nenhum cliente cadastrado na sua carteira de atendimento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default ClientsList;
