'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Unlock } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { definirStatusMaisClientesAction } from '@/app/actions/mais-clientes';
import { button } from './ui';

/** Libera (depois do pagamento) ou bloqueia o "Quero mais clientes" da conta. */
export function MaisClientesToggle({ id, liberado }: { id: string; liberado: boolean }) {
  const router = useRouter();
  const { success, error } = useToast();
  const [pendente, start] = useTransition();
  const alternar = () => start(async () => {
    const r = await definirStatusMaisClientesAction(id, liberado ? 'bloqueado' : 'liberado');
    if (!r.success) { error('Não deu', r.error ?? 'Tente de novo.'); return; }
    success(liberado ? 'Bloqueado' : 'Liberado', liberado ? 'A aba volta a mostrar a vitrine.' : 'A profissional já vê a jornada completa.');
    router.refresh();
  });
  return (
    <button type="button" onClick={alternar} disabled={pendente} className={button(liberado ? 'secondary' : 'primary', 'md')}>
      {liberado ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
      {liberado ? 'Bloquear de novo' : 'Liberar (pagamento confirmado)'}
    </button>
  );
}

export default MaisClientesToggle;
