'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, Setting, ConfirmationMode } from '@/types/database';
import { Save, Sparkles, User, Settings, MessageSquare, Paintbrush, ExternalLink } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateProfessionalAction, updateSettingsAction } from '@/app/actions/professional';
import { BOOKING_THEMES, normalizeTheme } from '@/lib/booking-theme';
import { BookingDecor } from '@/components/booking/BookingDecor';

interface SettingsFormProps {
  professional: Professional;
  settings: Setting | null;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  professional,
  settings
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'agenda' | 'whatsapp' | 'branding'>('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados de Cadastro
  const [name, setName] = useState(professional.name);
  const [brandName, setBrandName] = useState(professional.brand_name);
  const [whatsapp, setWhatsapp] = useState(professional.whatsapp);
  const [email, setEmail] = useState(professional.email);
  const [instagram, setInstagram] = useState(professional.instagram || '');
  const [description, setDescription] = useState(professional.description || '');
  const [publicBio, setPublicBio] = useState(professional.public_bio || '');
  const [address, setAddress] = useState(professional.address || '');
  const [city, setCity] = useState(professional.city || '');
  const [state, setState] = useState(professional.state || '');

  // Estados de Configurações de Agenda
  const [confirmationMode, setConfirmationMode] = useState<ConfirmationMode>(settings?.confirmation_mode || 'manual');
  const [minNoticeHours, setMinNoticeHours] = useState(settings?.min_notice_hours || 3);
  const [maxDaysAhead, setMaxDaysAhead] = useState(settings?.max_days_ahead || 30);
  const [showPricePublic, setShowPricePublic] = useState(settings?.show_price_public ?? true);

  // Sinal / Antecipação (anti no-show)
  const [requiresDeposit, setRequiresDeposit] = useState(settings?.requires_deposit ?? false);
  const [depositInstructions, setDepositInstructions] = useState(
    settings?.deposit_instructions ||
    'Para confirmar seu horário, é necessário um sinal de 50% via Pix. Envie o comprovante pelo WhatsApp após agendar. 💛'
  );

  // Estados de Mensagens do WhatsApp
  const [whatsappConfirmation, setWhatsappConfirmation] = useState(
    settings?.whatsapp_confirmation_message || 
    'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.'
  );
  const [whatsappCancel, setWhatsappCancel] = useState(
    settings?.whatsapp_cancel_message || 
    'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.'
  );

  // Estados de Branding
  const [primaryColor, setPrimaryColor] = useState(professional.primary_color || '#500b18');
  const [secondaryColor, setSecondaryColor] = useState(professional.secondary_color || '#eccbd2');
  const [bookingTheme, setBookingTheme] = useState<string>(normalizeTheme(settings?.booking_theme));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Atualizar profissional
      const pRes = await updateProfessionalAction(professional.id, {
        name,
        brand_name: brandName,
        whatsapp: whatsapp.replace(/\D/g, ''),
        email,
        instagram: instagram || null,
        description: description || null,
        public_bio: publicBio || null,
        address: address || null,
        city: city || null,
        state: state || null,
        primary_color: primaryColor,
        secondary_color: secondaryColor
      });

      // 2. Atualizar configurações
      const sRes = await updateSettingsAction(professional.id, {
        confirmation_mode: confirmationMode,
        min_notice_hours: minNoticeHours,
        max_days_ahead: maxDaysAhead,
        show_price_public: showPricePublic,
        whatsapp_confirmation_message: whatsappConfirmation,
        whatsapp_cancel_message: whatsappCancel,
        requires_deposit: requiresDeposit,
        deposit_instructions: depositInstructions,
        booking_theme: bookingTheme
      });

      if (pRes.success && sRes.success) {
        success('Salvo!', 'Configurações de perfil e agenda atualizadas com sucesso.');
        router.refresh();
      } else {
        error('Falha ao salvar', pRes.error || sRes.error || 'Ocorreu um erro.');
      }
    } catch (e) {
      error('Erro', 'Ocorreu uma falha no salvamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 select-none max-w-5xl">
      {/* Abas Laterais */}
      <div className="w-full lg:w-60 shrink-0 bg-white border border-[#efe9e6] rounded-3xl p-4 shadow-xs self-start flex flex-row lg:flex-col gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold rounded-xl transition-all w-full cursor-pointer whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'bg-[#500b18] text-white shadow-md shadow-black/10' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Perfil Comercial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold rounded-xl transition-all w-full cursor-pointer whitespace-nowrap ${
            activeTab === 'agenda' 
              ? 'bg-[#500b18] text-white shadow-md shadow-black/10' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Regras de Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold rounded-xl transition-all w-full cursor-pointer whitespace-nowrap ${
            activeTab === 'whatsapp' 
              ? 'bg-[#500b18] text-white shadow-md shadow-black/10' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          <span>Mensagens WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2.5 px-4 py-3 text-xs font-bold rounded-xl transition-all w-full cursor-pointer whitespace-nowrap ${
            activeTab === 'branding' 
              ? 'bg-[#500b18] text-white shadow-md shadow-black/10' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
          }`}
        >
          <Paintbrush className="h-4 w-4" />
          <span>Identidade Visual</span>
        </button>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="flex-1 bg-white border border-[#efe9e6] rounded-3xl p-6 md:p-8 shadow-xs space-y-6">
        
        {/* ABA: Perfil */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Cadastro do Profissional</h3>
              <p className="text-xs text-gray-450 mt-1">Configure seus dados cadastrais, redes sociais e endereço comercial.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Seu Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Nome da Clínica / Marca
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Nome de Usuário Instagram
                </label>
                <input
                  type="text"
                  placeholder="Ex: @amandacosta.estetica"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Descrição Curta (Bio Rápida)
                </label>
                <input
                  type="text"
                  placeholder="Especialista em cílios e estética facial..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                Sobre Você / Biografia Pública (Exibida no topo do agendamento)
              </label>
              <textarea
                rows={3}
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
              />
            </div>

            {/* Endereço */}
            <div className="border-t border-gray-100 pt-5 space-y-4">
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Local de Atendimento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Cidade / Estado
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="block w-full min-w-0 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                    />
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="block w-12 px-2 py-2 border border-gray-200 rounded-xl text-xs text-center font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: Regras da Agenda */}
        {activeTab === 'agenda' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Regras Comerciais de Agendamento</h3>
              <p className="text-xs text-gray-450 mt-1">Configure permissões, aviso prévio mínimo e antecedência máxima.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Confirmação de Agendamento
                </label>
                <select
                  value={confirmationMode}
                  onChange={(e) => setConfirmationMode(e.target.value as ConfirmationMode)}
                  className="block w-full px-3 py-2 border border-gray-200 bg-white rounded-xl text-xs focus:outline-none"
                >
                  <option value="manual">Manual (Aprovado por você no painel)</option>
                  <option value="automatic">Automático (Cai confirmado direto)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Aviso Prévio Mínimo (Horas)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(parseInt(e.target.value, 10) || 0)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Evita que clientes reservem horários muito próximos ao momento atual.
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Limite de Antecedência Máxima (Dias)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxDaysAhead}
                  onChange={(e) => setMaxDaysAhead(parseInt(e.target.value, 10) || 30)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Determina até quantos dias no futuro os clientes podem agendar horários.
                </span>
              </div>

              <div className="flex items-center gap-2 self-center pt-4">
                <input
                  type="checkbox"
                  id="showPrice"
                  checked={showPricePublic}
                  onChange={(e) => setShowPricePublic(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-gray-200 text-forest focus:ring-forest/20 cursor-pointer"
                />
                <label htmlFor="showPrice" className="text-xs font-bold text-gray-700 cursor-pointer">
                  Exibir preços dos serviços na página pública
                </label>
              </div>
            </div>

            {/* Sinal / Antecipação (anti no-show) */}
            <div className="border-t border-gray-150 pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requiresDeposit"
                  checked={requiresDeposit}
                  onChange={(e) => setRequiresDeposit(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded-sm border-gray-200 text-forest focus:ring-forest/20 cursor-pointer"
                />
                <label htmlFor="requiresDeposit" className="cursor-pointer">
                  <span className="text-xs font-bold text-gray-700 block">Exigir sinal / antecipação para reservar</span>
                  <span className="text-[10px] text-gray-450">Reduz faltas: a cliente vê o aviso de sinal ao agendar.</span>
                </label>
              </div>

              {requiresDeposit && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                    Instruções de Sinal (exibidas na página de agendamento)
                  </label>
                  <textarea
                    rows={3}
                    value={depositInstructions}
                    onChange={(e) => setDepositInstructions(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-forest/20 focus:border-forest"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: WhatsApp */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Modelos de Mensagens de WhatsApp</h3>
              <p className="text-xs text-gray-450 mt-1">
                Customize as mensagens de notificação rápida de agendamento que você dispara pelo painel para suas clientes.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Mensagem de Confirmação
                </label>
                <textarea
                  rows={3}
                  value={whatsappConfirmation}
                  onChange={(e) => setWhatsappConfirmation(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Mensagem de Cancelamento
                </label>
                <textarea
                  rows={3}
                  value={whatsappCancel}
                  onChange={(e) => setWhatsappCancel(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                />
              </div>

              {/* Dicas de Tags */}
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-[11px] text-gray-500 leading-relaxed">
                <p className="font-bold text-gray-700">Variáveis Dinâmicas Aceitas:</p>
                <ul className="list-disc pl-4 mt-1.5 space-y-1">
                  <li><code className="bg-gray-200 px-1 rounded-sm text-forest font-bold">{'{nome}'}</code> - Nome da cliente</li>
                  <li><code className="bg-gray-200 px-1 rounded-sm text-forest font-bold">{'{servico}'}</code> - Nome do procedimento</li>
                  <li><code className="bg-gray-200 px-1 rounded-sm text-forest font-bold">{'{data}'}</code> - Data do agendamento</li>
                  <li><code className="bg-gray-200 px-1 rounded-sm text-forest font-bold">{'{horario}'}</code> - Horário de início</li>
                  <li><code className="bg-gray-200 px-1 rounded-sm text-forest font-bold">{'{motivo}'}</code> - Motivo do cancelamento (apenas no cancelamento)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ABA: Branding/Identidade Visual */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-gray-800 tracking-tight">Identidade Visual da Página Pública</h3>
              <p className="text-xs text-gray-450 mt-1">Configure cores personalizadas para combinar com a identidade visual da sua marca.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Cor Primária (Fundo do Cabeçalho)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-9 w-9 border border-gray-200 rounded-xl cursor-pointer"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-1.5">
                  Cor Secundária (Destaques e Botões selecionados)
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-9 w-9 border border-gray-200 rounded-xl cursor-pointer"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              {/* Elementos decorativos do popup */}
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-gray-450 uppercase tracking-wider mb-2">
                  Elementos decorativos do agendamento
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {BOOKING_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBookingTheme(t.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-xs font-bold transition-all ${
                        bookingTheme === t.id ? 'border-forest bg-forest/5 text-forest shadow-xs' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-lg leading-none">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">Detalhes delicados que aparecem no topo do seu popup de agendamento.</p>
              </div>

              {/* Preview ao vivo do popup */}
              <div className="sm:col-span-2 border border-gray-200 rounded-3xl p-5 flex flex-col items-center justify-center gap-4 text-center">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pré-visualização do popup</span>
                <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-gray-150 shadow-sm bg-white">
                  {/* Cabeçalho com decoração */}
                  <div className="relative p-5 text-white text-center overflow-hidden" style={{ backgroundColor: primaryColor }}>
                    <BookingDecor theme={bookingTheme} color={secondaryColor} />
                    <div className="h-11 w-11 mx-auto bg-white/10 rounded-2xl flex items-center justify-center font-black border border-white/15 z-10 relative" style={{ color: secondaryColor }}>
                      {(brandName || 'LU').substring(0, 2).toUpperCase()}
                    </div>
                    <p className="font-black text-sm mt-2 z-10 relative">{brandName || 'Sua Marca'}</p>
                  </div>
                  {/* Corpo */}
                  <div className="p-4 space-y-2">
                    <button type="button" className="w-full py-2.5 font-bold rounded-xl text-xs text-white" style={{ backgroundColor: primaryColor }}>Avançar</button>
                    <button type="button" className="w-full py-2.5 font-black rounded-xl text-xs" style={{ backgroundColor: secondaryColor, color: primaryColor }}>14:00 (selecionado)</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do Formulário */}
        <div className="pt-5 border-t border-gray-150 flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-3.5 bg-forest hover:bg-forest-hover text-white text-xs font-bold rounded-2xl shadow-md transition-all-custom cursor-pointer"
          >
            <Save className="h-4.5 w-4.5" />
            <span>{isSubmitting ? 'Salvando...' : 'Salvar Configurações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
export default SettingsForm;
