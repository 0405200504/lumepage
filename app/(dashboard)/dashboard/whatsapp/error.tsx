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
    console.error('[WhatsApp page error]', error?.message, error?.stack);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center px-4">
      <div className="w-12 h-12 rounded-2xl bg-danger-bg flex items-center justify-center">
        <AlertTriangle className="w-6 h-6 text-danger" />
      </div>
      <div>
        <p className="text-label font-semibold text-n-800">Algo deu errado</p>
        <p className="text-caption text-n-500 mt-1">{error?.message || 'Não foi possível carregar as configurações do WhatsApp.'}</p>
      </div>
      <button
        onClick={reset}
        className="px-4 py-2 rounded-xl bg-wine-700 text-white text-label font-semibold hover:bg-wine-800 transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
}
