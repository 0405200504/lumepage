'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, ProfessionalStatus } from '@/types/database';
import { Search, Edit, ExternalLink, RefreshCw, Power, Trash2, X, AlertTriangle, RotateCcw, Inbox } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateProfessionalStatusAction, deleteProfessionalAction, restoreProfessionalAction, purgeProfessionalAction } from '@/app/actions/admin';
import Link from 'next/link';

interface ProfessionalsTableProps {
  initialProfessionals: Professional[];
  initialTrashed?: Professional[];
}

export const ProfessionalsTable: React.FC<ProfessionalsTableProps> = ({
  initialProfessionals, initialTrashed = [],
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [tab, setTab] = useState<'active' | 'trash'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  // Mover para a lixeira (reversível)
  const [trashTarget, setTrashTarget] = useState<Professional | null>(null);
  const [trashing, setTrashing] = useState(false);

  // Excluir DEFINITIVAMENTE (da lixeira, irreversível)
  const [purgeTarget, setPurgeTarget] = useState<Professional | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [purging, setPurging] = useState(false);

  const moveToTrash = async () => {
    if (!trashTarget) return;
    setTrashing(true);
    try {
      const res = await deleteProfessionalAction(trashTarget.id);
      if (res.success) {
        success('Movida para a lixeira', `${trashTarget.brand_name} pode ser restaurada na aba Lixeira.`);
        setTrashTarget(null);
        router.refresh();
      } else {
        error('Falha', res.error || 'Não foi possível mover para a lixeira.');
      }
    } catch {
      error('Erro', 'Ocorreu um erro ao mover para a lixeira.');
    } finally {
      setTrashing(false);
    }
  };

  const restore = async (p: Professional) => {
    setRestoringId(p.id);
    try {
      const res = await restoreProfessionalAction(p.id);
      if (res.success) {
        success('Restaurada', `${p.brand_name} voltou para a lista ativa.`);
        router.refresh();
      } else {
        error('Falha', res.error || 'Não foi possível restaurar.');
      }
    } catch {
      error('Erro', 'Ocorreu um erro ao restaurar.');
    } finally {
      setRestoringId(null);
    }
  };

  const purge = async () => {
    if (!purgeTarget) return;
    setPurging(true);
    try {
      const res = await purgeProfessionalAction(purgeTarget.id);
      if (res.success) {
        success('Excluída', `${purgeTarget.brand_name} e todos os dados foram removidos definitivamente.`);
        setPurgeTarget(null);
        setConfirmText('');
        router.refresh();
      } else {
        error('Falha', res.error || 'Não foi possível excluir.');
      }
    } catch {
      error('Erro', 'Ocorreu um erro ao excluir.');
    } finally {
      setPurging(false);
    }
  };

  const filteredProfs = initialProfessionals.filter(p => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(s) || p.brand_name.toLowerCase().includes(s) ||
      p.email.toLowerCase().includes(s) || p.slug.toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleStatus = async (id: string, currentStatus: ProfessionalStatus) => {
    setUpdatingId(id);
    const newStatus: ProfessionalStatus = currentStatus === 'active' ? 'paused' : 'active';
    try {
      const res = await updateProfessionalStatusAction(id, newStatus);
      if (res.success) {
        success('Alterado!', `Status alterado para ${newStatus === 'active' ? 'Ativo' : 'Pausado'}.`);
        router.refresh();
      } else {
        error('Falha', res.error || 'Erro ao alterar status.');
      }
    } catch {
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

  const fmtDate = (iso?: string | null) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="space-y-6 select-none">
      {/* Abas Ativas / Lixeira */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setTab('active')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${tab === 'active' ? 'bg-forest text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
        >
          Ativas ({initialProfessionals.length})
        </button>
        <button
          onClick={() => setTab('trash')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5 ${tab === 'trash' ? 'bg-[#b23a48] text-white shadow-xs' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'}`}
        >
          <Inbox className="h-3.5 w-3.5" /> Lixeira ({initialTrashed.length})
        </button>
      </div>

      {tab === 'active' && (
        <>
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-bold text-gray-800">{p.name}</p>
                            <p className="text-xs text-gray-450 mt-0.5">{p.brand_name}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-mono text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-gray-500">/agendar/{p.slug}</span>
                            <Link href={`/agendar/${p.slug}`} target="_blank" className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-forest transition-colors">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-semibold text-gray-800">{p.whatsapp}</p>
                            <p className="text-xs text-gray-450 mt-0.5">{p.email}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(p.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={updatingId === p.id}
                              onClick={() => toggleStatus(p.id, p.status)}
                              title={p.status === 'active' ? 'Pausar Operação' : 'Ativar Operação'}
                              className={`p-2 rounded-xl transition-colors cursor-pointer border ${p.status === 'active' ? 'hover:bg-amber-50 text-amber-600 border-amber-100/50' : 'hover:bg-emerald-50 text-emerald-600 border-emerald-100/50'}`}
                            >
                              {updatingId === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                            </button>
                            <Link href={`/admin/professionals/${p.id}`} title="Editar Cadastro Completo" className="p-2 hover:bg-gray-100 text-gray-500 rounded-xl transition-all border border-gray-150">
                              <Edit className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => setTrashTarget(p)}
                              title="Mover para a lixeira"
                              className="p-2 hover:bg-[#b23a48]/10 text-[#b23a48] rounded-xl transition-all border border-[#b23a48]/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan={5} className="py-12 text-center text-xs text-gray-400">Nenhuma profissional atende aos filtros de busca.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'trash' && (
        <div className="bg-white border border-[#efe9e6] rounded-3xl shadow-xs overflow-hidden">
          {initialTrashed.length === 0 ? (
            <div className="py-16 text-center">
              <Inbox className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-xs text-gray-400">A lixeira está vazia.</p>
              <p className="text-[11px] text-gray-400 mt-1">Profissionais excluídas ficam aqui e podem ser restauradas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#efe9e6] text-left">
                <thead className="bg-[#f4f1ec]/40 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Profissional</th>
                    <th className="px-6 py-4">WhatsApp / E-mail</th>
                    <th className="px-6 py-4">Excluída em</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efe9e6] text-sm text-gray-700">
                  {initialTrashed.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/20 transition-colors opacity-90">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="font-bold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-450 mt-0.5">{p.brand_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-semibold text-gray-800">{p.whatsapp}</p>
                        <p className="text-xs text-gray-450 mt-0.5">{p.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">{fmtDate(p.deleted_at)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={restoringId === p.id}
                            onClick={() => restore(p)}
                            title="Restaurar"
                            className="px-3 py-2 inline-flex items-center gap-1.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-emerald-100/60 text-xs font-bold cursor-pointer"
                          >
                            {restoringId === p.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Restaurar
                          </button>
                          <button
                            onClick={() => { setPurgeTarget(p); setConfirmText(''); }}
                            title="Excluir definitivamente"
                            className="p-2 hover:bg-[#b23a48]/10 text-[#b23a48] rounded-xl transition-all border border-[#b23a48]/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal: mover para a lixeira (reversível) */}
      {trashTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={() => !trashing && setTrashTarget(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full z-10 border border-[#efe9e6] shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-600"><Inbox className="h-5 w-5" /></div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Mover para a lixeira</h3>
              </div>
              <button onClick={() => !trashing && setTrashTarget(null)} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              <strong className="text-gray-800">{trashTarget.brand_name}</strong> sairá da lista ativa e a página pública dela ficará fora do ar.
              Os dados são <strong className="text-emerald-600">preservados</strong> — você pode <strong>restaurar</strong> a qualquer momento na aba Lixeira.
            </p>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setTrashTarget(null)} disabled={trashing} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={moveToTrash} disabled={trashing} className="px-4 py-2 bg-amber-500 hover:opacity-95 text-white text-xs font-bold rounded-xl disabled:opacity-40 flex items-center gap-1.5">
                {trashing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
                {trashing ? 'Movendo...' : 'Mover para a lixeira'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: excluir definitivamente (irreversível) */}
      {purgeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#1a0e12]/45 backdrop-blur-sm" onClick={() => !purging && setPurgeTarget(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full z-10 border border-[#efe9e6] shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#b23a48]/10 text-[#b23a48]"><AlertTriangle className="h-5 w-5" /></div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Excluir definitivamente</h3>
              </div>
              <button onClick={() => !purging && setPurgeTarget(null)} className="p-2 rounded-xl hover:bg-gray-50 text-gray-400"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Isso remove <strong className="text-gray-800">{purgeTarget.brand_name}</strong> e <strong className="text-[#b23a48]">tudo</strong> vinculado:
              login, agendamentos, clientes, serviços e financeiro. <strong>Esta ação NÃO tem volta.</strong>
            </p>
            <div className="mt-4">
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                Para confirmar, digite o nome: <span className="text-gray-800">{purgeTarget.name}</span>
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={purgeTarget.name}
                className="block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#b23a48]/20 focus:border-[#b23a48]"
              />
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button onClick={() => setPurgeTarget(null)} disabled={purging} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button
                onClick={purge}
                disabled={purging || confirmText.trim() !== purgeTarget.name}
                className="px-4 py-2 bg-[#b23a48] hover:opacity-95 text-white text-xs font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {purging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {purging ? 'Excluindo...' : 'Excluir definitivamente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProfessionalsTable;
