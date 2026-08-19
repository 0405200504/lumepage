'use client';

import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogOut, Eye, Pencil } from 'lucide-react';
import { stopImpersonationAction } from '@/app/actions/admin-professionals';

/**
 * Faixa fixa e sem botão de fechar no topo do painel da profissional enquanto o admin
 * está "entrando como" ela.
 *
 * Contraste alto de propósito: ninguém pode esquecer que está dentro da conta de
 * outra pessoa. O contador regressivo é lido do `exp` da própria sessão assinada —
 * quando zera, a sessão já não vale nada do lado do servidor e a página recarrega.
 */
export function ImpersonationBanner({ brandName, adminEmail, readOnly, expiresAt }: {
  brandName: string;
  adminEmail: string;
  readOnly: boolean;
  /** epoch-ms de expiração da sessão de suporte. */
  expiresAt?: number;
}) {
  const [leaving, setLeaving] = useState(false);
  // Começa em null e só ganha valor no efeito: ler o relógio na renderização
  // divergiria entre servidor e cliente.
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = expiresAt - Date.now();
      setLeft(ms);
      // Sessão vencida: o servidor já recusa o cookie, então recarregar cai no login.
      if (ms <= 0) window.location.reload();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const leave = async () => {
    setLeaving(true);
    const res = await stopImpersonationAction();
    window.location.href = res.returnTo || '/admin';
  };

  const clock = left !== null && left > 0
    ? `${Math.floor(left / 60_000)}:${String(Math.floor((left % 60_000) / 1000)).padStart(2, '0')}`
    : null;
  const ending = left !== null && left <= 120_000;

  return (
    <div
      role="status"
      className={`sticky top-0 z-50 flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5 text-white text-xs font-bold
        ${readOnly ? 'bg-[#3d2a08]' : 'bg-[#7a1020]'} border-b-2 ${readOnly ? 'border-[#c9a227]' : 'border-[#ff6b81]'}`}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" aria-hidden />

      <span className="min-w-0 flex-1">
        Você está dentro da conta de <strong className="underline underline-offset-2">{brandName}</strong>
        <span className="hidden sm:inline"> · sessão de suporte de {adminEmail}</span>
      </span>

      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] uppercase tracking-[0.08em] text-[10px]
        ${readOnly ? 'bg-[#c9a227] text-[#241a04]' : 'bg-white text-[#7a1020]'}`}>
        {readOnly ? <Eye className="h-3 w-3" aria-hidden /> : <Pencil className="h-3 w-3" aria-hidden />}
        {readOnly ? 'somente leitura' : 'pode editar'}
      </span>

      {clock && (
        <span
          className={`tabular-nums px-2 py-0.5 rounded-[2px] bg-black/25 ${ending ? 'animate-pulse' : ''}`}
          aria-label={`Sessão expira em ${clock}`}
        >
          expira em {clock}
        </span>
      )}

      <button
        type="button" onClick={leave} disabled={leaving}
        className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-[4px] bg-white text-[#1a1a1a] hover:bg-white/85 transition-colors disabled:opacity-60"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden /> {leaving ? 'Saindo…' : 'Sair e voltar ao admin'}
      </button>
    </div>
  );
}

export default ImpersonationBanner;
