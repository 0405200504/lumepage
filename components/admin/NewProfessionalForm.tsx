'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProfessionalAction } from '@/app/actions/admin';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

/**
 * Formulário de cadastro de profissional.
 *
 * Era a própria page.tsx — uma página 'use client' que importava requireAdmin (sem
 * usar) e montava um `mockSession` com "Admin Lume / admin@lume.com" só para
 * alimentar o cabeçalho. Ou seja: a topbar mostrava um usuário inventado. Agora a
 * página é server (autentica de verdade e passa a sessão) e isto aqui é só o form.
 */
export function NewProfessionalForm() {
  const router = useRouter();
  const { success, error, info } = useToast();
  
  // Dados do Formulário
  const [name, setName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; tempPass: string } | null>(null);

  // Efeito de autocompletar slug a partir do nome da marca
  const handleBrandNameChange = (val: string) => {
    setBrandName(val);
    // Transforma "Amanda Costa Estética" em "amanda-costa-estetica"
    const autoSlug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
      .replace(/\s+/g, '-') // substitui espaços por hífen
      .replace(/-+/g, '-'); // evita múltiplos hífens
    setSlug(autoSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !brandName || !slug || !email || !whatsapp) {
      error('Preencha os campos', 'Preencha todos os campos obrigatórios (*).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await createProfessionalAction({
        name,
        brandName,
        slug,
        email,
        whatsapp: whatsapp.replace(/\D/g, ''),
        instagram: instagram || undefined,
        description: description || undefined,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined
      });

      if (res.success && res.professional) {
        success('Cadastrada!', 'Profissional adicionada à plataforma com sucesso.');
        setCreatedCredentials({
          email: res.professional.email,
          tempPass: res.tempPassword || 'Definida automaticamente'
        });
      } else {
        error('Falha ao Criar', res.error || 'Ocorreu um erro no cadastro.');
      }
    } catch {
      error('Erro', 'Erro ao enviar dados do formulário.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    info('Copiado!', 'Informação copiada para a área de transferência.');
  };

  return (
    <div className="space-y-6 max-w-2xl select-none">
        {/* Voltar */}
        <Link 
          href="/admin/professionals"
          className="inline-flex items-center gap-1.5 text-caption font-bold text-n-500 hover:text-wine-700 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Voltar para listagem</span>
        </Link>

        {/* Modal de Sucesso com Credenciais Geradas */}
        {createdCredentials && (
          <div className="bg-wine-950 text-white rounded-hero p-6 md:p-8 border border-wine-700 space-y-4 animate-scale-up">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-wine-200" />
              <div>
                <h3 className="text-body font-semibold tracking-tight text-wine-200">Acesso Inicial Gerado!</h3>
                <p className="text-caption text-white/70">Passe as credenciais abaixo para a profissional fazer o primeiro login.</p>
              </div>
            </div>

            <div className="bg-wine-700 rounded-2xl p-4 border border-wine-600 space-y-3 font-mono text-caption">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <span className="text-caption text-n-400 block font-sans font-bold">LINK PÚBLICO DE AGENDAMENTOS</span>
                  <span className="text-white">/agendar/{slug}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/agendar/${slug}`)}
                  className="p-2 hover:bg-white/10 rounded-lg text-n-300"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-center gap-4 border-t border-wine-600 pt-3">
                <div>
                  <span className="text-caption text-n-400 block font-sans font-bold">E-MAIL DE LOGIN</span>
                  <span className="text-wine-200">{createdCredentials.email}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(createdCredentials.email)}
                  className="p-2 hover:bg-white/10 rounded-lg text-n-300"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="flex justify-between items-center gap-4 border-t border-wine-600 pt-3">
                <div>
                  <span className="text-caption text-n-400 block font-sans font-bold">SENHA TEMPORÁRIA</span>
                  <span className="text-wine-200">{createdCredentials.tempPass}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(createdCredentials.tempPass)}
                  className="p-2 hover:bg-white/10 rounded-lg text-n-300"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => router.push('/admin/professionals')}
              className="px-5 py-2.5 bg-wine-200 hover:bg-wine-300 text-wine-800 text-caption font-bold rounded-xl shadow-xs transition-colors w-full cursor-pointer"
            >
              Concluir e Voltar
            </button>
          </div>
        )}

        {/* Formulário Principal */}
        {!createdCredentials && (
          <form onSubmit={handleSubmit} className="bg-white border border-n-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
            <h3 className="text-label font-bold text-n-800 uppercase tracking-wider border-b border-n-100 pb-3">
              Informações Cadastrais
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Costa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Nome Comercial / Marca *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Amanda Costa Estética"
                  value={brandName}
                  onChange={(e) => handleBrandNameChange(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Slug da Agenda (lumeagenda.com/agendar/...) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: amanda-costa"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  WhatsApp *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 11999999999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  E-mail de Login *
                </label>
                <input
                  type="email"
                  required
                  placeholder="Ex: amanda@estetica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Instagram (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: @amandacosta.estetica"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                Descrição Curta (Bio Pública)
              </label>
              <textarea
                rows={2}
                placeholder="Ex: Especialista em limpeza de pele e cuidado personalizado..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
              />
            </div>

            <h3 className="text-label font-bold text-n-800 uppercase tracking-wider border-b border-n-100 pt-4 pb-3">
              Endereço Comercial
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Av. Paulista, 1000 - Sala 42"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                />
              </div>

              <div>
                <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
                  Cidade / Estado
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="block w-full min-w-0 px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700"
                  />
                  <input
                    type="text"
                    placeholder="SP"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    className="block w-12 px-2 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 focus:border-wine-700 text-center font-bold"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-n-200">
              <Link
                href="/admin/professionals"
                className="px-5 py-3 border border-n-200 rounded-xl text-caption font-semibold text-n-600 hover:bg-n-50 transition-colors"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-3 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isLoading ? 'Cadastrando...' : 'Salvar e Gerar Acesso'}
              </button>
            </div>
          </form>
        )}
      </div>
  );
}

export default NewProfessionalForm;
