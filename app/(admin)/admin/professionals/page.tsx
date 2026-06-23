import React from 'react';
import { requireAdmin } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { LayoutAdmin } from '@/components/layout/LayoutAdmin';
import { ProfessionalsTable } from '@/components/admin/ProfessionalsTable';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';
import { DEMO_PROFESSIONAL_ID } from '@/lib/demo';

export const metadata = {
  title: 'Gerenciar Profissionais | Lume Agenda Admin',
  description: 'Visualize, ative, pause e edite as contas das profissionais de estética cadastradas na plataforma.'
};

export default async function AdminProfessionalsPage() {
  const session = await requireAdmin();
  const [allProfessionals, trashed] = await Promise.all([
    dbService.getProfessionals(),
    dbService.getTrashedProfessionals().catch(() => []),
  ]);

  // Exclui a conta teste (Amanda) dos dados do super admin
  const professionals = allProfessionals.filter(p => p.id !== DEMO_PROFESSIONAL_ID);

  return (
    <LayoutAdmin 
      session={session} 
      title="Profissionais Cadastradas" 
      subtitle="Lista de profissionais que utilizam o Lume Agenda. Gerencie permissões, links e status de operação."
    >
      <div className="space-y-6 select-none">
        {/* Topo com botão */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-forest">
            <Users className="h-5 w-5" />
            <span className="text-sm font-bold">{professionals.length} cadastradas no total</span>
          </div>
          <Link
            href="/admin/professionals/new"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar Profissional</span>
          </Link>
        </div>

        {/* Tabela de Dados */}
        <ProfessionalsTable initialProfessionals={professionals} initialTrashed={trashed} />
      </div>
    </LayoutAdmin>
  );
}
