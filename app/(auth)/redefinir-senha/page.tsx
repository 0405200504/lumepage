'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { useToast } from '@/components/ui/Toast';
import { requestPasswordResetAction } from '@/app/actions/access';

export default function ForgotPasswordPage() {
  const { error } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      error('E-mail inválido', 'Informe um endereço de e-mail válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await requestPasswordResetAction(email);
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
          <h1 className="text-h2 font-semibold text-white tracking-tight">
            Recuperar senha
          </h1>
          <p className="text-caption text-white/55 mt-1.5 text-center">
            {sent
              ? 'Tudo certo! Verifique sua caixa de entrada.'
              : 'Informe seu e-mail para receber as instruções de acesso.'}
          </p>
        </div>

        {/* Card */}
        <div className="card-elevated glow-wine p-7 md:p-9">
          {sent ? (
            <div className="space-y-5 text-center animate-fade-up">
              <div className="w-12 h-12 rounded-full bg-success-bg text-success mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h2 className="text-body font-bold text-heading">
                  Link de recuperação enviado!
                </h2>
                <p className="text-caption text-n-600 leading-relaxed">
                  Se o e-mail <strong className="text-ink">{email}</strong> estiver cadastrado na Lume, enviamos um link seguro de uso único válido por 1 hora.
                </p>
                <p className="text-micro text-n-500">
                  Não encontrou? Confira também a pasta de spam ou lixo eletrônico.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="tap flex items-center justify-center gap-2 w-full py-3.5 surface-wine text-white text-label font-bold rounded-2xl shadow-soft transition-ui"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar para o login</span>
                </Link>
              </div>
            </div>
          ) : (
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
                    className="block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label placeholder-n-600/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui cursor-pointer disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                <span>{loading ? 'Enviando link...' : 'Enviar link de recuperação'}</span>
              </button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-caption font-semibold text-n-600 hover:text-wine-700 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Lembrou da senha? Voltar ao login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
