'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { googleAuthAction } from '@/app/actions/professional';
import { LumeLogo } from '@/components/ui/LumeLogo';

/**
 * Retorno do OAuth do Google. O SDK do Supabase captura o token do hash da URL;
 * pegamos o access_token e mandamos pra action de servidor, que valida e monta o
 * cookie de sessão do Lume. Depois redirecionamos para o painel.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Entrando com o Google…');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!supabase) {
        router.replace('/login');
        return;
      }

      // Aguarda o SDK captar a sessão do hash da URL.
      let token: string | null = null;
      for (let i = 0; i < 25 && !token; i++) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
        if (!token) await new Promise((r) => setTimeout(r, 150));
      }

      if (cancelled) return;
      if (!token) {
        setMessage('Não foi possível concluir o login. Redirecionando…');
        setTimeout(() => router.replace('/login'), 1600);
        return;
      }

      const res = await googleAuthAction(token);
      if (cancelled) return;

      if (res.success) {
        router.replace(res.role === 'super_admin' ? '/admin' : '/dashboard');
      } else {
        setMessage(res.error || 'Falha no login. Redirecionando…');
        setTimeout(() => router.replace('/login'), 2200);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div
      className="min-h-screen min-h-dvh flex flex-col items-center justify-center px-4 select-none"
      style={{ background: 'linear-gradient(160deg, #26040a 0%, #1a0409 55%, #120207 100%)' }}
    >
      <LumeLogo variant="light" className="h-11 text-white mb-6" />
      <div className="flex items-center gap-3 text-white/80">
        <span className="h-5 w-5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
        <span className="text-sm font-semibold">{message}</span>
      </div>
    </div>
  );
}
