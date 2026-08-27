'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck, User, Store, Sparkles, UserPlus } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { loginAction, loginDemoAction } from '@/app/actions/professional';
import { GoogleButton } from '@/components/auth/GoogleButton';
import Link from 'next/link';
import InstallApp from '@/components/pwa/InstallApp';

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'pro' | 'manager'>('pro');
  const [demoLoading, setDemoLoading] = useState(false);

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemoAction();
      success('Conta teste', 'Entrando na conta de exemplo (Amanda Costa)...');
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
        success('Bem-vinda de volta!', `Olá, ${res.profile.name}. Acessando painel...`);
        if (res.profile.role === 'super_admin') {
          router.push('/admin');
        } else if (res.profile.is_salon_manager) {
          router.push('/salon');
        } else {
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
    <div
      className="min-h-screen min-h-dvh flex flex-col justify-center items-center px-4 py-20 select-none relative overflow-hidden"
      style={{
        background:
          'radial-gradient(120% 90% at 85% -10%, rgba(140,36,56,0.5) 0%, transparent 55%), radial-gradient(110% 90% at 0% 110%, rgba(80,11,24,0.55) 0%, transparent 50%), linear-gradient(160deg, #26040a 0%, #1a0409 55%, #120207 100%)',
      }}
    >
      {/* Halos decorativos bordô (futurista) */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-wine-700/30 blur-3xl" />
      {/* Grid tech sutil */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent)',
          WebkitMaskImage: 'radial-gradient(70% 60% at 50% 40%, black, transparent)',
        }}
      />

      <div className="max-w-md w-full z-10 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <LumeLogo variant="light" className="h-12 text-white mb-5" />
          <h2 className="text-h2 font-semibold text-white tracking-tight">
            {mode === 'manager' ? 'Acesso do Gerente' : 'Bem-vinda de volta'}
          </h2>
          <p className="text-caption text-white/55 mt-1.5">
            {mode === 'manager' ? 'Gerencie as contas das suas funcionárias'
              : 'Acesse seu painel de agenda profissional'}
          </p>
        </div>

        {/* Seletor de tipo de acesso */}
        <div className="grid grid-cols-2 gap-1 bg-white/[0.06] border border-white/10 ring-hairline rounded-2xl p-1 mb-5 max-w-sm mx-auto backdrop-blur-md">
          {([
            { k: 'pro', label: 'Profissional', icon: User },
            { k: 'manager', label: 'Gerente', icon: Store },
          ] as const).map(({ k, label, icon: Icon }) => (
            <button
              key={k}
              type="button"
              onClick={() => setMode(k)}
              className={`tap flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-caption font-bold transition-ui ${
                mode === k ? 'bg-white text-wine-700 shadow-md' : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* Instalar como app no celular (PWA) */}
        <div className="mb-5">
          <InstallApp />
        </div>

        {/* Card de Login */}
        <div className="card-elevated glow-wine p-7 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">
                Endereço de E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="voce@suamarca.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 transition-ui"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 transition-ui"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-n-600 hover:text-wine-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui cursor-pointer disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Autenticando...' : 'Acessar Painel'}</span>
            </button>
          </form>

          {/* Separador + login com Google */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-n-200" />
            <span className="text-caption font-bold text-n-400 uppercase tracking-wider">ou</span>
            <span className="h-px flex-1 bg-n-200" />
          </div>
          <GoogleButton label="Entrar com Google" />

          {/* Nova sessão de Registro */}
          <div className="mt-6 pt-5 border-t border-n-200 text-center">
            <p className="text-label font-bold text-n-900 mb-3">Ainda não usa o Lume?</p>
            <Link 
              href="/register"
              className="tap flex items-center justify-center gap-2 w-full py-3.5 bg-n-25 border-2 border-wine-700 text-wine-700 text-label font-bold rounded-2xl hover:bg-wine-50 transition-ui"
            >
              <UserPlus className="h-4 w-4" />
              <span>Comece seus 7 dias grátis</span>
            </Link>
          </div>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleDemo}
              disabled={demoLoading}
              className="text-caption font-semibold text-n-500 hover:text-wine-700 underline underline-offset-2"
            >
              {demoLoading ? 'Abrindo demo...' : 'Apenas testar a plataforma na conta de exemplo'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
