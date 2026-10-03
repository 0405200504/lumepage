'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, CirclePlay } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { loginAction, loginDemoAction, resendConfirmationAction } from '@/app/actions/professional';
import { GoogleButton } from '@/components/auth/GoogleButton';
import TurnstileWidget, { useTurnstileToken } from '@/components/booking/TurnstileWidget';
import { LoginCurtain } from '@/components/auth/LoginCurtain';
import { AuthInput, OrDivider, PanelHead, PasswordInput, SwitchLink } from '@/components/auth/AuthControls';
import type { AuthPanelProps } from '@/components/auth/AuthCard';
import { PANEL_FLAG_KEY, SPLASH_HANDOFF_KEY } from '@/lib/ui/splashScene';

/** Aba "Entrar" do cartão de entrada (components/auth/AuthCard). */
export function LoginForm({ email, onEmailChange, onSwitch }: AuthPanelProps) {
  const router = useRouter();
  const { success, error } = useToast();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  // O token do Turnstile vai junto com o login — antes o widget rodava e o
  // token ficava aqui, sem nunca ser conferido no servidor.
  const captcha = useTurnstileToken();
  // Login deu certo e o destino é o painel: a cortina de cetim sobe aqui e a
  // abertura (components/ui/AppSplash) continua dela, sem piscar no meio.
  const [entering, setEntering] = useState(false);

  // Caiu no login = não está logada. A tela de abertura do app instalado
  // (app/abertura/route.ts) para de tocar a estrela até ela entrar de novo
  // no painel — senão a próxima abertura acenderia a marca antes deste
  // formulário. E o bastão dela, se veio parar aqui, não vale mais.
  useEffect(() => {
    try {
      localStorage.removeItem(PANEL_FLAG_KEY);
      sessionStorage.removeItem(SPLASH_HANDOFF_KEY);
    } catch {
      /* storage bloqueado: nada a desmarcar */
    }
  }, []);

  // Conta criada que ainda não clicou no link de confirmação do e-mail.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resending, setResending] = useState(false);

  // Volta do link de confirmação (/confirmar-email) ou de um link de acesso que
  // falhou (/acesso): o recado vem na URL. Uma vez só, e some da barra de
  // endereço para não repetir ao recarregar.
  const urlNoticeShown = useRef(false);
  useEffect(() => {
    if (urlNoticeShown.current) return;
    urlNoticeShown.current = true;
    const params = new URLSearchParams(window.location.search);
    const erroUrl = params.get('erro');
    if (params.get('confirmado') === '1') success('E-mail confirmado!', 'Agora é só entrar com seu e-mail e senha.');
    else if (erroUrl) error('Atenção', erroUrl.slice(0, 200));
    if (params.has('confirmado') || erroUrl) window.history.replaceState(null, '', window.location.pathname);
  }, [success, error]);

  const handleResend = async () => {
    setResending(true);
    try {
      const r = await resendConfirmationAction(email);
      if ('error' in r && r.error) error('Atenção', r.error);
      else success('E-mail reenviado', 'message' in r ? r.message : 'Confira sua caixa de entrada.');
    } catch {
      error('Erro', 'Não foi possível reenviar agora. Tente de novo em instantes.');
    } finally {
      setResending(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemoAction();
      setEntering(true);
      router.push('/dashboard');
    } catch {
      error('Erro', 'Não foi possível abrir a conta teste.');
      setDemoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      error('Preencha os campos', 'O e-mail é obrigatório.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await loginAction(email, password, await captcha.takeToken());
      if (res.success && res.profile) {
        if (res.profile.role === 'super_admin') {
          success('Bem-vinda de volta!', `Olá, ${res.profile.name}. Acessando painel...`);
          router.push('/admin');
        } else if (res.profile.is_salon_manager) {
          success('Bem-vinda de volta!', `Olá, ${res.profile.name}. Acessando painel...`);
          router.push('/salon');
        } else {
          // Sem toast por cima da abertura: a cortina é a confirmação.
          setEntering(true);
          router.push('/dashboard');
        }
      } else {
        setUnconfirmed(!!res.needsConfirmation);
        error(res.needsConfirmation ? 'Confirme seu e-mail' : 'Falha no Login', res.error || 'Credenciais incorretas.');
      }
    } catch {
      error('Erro', 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {entering && <LoginCurtain />}

      <PanelHead title="Olá de novo!" subtitle="Entre com seu e-mail e senha." />

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <AuthInput
          id="login-email"
          label="E-mail"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
        <PasswordInput
          id="login-senha"
          label="Senha"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* Cloudflare Turnstile (anti-robô): invisível, só aparece se pedir desafio */}
        <TurnstileWidget theme="dark" appearance="interaction-only" size="flexible" onVerify={captcha.onVerify} resetKey={captcha.resetKey} />

        {unconfirmed && (
          <div className="rounded-[12px] bg-white/[0.05] px-4 py-3 text-center">
            <p className="text-caption text-white/75">
              Falta confirmar seu e-mail. Abra a mensagem da Lume e toque em &quot;Confirmar meu e-mail&quot;.
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-2 text-caption font-semibold text-white underline underline-offset-4 disabled:opacity-60"
            >
              {resending ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
            </button>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="auth-btn-primary tap">
          {!isLoading && <LogIn className="h-4 w-4" aria-hidden />}
          <span>{isLoading ? 'Entrando…' : 'Entrar'}</span>
        </button>
      </form>

      <OrDivider />

      <div className="space-y-3">
        <GoogleButton label="Entrar com Google" variant="dark" />
        <button type="button" onClick={handleDemo} disabled={demoLoading} className="auth-btn-secondary tap">
          <CirclePlay className="h-4 w-4" aria-hidden />
          <span>{demoLoading ? 'Abrindo demonstração…' : 'Ver demonstração'}</span>
        </button>
      </div>

      <p className="mt-6 text-center text-caption text-white/45">
        Ainda não usa a Lume? <SwitchLink onClick={() => onSwitch('criar')}>Teste 7 dias grátis</SwitchLink>, sem cartão.
      </p>
    </>
  );
}

export default LoginForm;
