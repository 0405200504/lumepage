'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, PauseCircle } from 'lucide-react';
import { BulkActionsBar } from '@/components/ui/TableSelection';
import { useToast } from '@/components/ui/Toast';
import { resolveConversationAction, holdConversationAction } from '@/app/actions/admin-operations';

/** Ações em massa da fila de conversas. */
export function ConversationBulkActions() {
  const router = useRouter();
  const after = <T,>(r: T) => { router.refresh(); return r; };
  return (
    <BulkActionsBar
      noun="conversa"
      actions={[
        { label: 'Devolver ao bot', icon: <CheckCircle2 className="h-3.5 w-3.5" />, onRun: ids => resolveConversationAction(ids).then(after) },
        { label: 'Manter com humano', icon: <PauseCircle className="h-3.5 w-3.5" />, onRun: ids => holdConversationAction(ids).then(after) },
      ]}
    />
  );
}

/** Botão único, usado na tela da thread. */
export function ResolveConversationButton({ id, paused }: { id: string; paused: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();

  const run = async () => {
    const res = paused ? await resolveConversationAction([id]) : await holdConversationAction([id]);
    if (res.success) { success('Pronto', paused ? 'Conversa devolvida ao bot.' : 'Conversa marcada para atendimento humano.'); router.refresh(); }
    else error('Não deu', res.error ?? 'Tente de novo.');
  };

  return (
    <button type="button" onClick={run}
      className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold transition-colors">
      {paused ? <><CheckCircle2 className="h-3.5 w-3.5" /> Marcar como resolvida</> : <><PauseCircle className="h-3.5 w-3.5" /> Passar para humano</>}
    </button>
  );
}
