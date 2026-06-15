'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function WhatsAppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[WhatsApp page error]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <div>
        <p className="text-sm font-semibold text-gray-800">Algo deu errado</p>
        <p className="text-xs text-gray-500 mt-1">Não foi possível carregar as configurações do Bot WhatsApp.</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-xl bg-[#500b18] text-white text-sm font-semibold hover:bg-[#3d0812] transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
