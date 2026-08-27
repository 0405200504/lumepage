'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/Toast';

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22 22-9.8 22-22c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 4.1 29.6 2 24 2 15.5 2 8.2 6.8 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 46c5.5 0 10.5-2.1 14.3-5.6l-6.6-5.6C29.6 36.3 26.9 37.3 24 37.3c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C8.1 41.2 15.4 46 24 46z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.6 5.6C41.8 36.9 46 31 46 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

/** Botão "Continuar com Google" — inicia o OAuth do Supabase e volta em /auth/callback. */
export function GoogleButton({ label = 'Continuar com Google' }: { label?: string }) {
  const { error } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGoogle = async () => {
    if (!supabase) {
      error('Indisponível', 'Login com Google ainda não está configurado.');
      return;
    }
    setLoading(true);
    try {
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (oauthErr) {
        setLoading(false);
        error('Erro', 'Não foi possível abrir o login do Google.');
      }
      // Em caso de sucesso, o navegador é redirecionado ao Google (não reseta loading).
    } catch {
      setLoading(false);
      error('Erro', 'Falha ao iniciar o login com Google.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleGoogle}
      disabled={loading}
      className="tap flex items-center justify-center gap-2.5 w-full py-3.5 bg-white border border-n-200 text-n-700 text-label font-bold rounded-2xl hover:bg-n-50 transition-ui disabled:opacity-60"
    >
      <GoogleIcon />
      <span>{loading ? 'Abrindo…' : label}</span>
    </button>
  );
}

export default GoogleButton;
