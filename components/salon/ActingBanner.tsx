'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ArrowLeft } from 'lucide-react';
import { exitActingAction } from '@/app/actions/salon';

export const ActingBanner: React.FC<{ brandName: string }> = ({ brandName }) => {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const back = async () => {
    setBusy(true);
    await exitActingAction();
    router.push('/salon');
  };
  return (
    <div className="surface-wine text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
      <span className="inline-flex items-center gap-2 font-semibold">
        <Store className="h-4 w-4 shrink-0" />
        <span className="truncate">Modo gerência · você está gerenciando <strong>{brandName}</strong></span>
      </span>
      <button onClick={back} disabled={busy} className="inline-flex items-center gap-1.5 shrink-0 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 font-bold transition-colors disabled:opacity-60">
        <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao salão
      </button>
    </div>
  );
};
export default ActingBanner;
