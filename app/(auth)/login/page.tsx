'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Lock, LogIn, Eye, EyeOff, ShieldCheck, User } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { loginAction } from '@/app/actions/professional';

export default function LoginPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'pro' | 'admin'>('pro');

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
    <div className="min-h-screen bg-cream flex flex-col justify-center items-center px-4 select-none relative overflow-hidden">
      {/* Halo decorativo bordô (futurista) */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-wine-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-48 -left-40 h-96 w-96 rounded-full bg-wine-100/50 blur-3xl" />

      {/* Voltar */}
      <div className="absolute top-6 left-6 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-gray-450 hover:text-forest transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Início</span>
        </Link>
      </div>

      <div className="max-w-md w-full z-10 animate-fade-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <LumeLogo variant="wine" className="h-12 text-wine-700 mb-5" />
          <h2 className="text-2xl font-black text-forest tracking-tight">
            {mode === 'admin' ? 'Acesso do Administrador' : 'Bem-vinda de volta'}
          </h2>
          <p className="text-xs text-gray-450 mt-1.5">
            {mode === 'admin' ? 'Painel de gestão da plataforma Lume' : 'Acesse seu painel de agenda profissional'}
          </p>
        </div>

        {/* Seletor de tipo de acesso */}
        <div className="grid grid-cols-2 gap-1 bg-sand/70 border border-gray-150 rounded-2xl p-1 mb-5 max-w-xs mx-auto">
          <button
            type="button"
            onClick={() => setMode('pro')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all-custom ${
              mode === 'pro' ? 'surface-wine text-white shadow-soft' : 'text-gray-450 hover:text-forest'
            }`}
          >
            <User className="h-3.5 w-3.5" /> Profissional
          </button>
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all-custom ${
              mode === 'admin' ? 'surface-wine text-white shadow-soft' : 'text-gray-450 hover:text-forest'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Administrador
          </button>
        </div>

        {/* Card de Login */}
        <div className="card p-7 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">
                Endereço de E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-450" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="voce@suamarca.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-cream/60 border border-gray-150 rounded-2xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">
                Senha de Acesso
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-450" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 bg-cream/60 border border-gray-150 rounded-2xl text-sm placeholder-gray-450/60 focus:outline-none focus:ring-2 focus:ring-wine-700/15 focus:border-wine-700 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-450 hover:text-forest"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-sm font-bold rounded-2xl shadow-soft transition-all-custom cursor-pointer disabled:opacity-60"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Autenticando...' : 'Acessar Painel'}</span>
            </button>
          </form>

          {/* Aviso contextual */}
          <div className="mt-7 pt-6 border-t border-gray-150">
            <div className="flex items-start gap-3 text-gray-450">
              <ShieldCheck className="h-4 w-4 text-wine-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                {mode === 'admin'
                  ? 'Acesso restrito à administração da Lume. Entre com seu e-mail e senha de super admin.'
                  : 'As contas são criadas exclusivamente pela administração da Lume. Não recebeu seu acesso? Fale com o administrador.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
