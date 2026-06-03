'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Mail, Lock, LogIn, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { loginAction } from '@/app/actions/professional';

export default function LoginPage() {
  const router = useRouter();
  const { success, error, info } = useToast();
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
        success('Bem-vindo de volta!', `Olá, ${res.profile.name}. Acessando painel...`);
        if (res.profile.role === 'super_admin') {
          router.push('/admin');
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

  const handleTestCredentials = (testEmail: string) => {
    setEmail(testEmail);
    setPassword('lume123456'); // Senha real redefinida no Supabase Auth
    info('Credenciais carregadas', `Clique em "Acessar Painel" para entrar.`);
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center items-center px-4 select-none">
      {/* Voltar */}
      <div className="absolute top-6 left-6">
        <Link 
          href="/"
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-forest transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Início</span>
        </Link>
      </div>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-forest text-lima flex items-center justify-center font-black rounded-2xl text-2xl shadow-md mb-3">
            L
          </div>
          <h2 className="text-2xl font-black text-forest tracking-tight">Entrar na Lume</h2>
          <p className="text-xs text-gray-450 mt-1">Acesse sua conta profissional ou administrativa</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e4e9e6] shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  placeholder="exemplo@lume.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                Senha de Acesso
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-forest"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-md transition-all-custom cursor-pointer"
            >
              <LogIn className="h-4 w-4" />
              <span>{isLoading ? 'Autenticando...' : 'Acessar Painel'}</span>
            </button>
            <div className="text-center mt-4">
              <span className="text-xs text-gray-450">Não tem uma conta? </span>
              <Link href="/register" className="text-xs font-bold text-forest hover:underline">
                Criar uma conta
              </Link>
            </div>
          </form>

          {/* Dicas de Credenciais */}
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Contas de Teste (Senha: lume123456):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleTestCredentials('admin@lume.com')}
                className="text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] hover:bg-gray-100 transition-colors"
              >
                <p className="font-bold text-forest">Super Admin Lume</p>
                <p className="text-gray-450 font-mono truncate">admin@lume.com</p>
              </button>
              <button
                type="button"
                onClick={() => handleTestCredentials('amanda@estetica.com')}
                className="text-left px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[11px] hover:bg-gray-100 transition-colors"
              >
                <p className="font-bold text-forest">Amanda Costa (Prof.)</p>
                <p className="text-gray-450 font-mono truncate">amanda@estetica.com</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
