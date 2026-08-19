'use client';

import React, { useState } from 'react';
import { ShieldAlert, LogOut } from 'lucide-react';
import { stopImpersonationAction } from '@/app/actions/admin-professionals';

/**
 * Faixa fixa e sem botão de fechar no topo do painel da profissional enquanto o admin
 * está "entrando como" ela. Some sozinha quando a sessão de suporte expira (30 min).
 */
export function ImpersonationBanner({ brandName, adminEmail }: { brandName: string; adminEmail: string }) {
  const [leaving, setLeaving] = useState(false);

  const leave = async () => {
    setLeaving(true);
    await stopImpersonationAction();
    window.location.href = '/admin';
  };

  return (
    <div className="sticky top-0 z-40 flex items-center gap-3 px-4 py-2 bg-[color:var(--color-warn)] text-white text-xs font-bold">
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 min-w-0 truncate">
        Você está vendo como <strong>{brandName}</strong> · sessão de suporte de {adminEmail} · expira em até 30 min
      </span>
      <button
        type="button" onClick={leave} disabled={leaving}
        className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" /> {leaving ? 'Saindo…' : 'Sair'}
      </button>
    </div>
  );
}

export default ImpersonationBanner;
