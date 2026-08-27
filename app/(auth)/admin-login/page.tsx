'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { loginAction } from '@/app/actions/professional';

export default function AdminLoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
          success('Bem-vindo!', `Olá, Administrador. Acessando painel...`);
          router.push('/admin');
        } else {
          error('Acesso Negado', 'Esta área é restrita a administradores.');
          // You might want to log them out here if they aren't admin, but standard login flow redirects them.
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
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-wine-700/30 blur-3xl" />

      <div className="max-w-md w-full z-10 animate-fade-up">
        <div className="flex flex-col items-center mb-6">
          <LumeLogo variant="light" className="h-12 text-white mb-5" />
          <h2 className="text-h2 font-semibold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-wine-500 h-6 w-6" />
            Lume Admin
          </h2>
          <p className="text-caption text-white/55 mt-1.5">
            Acesso restrito à administração da plataforma.
          </p>
        </div>

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
                  placeholder="admin@lume.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
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
                  className="block w-full pl-10 pr-10 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
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
              <span>{isLoading ? 'Autenticando...' : 'Entrar no Admin'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
