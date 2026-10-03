'use client';

import React, { useState } from 'react';
import { ArrowRight, LogIn, MailCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { registerProfessionalAction, resendConfirmationAction } from '@/app/actions/professional';
import { GoogleButton } from '@/components/auth/GoogleButton';
import InstallApp from '@/components/pwa/InstallApp';
import TurnstileWidget, { useTurnstileToken } from '@/components/booking/TurnstileWidget';
import { AuthInput, OrDivider, PanelHead, PasswordInput, SwitchLink } from '@/components/auth/AuthControls';
import type { AuthPanelProps } from '@/components/auth/AuthCard';
import { PLAN_LABEL, type PlanType } from '@/lib/subscription/entitlements';

/** O que a URL de /register traz (app/(auth)/register/page.tsx). */
export interface RegisterContext {
  initialEmail: string;
  /** Compra confirmada pelo link assinado do e-mail. */
  purchase: { state: 'pending' | 'claimed'; plan: PlanType | null } | null;
  /** `?plano=` sem assinatura (redirecionamento da Hubla): só muda o texto. */
  planHint: PlanType | null;
}

/**
 * Aba "Criar conta" do cartão de entrada (components/auth/AuthCard). Quem
 * chega pelo e-mail de "pagamento aprovado" (compra órfã da Hubla) vem com o
 * e-mail da compra preenchido e a tela fala do plano pago, não do teste
 * grátis — o plano ativa sozinho quando a conta nasce com esse e-mail.
 */
export function RegisterForm({ email, onEmailChange, onSwitch, context }: AuthPanelProps & { context?: RegisterContext }) {
  const { success, error } = useToast();
  const initialEmail = context?.initialEmail ?? '';
  const purchase = context?.purchase ?? null;
  const planHint = context?.planHint ?? null;

  const [formData, setFormData] = useState({ name: '', brandName: '', whatsapp: '', password: '' });

  // Compra já ligada a uma conta: aqui não há o que cadastrar, é entrar.
  const alreadyLinked = purchase?.state === 'claimed';
  const paidPlan = purchase?.state === 'pending' ? purchase.plan : planHint;
  const paidFlow = !alreadyLinked && (purchase?.state === 'pending' || Boolean(planHint));
  const planName = paidPlan ? PLAN_LABEL[paidPlan] : null;
  const leftPurchaseEmail = purchase?.state === 'pending' && !!initialEmail
    && email.trim().toLowerCase() !== initialEmail;
  const [isLoading, setIsLoading] = useState(false);
  // Anti-bot: o cadastro cria conta e dispara e-mail — sem isto o único freio
  // era um rate limit em memória, que zera a cada instância da Vercel.
  const captcha = useTurnstileToken();
  // Conta criada e esperando o clique no link do e-mail (lib/auth/email-confirm.ts).
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!confirmEmail) return;
    setResending(true);
    try {
      const r = await resendConfirmationAction(confirmEmail);
      if ('error' in r && r.error) error('Atenção', r.error);
      else success('E-mail reenviado', 'message' in r ? r.message : 'Confira sua caixa de entrada.');
    } catch {
      error('Erro', 'Não foi possível reenviar agora. Tente de novo em instantes.');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.brandName || !email || !formData.password || !formData.whatsapp) {
      error('Preencha os campos', 'Todos os campos são obrigatórios.');
      return;
    }

    if (formData.password.length < 8) {
      error('Senha curta', 'Crie uma senha com pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerProfessionalAction({ ...formData, email, captchaToken: await captcha.takeToken() });
      if (res.success && 'needsConfirmation' in res && res.needsConfirmation) {
        // Não manda para o login: sem clicar no link, o login recusa.
        setConfirmEmail(email.trim().toLowerCase());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (res.success) {
        // A compra órfã da Hubla é ligada no primeiro login, não aqui.
        if (paidFlow) success('Conta criada!', 'O plano que você pagou ativa quando você entrar.');
        else success('Conta criada com sucesso!', 'Seus 7 dias grátis começaram. É só entrar.');
        onSwitch('entrar');
      } else {
        error('Falha no Cadastro', res.error || 'Não foi possível criar a conta.');
      }
    } catch {
      error('Erro', 'Ocorreu um erro ao processar o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  if (confirmEmail) {
    return (
      <>
        <PanelHead title="Confira seu e-mail" subtitle={`Mandamos um link para ${confirmEmail}.`} />
        <div className="mt-6 flex gap-3 rounded-[12px] bg-white/[0.05] p-4">
          <MailCheck className="mt-0.5 h-5 w-5 shrink-0 text-white/70" aria-hidden />
          <p className="text-body-sm text-white/75">
            Abra o e-mail da Lume e toque em <strong className="font-semibold text-white">Confirmar meu e-mail</strong>. Depois é só entrar com a senha que você criou.
            {paidFlow ? ' O plano que você pagou ativa no primeiro acesso.' : ' Seus 7 dias grátis já estão reservados.'}
          </p>
        </div>
        <p className="mt-3 text-caption text-white/45">Não chegou? Olhe no spam e na aba Promoções.</p>
        <button type="button" onClick={() => onSwitch('entrar')} className="auth-btn-primary tap mt-6">
          <LogIn className="h-4 w-4" aria-hidden /> Já confirmei, quero entrar
        </button>
        <p className="mt-6 text-center text-caption text-white/45">
          <SwitchLink onClick={handleResend}>{resending ? 'Enviando…' : 'Reenviar e-mail de confirmação'}</SwitchLink>
        </p>
      </>
    );
  }

  if (alreadyLinked) {
    return (
      <>
        <PanelHead title="Você já tem conta" subtitle="Esse pagamento já está ligado à sua conta. É só entrar." />
        <button type="button" onClick={() => onSwitch('entrar')} className="auth-btn-primary tap mt-6">
          <LogIn className="h-4 w-4" aria-hidden /> Entrar na minha conta
        </button>
        <p className="mt-6 text-center text-caption text-white/45">
          Não lembra a senha? <SwitchLink onClick={() => onSwitch('recuperar')}>Recuperar acesso</SwitchLink>
        </p>
      </>
    );
  }

  const subtitle = purchase?.state === 'pending'
    ? `Pagamento aprovado. ${planName ? `O plano ${planName}` : 'Seu plano'} ativa assim que a conta for criada.`
    : planHint
      ? `Use o mesmo e-mail da compra: o plano ${planName} ativa sozinho.`
      : '7 dias grátis para testar, sem cartão.';

  return (
    <>
      <PanelHead title={paidFlow ? 'Falta só criar sua conta' : 'Crie sua conta'} subtitle={subtitle} />

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <AuthInput id="cad-nome" label="Seu nome" name="name" autoComplete="name" required value={formData.name} onChange={handleChange} />
          <AuthInput id="cad-negocio" label="Seu negócio" name="brandName" autoComplete="organization" required value={formData.brandName} onChange={handleChange} />
        </div>
        <div>
          <AuthInput
            id="cad-email"
            label="E-mail"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          {leftPurchaseEmail && (
            <p className="mt-1.5 text-caption text-amber-300/90">
              O pagamento foi feito com {initialEmail}. Com outro e-mail o plano não ativa sozinho.
            </p>
          )}
        </div>
        <AuthInput
          id="cad-whatsapp"
          label="WhatsApp"
          name="whatsapp"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={formData.whatsapp}
          onChange={handleChange}
        />
        <PasswordInput
          id="cad-senha"
          label="Senha (mínimo 8 caracteres)"
          name="password"
          autoComplete="new-password"
          required
          value={formData.password}
          onChange={handleChange}
        />

        <TurnstileWidget theme="dark" appearance="interaction-only" size="flexible" onVerify={captcha.onVerify} resetKey={captcha.resetKey} />

        <button type="submit" disabled={isLoading} className="auth-btn-primary tap">
          <span>{isLoading ? 'Criando conta…' : paidFlow ? 'Criar minha conta' : 'Começar meus 7 dias grátis'}</span>
          {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden />}
        </button>
      </form>

      <OrDivider />

      <div className="space-y-3">
        <GoogleButton label="Cadastrar com Google" variant="dark" />
        <InstallApp variant="dark" />
      </div>

      <p className="mt-6 text-center text-caption text-white/45">
        Já tem conta? <SwitchLink onClick={() => onSwitch('entrar')}>Entrar</SwitchLink>
      </p>
    </>
  );
}

export default RegisterForm;
