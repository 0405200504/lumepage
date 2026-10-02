'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Store, LogIn, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { registerProfessionalAction, resendConfirmationAction } from '@/app/actions/professional';
import { GoogleButton } from '@/components/auth/GoogleButton';
import Link from 'next/link';
import InstallApp from '@/components/pwa/InstallApp';
import TurnstileWidget, { useTurnstileToken } from '@/components/booking/TurnstileWidget';
import { PLAN_LABEL, type PlanType } from '@/lib/subscription/entitlements';

/**
 * Cadastro. Quem chega pelo e-mail de "pagamento aprovado" (compra órfã da
 * Hubla) vem com o e-mail da compra preenchido e a tela fala do plano pago, não
 * do teste grátis — o plano ativa sozinho quando a conta nasce com esse e-mail.
 */
export function RegisterForm({ initialEmail = '', purchase = null, planHint = null }: {
  initialEmail?: string;
  /** Compra confirmada pelo link assinado do e-mail. */
  purchase?: { state: 'pending' | 'claimed'; plan: PlanType | null } | null;
  /** `?plano=` sem assinatura (redirecionamento da Hubla): só muda o texto. */
  planHint?: PlanType | null;
}) {
  const router = useRouter();
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    email: initialEmail,
    whatsapp: '',
    password: '',
  });

  // Compra já ligada a uma conta: aqui não há o que cadastrar, é entrar.
  const alreadyLinked = purchase?.state === 'claimed';
  const paidPlan = purchase?.state === 'pending' ? purchase.plan : planHint;
  const paidFlow = !alreadyLinked && (purchase?.state === 'pending' || Boolean(planHint));
  const planName = paidPlan ? PLAN_LABEL[paidPlan] : null;
  const leftPurchaseEmail = purchase?.state === 'pending' && !!initialEmail
    && formData.email.trim().toLowerCase() !== initialEmail;
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
    if (!formData.name || !formData.brandName || !formData.email || !formData.password || !formData.whatsapp) {
      error('Preencha os campos', 'Todos os campos são obrigatórios.');
      return;
    }

    if (formData.password.length < 8) {
      error('Senha curta', 'Crie uma senha com pelo menos 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerProfessionalAction({ ...formData, captchaToken: await captcha.takeToken() });
      if (res.success && 'needsConfirmation' in res && res.needsConfirmation) {
        // Não manda para o login: sem clicar no link, o login recusa.
        setConfirmEmail(formData.email.trim().toLowerCase());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (res.success) {
        // A compra órfã da Hubla é ligada no primeiro login, não aqui.
        if (paidFlow) success('Conta criada!', 'O plano que você pagou ativa quando você entrar. Faça login.');
        else success('Conta criada com sucesso!', 'Seus 7 dias grátis começaram. Faça login para acessar.');
        router.push('/login');
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

  return (
    <div
      className="min-h-screen min-h-dvh flex flex-col justify-center items-center px-4 py-20 select-none relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 85% -10%, rgba(140,36,56,0.5) 0%, transparent 55%), radial-gradient(110% 90% at 0% 110%, rgba(80,11,24,0.55) 0%, transparent 50%), linear-gradient(160deg, #26040a 0%, #1a0409 55%, #120207 100%)',
      }}
    >
      {/* Halos decorativos */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-wine-700/30 blur-3xl" />
      
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <div className="max-w-md w-full z-10 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <LumeLogo variant="light" className="h-20 mb-5" />
          <h2 className="text-h2 font-semibold text-white tracking-tight text-center">
            {confirmEmail ? 'Confira seu e-mail' : alreadyLinked ? 'Você já tem conta na Lume' : paidFlow ? 'Falta só criar sua conta' : 'Crie sua conta grátis'}
          </h2>
          <p className="text-caption text-white/70 mt-1.5 text-center max-w-sm">
            <CheckCircle2 className="inline h-3.5 w-3.5 -mt-0.5 mr-1.5 text-wine-500" aria-hidden />
            {confirmEmail
              ? `Mandamos um link para ${confirmEmail}.`
              : alreadyLinked
              ? 'Esse pagamento já está ligado à sua conta. É só entrar.'
              : purchase?.state === 'pending'
                ? `Pagamento aprovado. ${planName ? `O plano ${planName}` : 'Seu plano'} ativa assim que a conta for criada.`
                : planHint
                  ? `Use o mesmo e-mail da compra: o plano ${planName} ativa sozinho.`
                  : 'Teste o Lume por 7 dias sem compromisso.'}
          </p>
        </div>

        {confirmEmail && (
          <div className="card-elevated glow-wine p-7 md:p-9 text-center">
            <Mail className="mx-auto h-8 w-8 text-wine-700" aria-hidden />
            <p className="text-label text-n-600 mt-4">
              Abra o e-mail da Lume e toque em <strong>Confirmar meu e-mail</strong>. Depois é só entrar com a senha que você criou.
              {paidFlow ? ' O plano que você pagou ativa no primeiro acesso.' : ' Seus 7 dias grátis já estão reservados.'}
            </p>
            <p className="text-caption text-n-500 mt-3">Não chegou? Olhe no spam e na aba Promoções.</p>
            <Link
              href="/login"
              className="tap flex items-center justify-center gap-2 w-full py-4 mt-6 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui"
            >
              <LogIn className="h-4 w-4" aria-hidden /> Já confirmei, quero entrar
            </Link>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="mt-4 text-caption font-bold text-wine-700 hover:underline disabled:opacity-60"
            >
              {resending ? 'Enviando…' : 'Reenviar e-mail de confirmação'}
            </button>
          </div>
        )}

        {alreadyLinked && (
          <div className="card-elevated glow-wine p-7 md:p-9 text-center">
            <Link
              href="/login"
              className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui"
            >
              <LogIn className="h-4 w-4" aria-hidden /> Entrar na minha conta
            </Link>
            <p className="text-caption text-n-500 mt-4">
              Não lembra o e-mail da conta? <Link href="/esqueci-senha" className="text-wine-700 font-bold hover:underline">Recuperar acesso</Link>
            </p>
          </div>
        )}

        <div className="mb-5">
          <InstallApp />
        </div>

        {/* Card de Cadastro */}
        <div className={`card-elevated glow-wine p-7 md:p-9 ${alreadyLinked || confirmEmail ? 'hidden' : ''}`}>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Seu Nome</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-n-600" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Seu Negócio</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Store className="h-4 w-4 text-n-600" />
                  </div>
                  <input
                    type="text"
                    name="brandName"
                    required
                    value={formData.brandName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                />
              </div>
              {leftPurchaseEmail && (
                <p className="text-caption text-warning mt-1.5">
                  O pagamento foi feito com {initialEmail}. Com outro e-mail o plano não ativa sozinho.
                </p>
              )}
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">WhatsApp</label>
              <div className="relative">
                <input
                  type="text"
                  name="whatsapp"
                  required
                  placeholder="(00) 00000-0000"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Senha Segura</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                />
              </div>
            </div>

            <TurnstileWidget appearance="interaction-only" size="flexible" onVerify={captcha.onVerify} resetKey={captcha.resetKey} />

            <button
              type="submit"
              disabled={isLoading}
              className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui cursor-pointer disabled:opacity-60 mt-2"
            >
              <span>{isLoading ? 'Criando Conta...' : paidFlow ? 'Criar minha conta' : 'Começar meus 7 dias grátis'}</span>
            </button>
          </form>

          {/* Separador + cadastro com Google */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-n-200" />
            <span className="text-caption font-bold text-n-400 uppercase tracking-wider">ou</span>
            <span className="h-px flex-1 bg-n-200" />
          </div>
          <GoogleButton label="Cadastrar com Google" />

          <div className="mt-6 pt-5 border-t border-n-200 text-center">
            <p className="text-caption text-n-500">
              Já tem uma conta? <Link href="/login" className="text-wine-700 font-bold hover:underline">Fazer Login</Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
