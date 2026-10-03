'use client';

import React, { useState } from 'react';
import { ArrowLeft, MailCheck, Send } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { requestPasswordResetAction } from '@/app/actions/access';
import TurnstileWidget, { useTurnstileToken } from '@/components/booking/TurnstileWidget';
import { AuthInput, PanelHead, SwitchLink } from '@/components/auth/AuthControls';
import type { AuthPanelProps } from '@/components/auth/AuthCard';

/**
 * Aba "Recuperar senha" do cartão de entrada (components/auth/AuthCard).
 * Manda o link de uso único; a senha nova é criada em /redefinir-senha/[token].
 */
export function RecoverForm({ email, onEmailChange, onSwitch }: AuthPanelProps) {
  const { error } = useToast();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const captcha = useTurnstileToken();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      error('E-mail inválido', 'Informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetAction(email, await captcha.takeToken());
      if (res.success) {
        setSent(true);
      } else {
        error('Atenção', res.error || 'Não foi possível processar o pedido.');
      }
    } catch {
      error('Erro', 'Ocorreu uma falha ao enviar o link de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <>
        <PanelHead title="Link enviado" subtitle="Tudo certo! Confira sua caixa de entrada." />
        <div className="mt-6 flex gap-3 rounded-[12px] bg-white/[0.05] p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-white/70" aria-hidden />
          <p className="text-body-sm text-white/75">
            Se <strong className="font-semibold text-white">{email}</strong> estiver cadastrado na Lume, enviamos um link seguro, de uso único e válido por 1 hora.
          </p>
        </div>
        <p className="mt-3 text-caption text-white/45">Não encontrou? Confira também o spam e a aba Promoções.</p>
        <button type="button" onClick={() => onSwitch('entrar')} className="auth-btn-primary tap mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voltar para o login
        </button>
      </>
    );
  }

  return (
    <>
      <PanelHead title="Recuperar senha" subtitle="Enviamos um link para você criar uma senha nova." />

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <AuthInput
          id="recuperar-email"
          label="E-mail da sua conta"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />

        <TurnstileWidget theme="dark" appearance="interaction-only" size="flexible" onVerify={captcha.onVerify} resetKey={captcha.resetKey} />

        <button type="submit" disabled={loading} className="auth-btn-primary tap">
          {!loading && <Send className="h-4 w-4" aria-hidden />}
          <span>{loading ? 'Enviando link…' : 'Enviar link de recuperação'}</span>
        </button>
      </form>

      <p className="mt-6 text-center text-caption text-white/45">
        Lembrou a senha? <SwitchLink onClick={() => onSwitch('entrar')}>Entrar</SwitchLink>
      </p>
    </>
  );
}

export default RecoverForm;
