'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, ProfessionalStatus } from '@/types/database';
import { Search, Edit, ExternalLink, RefreshCw, Power } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateProfessionalStatusAction } from '@/app/actions/admin';
import Link from 'next/link';

interface ProfessionalsTableProps {
  initialProfessionals: Professional[];
}

export const ProfessionalsTable: React.FC<ProfessionalsTableProps> = ({
  initialProfessionals
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Filtragem
  const filteredProfs = initialProfessionals.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const toggleStatus = async (id: string, currentStatus: ProfessionalStatus) => {
    setUpdatingId(id);
    const newStatus: ProfessionalStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateProfessionalStatusAction(id, newStatus);
      if (res.success) {
        success('Alterado!', `Status da profissional alterado para ${newStatus === 'active' ? 'Ativo' : 'Pausado'}.`);
        router.refresh();
      } else {
        error('Falha', res.error || 'Erro ao alterar status.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu um erro de rede.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="text-[10px] font-bold border border-emerald-100 bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5">Ativo</span>;
      case 'paused':
        return <span className="text-[10px] font-bold border border-amber-100 bg-amber-50 text-amber-700 rounded-full px-2.5 py-0.5">Pausado</span>;
      default:
        return <span className="text-[10px] font-bold border border-red-100 bg-red-50 text-red-700 rounded-full px-2.5 py-0.5">Cancelado</span>;
    }
  };

  return (
    <div className="space-y-6 select-none">
      {/* Busca e Filtro */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-[#efe9e6] shadow-xs">
        <div className="relative w-full sm:max-w-xs rounded-xl shadow-xs">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por nome, marca, email, slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
          />
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs font-semibold text-gray-400">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-forest/20"
          >
            <option value="all">Todas as Contas</option>
            <option value="active">Ativas</option>
            <option value="paused">Pausadas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Profissionais */}
      <div className="bg-white border border-[#efe9e6] rounded-3xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#efe9e6] text-left">
            <thead className="bg-[#f4f1ec]/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Profissional</th>
                <th className="px-6 py-4">Slug / Link Público</th>
                <th className="px-6 py-4">WhatsApp / E-mail</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efe9e6] text-sm text-gray-700">
              {filteredProfs.length > 0 ? (
                filteredProfs.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/20 transition-colors">
                    {/* Identidade */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-bold text-gray-800">{p.name}</p>
                        <p className="text-xs text-gray-450 mt-0.5">{p.brand_name}</p>
                      </div>
                    </td>

                    {/* Slug */}
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500">/agendar/{p.slug}</span>
                        <Link
                          href={`/agendar/${p.slug}`}
                          target="_blank"
                          className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-forest transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </td>

                    {/* Contato */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-semibold text-gray-800">{p.whatsapp}</p>
                        <p className="text-xs text-gray-450 mt-0.5">{p.email}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(p.status)}
                    </td>

                    {/* Ações */}
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Ativar/Pausar */}
                        <button
                          disabled={updatingId === p.id}
                          onClick={() => toggleStatus(p.id, p.status)}
                          title={p.status === 'active' ? 'Pausar Operação' : 'Ativar Operação'}
                          className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                            p.status === 'active' 
                              ? 'hover:bg-amber-50 text-amber-600 border-amber-100/50' 
                              : 'hover:bg-emerald-50 text-emerald-600 border-emerald-100/50'
                          }`}
                        >
                          {updatingId === p.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </button>

                        {/* Editar */}
                        <Link
                          href={`/admin/professionals/${p.id}`}
                          title="Editar Cadastro Completo"
                          className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition-all border border-gray-150"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400">
                    Nenhuma profissional cadastrada atende aos filtros de busca.
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
export default ProfessionalsTable;
