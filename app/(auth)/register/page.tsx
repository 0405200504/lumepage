'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Mail, Lock, User, Briefcase, Phone, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { registerProfessionalAction } from '@/app/actions/professional';

export default function RegisterPage() {
  const router = useRouter();
  const { success, error, info } = useToast();
  
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !brandName || !email || !whatsapp || !password) {
      error('Preencha os campos', 'Todos os campos são obrigatórios.');
      return;
    }

    if (password.length < 6) {
      error('Senha muito curta', 'A senha precisa ter no mínimo 6 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await registerProfessionalAction({
        name,
        brandName,
        email,
        whatsapp,
        password
      });

      if (res.success) {
        success('Conta criada!', 'Seu perfil profissional foi cadastrado com sucesso!');
        setIsRegistered(true);
        // Redireciona para o login após 3 segundos
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        error('Falha no Cadastro', res.error || 'Ocorreu um erro ao criar sua conta.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu um erro ao processar o cadastro.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex flex-col justify-center items-center px-4 py-12 select-none">
      {/* Voltar */}
      <div className="absolute top-6 left-6">
        <Link 
          href="/login"
          className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-forest transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para Login</span>
        </Link>
      </div>

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-12 w-12 bg-forest text-lima flex items-center justify-center font-black rounded-2xl text-2xl shadow-md mb-3">
            L
          </div>
          <h2 className="text-2xl font-black text-forest tracking-tight">Criar Conta na Lume</h2>
          <p className="text-xs text-gray-450 mt-1">Comece a automatizar seus agendamentos hoje mesmo</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-[#e4e9e6] shadow-xl">
          {isRegistered ? (
            <div className="flex flex-col items-center text-center py-8 space-y-4">
              <div className="h-16 w-16 bg-lima/20 text-forest flex items-center justify-center rounded-full mb-2">
                <CheckCircle className="h-10 w-10 text-forest" />
              </div>
              <h3 className="text-xl font-bold text-forest">Cadastro Realizado!</h3>
              <p className="text-sm text-gray-500 max-w-xs">
                Sua conta foi criada no Supabase com sucesso. Você será redirecionado para a tela de login em instantes...
              </p>
              <div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin mt-4"></div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Seu Nome Completo
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Amanda Costa"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              {/* Nome do Espaço / Marca */}
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Nome da sua Marca / Espaço
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Amanda Costa Estética"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Isso gerará o link da sua página de agendamentos.
                </p>
              </div>

              {/* WhatsApp */}
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  WhatsApp Profissional
                </label>
                <div className="relative rounded-xl shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="tel"
                    required
                    placeholder="11999999999"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              {/* E-mail */}
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
                    placeholder="amanda@estetica.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              </div>

              {/* Senha */}
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
                    required
                    placeholder="Min. 6 caracteres"
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

              {/* Botão de Enviar */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-xl shadow-md transition-all-custom cursor-pointer mt-6"
              >
                <span>{isLoading ? 'Cadastrando...' : 'Criar minha Conta'}</span>
              </button>

              <div className="text-center mt-4 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-450">Já tem uma conta? </span>
                <Link href="/login" className="text-xs font-bold text-forest hover:underline">
                  Acessar conta existente
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
