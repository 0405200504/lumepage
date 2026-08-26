'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { googleAuthAction } from '@/app/actions/professional';
import { LumeLogo } from '@/components/ui/LumeLogo';

/**
 * Retorno do OAuth do Google. O SDK do Supabase captura o token do hash da URL;
 * pegamos o access_token e mandamos pra action de servidor, que valida e monta o
 * cookie de sessão do Lume. Depois redirecionamos para o painel — ou para as
 * boas-vindas, se a conta acabou de nascer e ainda não tem negócio/WhatsApp.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Entrando com o Google…');
  const [falhou, setFalhou] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const falha = (texto: string, destino = '/login') => {
      if (cancelled) return;
      setFalhou(true);
      setMessage(texto);
      setTimeout(() => router.replace(destino), 2200);
    };

    const run = async () => {
      if (!supabase) {
        router.replace('/login');
        return;
      }

      // O Google devolve a recusa na própria URL (hash no fluxo implícito).
      // Sem isto, quem clicava em "Cancelar" ficava 4 segundos olhando um
      // spinner antes de qualquer resposta.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const query = new URLSearchParams(window.location.search);
      const erro = hash.get('error') || query.get('error');
      if (erro) {
        falha(erro === 'access_denied'
          ? 'Login cancelado. Voltando…'
          : 'O Google recusou o login. Voltando…');
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
        falha('Não foi possível concluir o login. Redirecionando…');
        return;
      }

      // Tira o token da barra de endereço antes de seguir: ele fica no
      // histórico do navegador e é o suficiente para entrar na conta.
      window.history.replaceState(null, '', window.location.pathname);

      const res = await googleAuthAction(token);
      if (cancelled) return;

      if (res.success) {
        if (res.role === 'super_admin') router.replace('/admin');
        else if (res.needsOnboarding) {
          setMessage('Conta criada! Vamos configurar…');
          router.replace('/bem-vinda');
        } else {
          router.replace('/dashboard');
        }
      } else {
        falha(res.error || 'Falha no login. Redirecionando…');
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
        {!falhou && <span className="h-5 w-5 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />}
        <span className="text-sm font-semibold text-center">{message}</span>
      </div>
    </div>
  );
}
