'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, ProfessionalStatus } from '@/types/database';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { updateProfessionalAction } from '@/app/actions/professional';
import { useToast } from '../ui/Toast';
import Link from 'next/link';

interface EditProfessionalPanelProps {
  professional: Professional;
}

export const EditProfessionalPanel: React.FC<EditProfessionalPanelProps> = ({
  professional
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Estados
  const [name, setName] = useState(professional.name);
  const [brandName, setBrandName] = useState(professional.brand_name);
  const [slug, setSlug] = useState(professional.slug);
  const [email, setEmail] = useState(professional.email);
  const [whatsapp, setWhatsapp] = useState(professional.whatsapp);
  const [instagram, setInstagram] = useState(professional.instagram || '');
  const [description, setDescription] = useState(professional.description || '');
  const [publicBio, setPublicBio] = useState(professional.public_bio || '');
  const [address, setAddress] = useState(professional.address || '');
  const [city, setCity] = useState(professional.city || '');
  const [state, setState] = useState(professional.state || '');
  const [status, setStatus] = useState<ProfessionalStatus>(professional.status);

  // Paleta de Cores
  const [primaryColor, setPrimaryColor] = useState(professional.primary_color || '#6B1525');
  const [secondaryColor, setSecondaryColor] = useState(professional.secondary_color || '#eccbd2');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await updateProfessionalAction(professional.id, {
        name,
        brand_name: brandName,
        slug: slug.trim().toLowerCase(),
        email,
        whatsapp: whatsapp.replace(/\D/g, ''),
        instagram: instagram || null,
        description: description || null,
        public_bio: publicBio || null,
        address: address || null,
        city: city || null,
        state: state || null,
        status,
        primary_color: primaryColor,
        secondary_color: secondaryColor
      });

      if (res.success) {
        success('Salvo!', 'Cadastro da profissional atualizado com sucesso.');
        router.push('/admin/professionals');
        router.refresh();
      } else {
        error('Falha ao salvar', res.error || 'Ocorreu um erro.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha na rede.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl select-none">
      {/* Voltar */}
      <Link 
        href="/admin/professionals"
        className="inline-flex items-center gap-1.5 text-caption font-bold text-n-500 hover:text-wine-700 transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Voltar para listagem</span>
      </Link>

      <form onSubmit={handleSubmit} className="bg-white border border-n-200 rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        <h3 className="text-label font-bold text-n-800 uppercase tracking-wider border-b border-n-100 pb-3">
          Editar Informações Principais
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Nome Completo
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
            />
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Nome Comercial / Marca
            </label>
            <input
              type="text"
              required
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
            />
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Slug da Agenda (lumeagenda.com/agendar/...)
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700 font-mono"
            />
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              WhatsApp
            </label>
            <input
              type="tel"
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
            />
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              E-mail Comercial
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
            />
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Instagram
            </label>
            <input
              type="text"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
            />
          </div>
        </div>

        <div>
          <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
            Descrição Curta (Bio Rápida)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
          />
        </div>

        <div>
          <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
            Bio Completa da Página Pública
          </label>
          <textarea
            rows={3}
            value={publicBio}
            onChange={(e) => setPublicBio(e.target.value)}
            className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
          />
        </div>

        {/* Cores e Status */}
        <h3 className="text-label font-bold text-n-800 uppercase tracking-wider border-b border-n-100 pt-4 pb-3">
          Estilização Visual (Branding) e Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Cor Primária (Fundo)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-9 border border-n-200 rounded-xl cursor-pointer"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="block w-full px-3 py-2 border border-n-200 rounded-xl text-caption font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Cor Secundária (Destaque)
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-9 w-9 border border-n-200 rounded-xl cursor-pointer"
              />
              <input
                type="text"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="block w-full px-3 py-2 border border-n-200 rounded-xl text-caption font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Status da Operação
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProfessionalStatus)}
              className="block w-full px-3 py-2.5 border border-n-200 bg-white rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600"
            >
              <option value="active">Ativo (Agendamento Liberado)</option>
              <option value="paused">Pausado (Agenda Suspensa)</option>
              <option value="cancelled">Cancelado (Acesso Bloqueado)</option>
            </select>
          </div>
        </div>

        {/* Endereço */}
        <h3 className="text-label font-bold text-n-800 uppercase tracking-wider border-b border-n-100 pt-4 pb-3">
          Localização Comercial
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-caption font-bold text-n-600 uppercase tracking-wider mb-1.5">
              Endereço Comercial Completo
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="block w-full px-3 py-2.5 border border-n-200 rounded-xl text-caption focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-600 focus:border-wine-700"
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
                className="block w-full min-w-0 px-3 py-2.5 border border-n-200 rounded-xl text-caption"
              />
              <input
                type="text"
                placeholder="SP"
                maxLength={2}
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                className="block w-12 px-2 py-2.5 border border-n-200 rounded-xl text-caption text-center font-bold"
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
            className="px-5 py-3 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Save className="h-4 w-4" />
            <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default EditProfessionalPanel;
