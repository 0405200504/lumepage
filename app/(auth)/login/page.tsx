'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { loginAction, loginDemoAction } from '@/app/actions/professional';
import { GoogleButton } from '@/components/auth/GoogleButton';
import Link from 'next/link';
import TurnstileWidget from '@/components/booking/TurnstileWidget';
import { LoginVideoBackground } from '@/components/auth/LoginVideoBackground';
import { LoginCurtain } from '@/components/auth/LoginCurtain';

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  // Login deu certo e o destino é o painel: a cortina de cetim sobe aqui e a
  // abertura (components/ui/AppSplash) continua dela, sem piscar no meio.
  const [entering, setEntering] = useState(false);

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
      const res = await loginAction(email, password);
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
        error('Falha no Login', res.error || 'Credenciais incorretas.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-dvh flex flex-col justify-center items-center px-4 py-20 select-none relative">
      <LoginVideoBackground />
      {entering && <LoginCurtain />}

      {/* A entrada anima cada bloco, não o wrapper: opacidade animada num ancestral
          impede o backdrop-filter do vidro de enxergar o vídeo. */}
      <div className="max-w-md w-full z-10">
        {/* Logo */}
        <div className="stagger-item flex justify-center mb-8" style={{ ['--i' as string]: 0 }}>
          <h1 className="sr-only">Entrar na Lume</h1>
          <LumeLogo variant="light" className="h-14" />
        </div>

        {/* Card de Login — vidro fosco sobre o vídeo */}
        <div style={{ ['--i' as string]: 1 }} className="stagger-item glass-panel rounded-[28px] p-7 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              {/* Sem rótulo visível: o nome do campo fica no placeholder; o
                  <label> segue para leitor de tela. */}
              <label htmlFor="login-email" className="sr-only">E-mail</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-white/50" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 glass-field rounded-2xl text-label"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-senha" className="sr-only">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-white/50" />
                </div>
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 glass-field rounded-2xl text-label"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/50 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Link de Esqueci a Senha embaixo do campo de senha */}
              <div className="flex justify-end mt-2">
                <Link
                  href="/redefinir-senha"
                  className="text-caption font-semibold text-white/75 hover:text-white hover:underline transition-colors"
                >
                  Esqueci a senha
                </Link>
              </div>
            </div>

            {/* Widget Cloudflare Turnstile (Proteção Anti-Bot) */}
            <TurnstileWidget theme="dark" appearance="interaction-only" size="flexible" onVerify={(token) => setTurnstileToken(token)} />

            {/* Principal: branco cheio, a mesma altura dos campos. A seta
                avança meio passo no hover — o gesto de "entrar". */}
            <button
              type="submit"
              disabled={isLoading}
              className="group tap flex items-center justify-center gap-2 w-full h-12 bg-white hover:bg-white/95 text-wine-700 text-label font-semibold rounded-2xl shadow-[0_10px_28px_-14px_rgba(0,0,0,0.75)] transition-ui cursor-pointer disabled:opacity-60"
            >
              <span>{isLoading ? 'Entrando…' : 'Acessar Painel'}</span>
              {!isLoading && (
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              )}
            </button>
          </form>

          {/* Alternativa: o "ou" sozinho, sem fio dos lados */}
          <p className="my-3 text-center text-caption text-white/45">ou</p>
          <GoogleButton label="Entrar com Google" variant="glass" />

          {/* Cadastro: separado só por espaço, sem linha */}
          <div className="mt-8 text-center">
            <p className="text-body-sm text-white/70 mb-3">Ainda não usa o Lume?</p>
            <Link
              href="/register"
              className="tap flex flex-col items-center justify-center w-full py-2.5 rounded-2xl border border-white/25 hover:border-white/40 hover:bg-white/[0.06] transition-ui"
            >
              <span className="text-label font-semibold text-white">Teste por 7 dias grátis</span>
              <span className="text-caption text-white/60">sem precisar colocar cartão</span>
            </Link>
          </div>

          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={handleDemo}
              disabled={demoLoading}
              className="text-caption text-white/55 hover:text-white underline underline-offset-4 decoration-white/30 transition-colors"
            >
              {demoLoading ? 'Abrindo demo...' : 'Apenas testar a plataforma na conta de exemplo'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
