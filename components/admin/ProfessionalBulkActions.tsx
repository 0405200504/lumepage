'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PauseCircle, PlayCircle, CalendarPlus, Trash2 } from 'lucide-react';
import { BulkActionsBar } from '@/components/ui/TableSelection';
import { bulkSetStatusAction, bulkExtendTrialAction, bulkTrashAction } from '@/app/actions/admin-professionals';

/** Ações em massa da lista de profissionais. */
export function ProfessionalBulkActions() {
  const router = useRouter();
  const after = <T,>(res: T) => { router.refresh(); return res; };

  return (
    <BulkActionsBar
      noun="conta"
      actions={[
        { label: 'Pausar', icon: <PauseCircle className="h-3.5 w-3.5" />, confirm: 'Pausar as contas selecionadas? Elas somem da busca pública e não recebem novos agendamentos.', onRun: ids => bulkSetStatusAction(ids, 'paused').then(after) },
        { label: 'Reativar', icon: <PlayCircle className="h-3.5 w-3.5" />, onRun: ids => bulkSetStatusAction(ids, 'active').then(after) },
        { label: '+30 dias', icon: <CalendarPlus className="h-3.5 w-3.5" />, confirm: 'Estender o acesso das contas selecionadas em 30 dias?', onRun: ids => bulkExtendTrialAction(ids, 30).then(after) },
        { label: 'Lixeira', icon: <Trash2 className="h-3.5 w-3.5" />, destructive: true, onRun: ids => bulkTrashAction(ids).then(after) },
      ]}
    />
  );
}

export default ProfessionalBulkActions;
