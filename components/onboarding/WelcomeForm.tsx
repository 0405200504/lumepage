'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Store, Link2, CalendarCheck, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { LumeLogo } from '@/components/ui/LumeLogo';
import { completeOnboardingAction } from '@/app/actions/professional';

/** Mesmo slugify do servidor — só para sugerir o endereço enquanto ela digita. */
function slugify(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** (11) 91234-5678 enquanto digita. */
function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const inputClass =
  'block w-full pl-10 pr-3 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui';

interface Props {
  initialName: string;
  initialBrandName: string;
  initialWhatsapp: string;
  initialSlug: string;
  baseUrl: string;
  googleReady: boolean;
  googleConnected: boolean;
}

/**
 * Boas-vindas de quem entrou com o Google.
 *
 * Dois passos curtos: o que a conta precisa para funcionar (negócio, WhatsApp,
 * endereço público) e, em seguida, o convite para plugar a Google Agenda —
 * que é opcional e pode ser feito depois nas configurações.
 */
export function WelcomeForm({
  initialName,
  initialBrandName,
  initialWhatsapp,
  initialSlug,
  baseUrl,
  googleReady,
  googleConnected,
}: Props) {
  const router = useRouter();
  const { error } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(initialName);
  const [brandName, setBrandName] = useState(initialBrandName);
  const [whatsapp, setWhatsapp] = useState(maskPhone(initialWhatsapp));
  const [slug, setSlug] = useState(initialSlug);
  // Enquanto ela não mexer no endereço, ele acompanha o nome do negócio.
  const [slugTocado, setSlugTocado] = useState(false);

  const handleBrand = (v: string) => {
    setBrandName(v);
    if (!slugTocado) setSlug(slugify(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await completeOnboardingAction({ name, brandName, whatsapp, slug });
    setSaving(false);
    if (!res.success) {
      error('Confira os dados', res.error || 'Não foi possível salvar.');
      return;
    }
    if (res.slug) setSlug(res.slug);
    setStep(2);
  };

  const irParaPainel = () => {
    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <div className="max-w-md w-full z-10 animate-fade-up">
      <div className="flex flex-col items-center mb-6">
        <LumeLogo variant="light" className="h-12 text-white mb-5" />
        <h2 className="text-h2 font-semibold text-white tracking-tight text-center">
          {step === 1 ? 'Falta pouco pra começar' : 'Conta pronta!'}
        </h2>
        <p className="text-caption text-white/70 mt-1.5 text-center">
          {step === 1
            ? 'Só o essencial pra sua agenda funcionar. Leva 30 segundos.'
            : 'Você já pode receber agendamentos.'}
        </p>
      </div>

      <div className="card-elevated glow-wine p-7 md:p-9">
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Seu Nome</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Nome do seu negócio</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Store className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex.: Studio Bella"
                  value={brandName}
                  onChange={(e) => handleBrand(e.target.value)}
                  className={inputClass}
                />
              </div>
              <p className="text-caption text-n-500 mt-1.5">É o nome que suas clientes veem na página de agendamento.</p>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">WhatsApp</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  inputMode="numeric"
                  placeholder="(00) 00000-0000"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(maskPhone(e.target.value))}
                  className="block w-full px-4 py-3 bg-n-50 border border-n-200 rounded-2xl text-label focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 transition-ui"
                />
              </div>
              <p className="text-caption text-n-500 mt-1.5">Usado nas confirmações e lembretes das clientes.</p>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-2">Endereço da sua página</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Link2 className="h-4 w-4 text-n-600" />
                </div>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => { setSlugTocado(true); setSlug(slugify(e.target.value)); }}
                  className={inputClass}
                />
              </div>
              <p className="text-caption text-n-500 mt-1.5 break-all">
                {baseUrl.replace(/^https?:\/\//, '')}/<strong className="text-wine-700">{slug || 'seu-endereco'}</strong>
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui cursor-pointer disabled:opacity-60 mt-2"
            >
              <span>{saving ? 'Salvando…' : 'Continuar'}</span>
              {!saving && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start gap-3 p-4 bg-n-50 border border-n-200 rounded-2xl">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-wine-700 text-white">
                <Check className="h-4 w-4" />
              </span>
              <div>
                <p className="text-label font-bold text-n-800">Sua página está no ar</p>
                <p className="text-caption text-n-500 mt-0.5 break-all">
                  {baseUrl.replace(/^https?:\/\//, '')}/{slug}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-label font-bold text-n-800 flex items-center gap-2">
                <CalendarCheck className="h-4 w-4 text-wine-700" />
                Conectar a Google Agenda
              </h3>
              <p className="text-caption text-n-500 mt-1.5 leading-relaxed">
                Seus agendamentos aparecem direto na sua agenda do Google — e os compromissos
                que você marca por lá bloqueiam o horário aqui, para ninguém agendar em cima.
              </p>
            </div>

            {googleConnected ? (
              <p className="text-caption font-bold text-success flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Já conectada.
              </p>
            ) : googleReady ? (
              <button
                type="button"
                // Rota de API que redireciona para o Google — navegação do
                // browser mesmo, não <Link> (que faria transição de rota).
                onClick={() => { window.location.href = '/api/google/auth'; }}
                className="tap flex items-center justify-center gap-2 w-full py-3.5 bg-white border border-n-200 text-n-700 text-label font-bold rounded-2xl hover:bg-n-50 transition-ui"
              >
                <CalendarCheck className="h-4 w-4 text-wine-700" />
                <span>Conectar minha Google Agenda</span>
              </button>
            ) : (
              <p className="text-caption text-n-500">
                A conexão com a Google Agenda ainda não está disponível. Você pode ativar depois em Configurações.
              </p>
            )}

            <button
              type="button"
              onClick={irParaPainel}
              className="tap flex items-center justify-center gap-2 w-full py-4 surface-wine hover:opacity-95 text-white text-label font-bold rounded-2xl shadow-soft transition-ui cursor-pointer"
            >
              <span>{googleConnected ? 'Ir para o painel' : 'Agora não, ir para o painel'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-caption font-bold text-n-600 hover:text-n-700 transition-colors"
            >
              Corrigir meus dados
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WelcomeForm;
