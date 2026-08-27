'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Professional, Setting, ConfirmationMode, GoogleCalendarConnection } from '@/types/database';
import { Save, Sparkles, User, Settings as SettingsIcon, Paintbrush, Link as LinkIcon, Calendar } from 'lucide-react';
import { useToast } from '../ui/Toast';
import { updateProfessionalAction, updateSettingsAction } from '@/app/actions/professional';
import { BOOKING_THEMES, normalizeTheme } from '@/lib/booking-theme';
import { BookingDecor } from '@/components/booking/BookingDecor';
import { formatDateTimeBR } from '@/lib/format';

interface SettingsFormProps {
  professional: Professional;
  settings: Setting | null;
  googleConnection?: GoogleCalendarConnection | null;
  /** Resultado do OAuth do Google (?google=... no retorno do callback). */
  googleStatus?: string | null;
}

/** Recado para cada retorno possível da conexão com o Google. */
const GOOGLE_STATUS: Record<string, { tipo: 'ok' | 'erro'; titulo: string; texto: string }> = {
  success: { tipo: 'ok', titulo: 'Google Agenda conectada', texto: 'Seus agendamentos passam a aparecer na sua agenda do Google.' },
  cancelado: { tipo: 'erro', titulo: 'Conexão cancelada', texto: 'Você fechou a tela do Google antes de autorizar.' },
  conta_diferente: { tipo: 'erro', titulo: 'Conta diferente', texto: 'A autorização voltou para outra conta Lume. Entre na conta certa e tente de novo.' },
  nao_configurado: { tipo: 'erro', titulo: 'Integração indisponível', texto: 'A conexão com o Google ainda não foi configurada no servidor.' },
  error: { tipo: 'erro', titulo: 'Não deu certo', texto: 'Não foi possível concluir a conexão com o Google. Tente de novo.' },
};

export const SettingsForm: React.FC<SettingsFormProps> = ({
  professional,
  settings,
  googleConnection,
  googleStatus,
}) => {
  const router = useRouter();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'agenda' | 'branding' | 'integrations'>(
    googleStatus ? 'integrations' : 'profile'
  );
  const [syncing, setSyncing] = useState(false);
  const googleAviso = googleStatus ? GOOGLE_STATUS[googleStatus] ?? GOOGLE_STATUS.error : null;
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
  const [publicSlotsLimit, setPublicSlotsLimit] = useState<number>(settings?.public_slots_limit ?? 0);

  // Sinal / Antecipação (anti no-show)
  const [requiresDeposit, setRequiresDeposit] = useState(settings?.requires_deposit ?? false);
  const [depositInstructions, setDepositInstructions] = useState(
    settings?.deposit_instructions ||
    'Para confirmar seu horário, é necessário um sinal de 50% via Pix. Envie o comprovante pelo WhatsApp após agendar. 💛'
  );

  // Mantém os valores atuais do BD para não sobrescrever ao salvar as outras abas
  const whatsappConfirmation = settings?.whatsapp_confirmation_message ||
    'Oi, {nome}! Tudo bem? Passando para confirmar seu agendamento de {servico} no dia {data} às {horario}.';
  const whatsappCancel = settings?.whatsapp_cancel_message ||
    'Oi, {nome}! Seu agendamento de {servico} no dia {data} às {horario} precisou ser cancelado. Motivo: {motivo}.';

  // Estados de Branding
  // Estes DOIS hex não são tokens de interface: são DADO. É a cor de marca que
  // a profissional escolhe para a página pública dela, salva no banco. O valor
  // aqui é só o padrão de quem ainda não escolheu — e o padrão é a marca Lume.
  const [primaryColor, setPrimaryColor] = useState(professional.primary_color || '#6B1525');
  const [secondaryColor, setSecondaryColor] = useState(professional.secondary_color || '#EFC4CD');
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
        public_slots_limit: publicSlotsLimit,
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
      {/* O trilho de abas era um cartão de raio 24 com o item ativo pintado
          de vinho sólido e halo — seis retângulos vinho competindo com o botão
          "Salvar" da tela. Virou uma lista com hairline: o ativo ganha fundo
          wine-50 e um traço de 2px na aresta, do jeito que um seletor marca. */}
      <div className="w-full lg:w-60 shrink-0 card overflow-hidden self-start flex flex-row lg:flex-col overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`relative flex items-center gap-2.5 px-4 min-h-11 mono-micro transition-ui w-full cursor-pointer whitespace-nowrap
            border-b border-line last:border-b-0 lg:border-b lg:last:border-b-0 ${
            activeTab === 'profile'
              ? 'bg-wine-50 text-wine-700 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-wine-700'
              : 'text-n-600 hover:bg-n-25 hover:text-heading'
          }`}
        >
          <User className="h-4 w-4" />
          <span>Perfil Comercial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('agenda')}
          className={`relative flex items-center gap-2.5 px-4 min-h-11 mono-micro transition-ui w-full cursor-pointer whitespace-nowrap
            border-b border-line last:border-b-0 lg:border-b lg:last:border-b-0 ${
            activeTab === 'agenda'
              ? 'bg-wine-50 text-wine-700 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-wine-700'
              : 'text-n-600 hover:bg-n-25 hover:text-heading'
          }`}
        >
          <SettingsIcon className="h-4 w-4" />
          <span>Regras de Agenda</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`relative flex items-center gap-2.5 px-4 min-h-11 mono-micro transition-ui w-full cursor-pointer whitespace-nowrap
            border-b border-line last:border-b-0 lg:border-b lg:last:border-b-0 ${
            activeTab === 'branding'
              ? 'bg-wine-50 text-wine-700 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-wine-700'
              : 'text-n-600 hover:bg-n-25 hover:text-heading'
          }`}
        >
          <Paintbrush className="h-4 w-4" />
          <span>Identidade Visual</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('integrations')}
          className={`relative flex items-center gap-2.5 px-4 min-h-11 mono-micro transition-ui w-full cursor-pointer whitespace-nowrap
            border-b border-line last:border-b-0 lg:border-b lg:last:border-b-0 ${
            activeTab === 'integrations'
              ? 'bg-wine-50 text-wine-700 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[2px] before:bg-wine-700'
              : 'text-n-600 hover:bg-n-25 hover:text-heading'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          <span>Integrações</span>
        </button>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="flex-1 card p-5 md:p-6 space-y-6">
        
        {/* ABA: Perfil */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-body font-bold text-n-800 tracking-tight">Cadastro do Profissional</h3>
              <p className="text-caption text-n-600 mt-1">Configure seus dados cadastrais, redes sociais e endereço comercial.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Seu Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Nome da Clínica / Marca
                </label>
                <input
                  type="text"
                  required
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Número do WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  E-mail de Login
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Nome de Usuário Instagram
                </label>
                <input
                  type="text"
                  placeholder="Ex: @amandacosta.estetica"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  className="field-input"
                />
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Descrição Curta (Bio Rápida)
                </label>
                <input
                  type="text"
                  placeholder="Especialista em cílios e estética facial..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label className="mono-micro text-n-500 block mb-1.5">
                Sobre Você / Biografia Pública (Exibida no topo do agendamento)
              </label>
              <textarea
                rows={3}
                value={publicBio}
                onChange={(e) => setPublicBio(e.target.value)}
                className="field-input"
              />
            </div>

            {/* Endereço */}
            <div className="border-t border-n-100 pt-5 space-y-4">
              <h4 className="text-caption font-bold text-n-400 uppercase tracking-wider">Local de Atendimento</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="mono-micro text-n-500 block mb-1.5">
                    Endereço Completo
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="field-input"
                  />
                </div>

                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">
                    Cidade / Estado
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="São Paulo"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="field-input"
                    />
                    <input
                      type="text"
                      placeholder="SP"
                      maxLength={2}
                      value={state}
                      onChange={(e) => setState(e.target.value.toUpperCase())}
                      className="block w-12 px-2 py-2 border border-n-200 rounded-xl text-caption text-center font-bold"
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
              <h3 className="text-body font-bold text-n-800 tracking-tight">Regras Comerciais de Agendamento</h3>
              <p className="text-caption text-n-600 mt-1">Configure permissões, aviso prévio mínimo e antecedência máxima.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Confirmação de Agendamento
                </label>
                <select
                  value={confirmationMode}
                  onChange={(e) => setConfirmationMode(e.target.value as ConfirmationMode)}
                  className="field-input"
                >
                  <option value="manual">Manual (Aprovado por você no painel)</option>
                  <option value="automatic">Automático (Cai confirmado direto)</option>
                </select>
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Aviso Prévio Mínimo (Horas)
                </label>
                <input
                  type="number"
                  min={0}
                  value={minNoticeHours}
                  onChange={(e) => setMinNoticeHours(parseInt(e.target.value, 10) || 0)}
                  className="field-input"
                />
                <span className="text-caption text-n-400 mt-1 block">
                  Evita que clientes reservem horários muito próximos ao momento atual.
                </span>
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Limite de Antecedência Máxima (Dias)
                </label>
                <input
                  type="number"
                  min={1}
                  value={maxDaysAhead}
                  onChange={(e) => setMaxDaysAhead(parseInt(e.target.value, 10) || 30)}
                  className="field-input"
                />
                <span className="text-caption text-n-400 mt-1 block">
                  Determina até quantos dias no futuro os clientes podem agendar horários.
                </span>
              </div>

              <div className="flex items-center gap-2 self-center pt-4">
                <input
                  type="checkbox"
                  id="showPrice"
                  checked={showPricePublic}
                  onChange={(e) => setShowPricePublic(e.target.checked)}
                  className="h-4.5 w-4.5 rounded-sm border-n-200 text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 cursor-pointer"
                />
                <label htmlFor="showPrice" className="text-caption font-bold text-n-700 cursor-pointer">
                  Exibir preços dos serviços na página pública
                </label>
              </div>
            </div>

            {/* Limite de horários exibidos na página pública */}
            <div className="border-t border-n-200 pt-5 space-y-3">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Horários exibidos na página pública
                </label>
                <select
                  value={[0, 3, 5, 8].includes(publicSlotsLimit) ? String(publicSlotsLimit) : 'custom'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === 'custom') setPublicSlotsLimit(prev => ([0, 3, 5, 8].includes(prev) ? 4 : prev));
                    else setPublicSlotsLimit(parseInt(v, 10));
                  }}
                  className="field-input"
                >
                  <option value="0">Mostrar todos os horários disponíveis</option>
                  <option value="3">Mostrar até 3 horários por dia</option>
                  <option value="5">Mostrar até 5 horários por dia</option>
                  <option value="8">Mostrar até 8 horários por dia</option>
                  <option value="custom">Quantidade personalizada…</option>
                </select>
                {![0, 3, 5, 8].includes(publicSlotsLimit) && (
                  <input
                    type="number"
                    min={1}
                    value={publicSlotsLimit}
                    onChange={(e) => setPublicSlotsLimit(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="field-input"
                    placeholder="Quantidade de horários por dia"
                  />
                )}
                <span className="text-caption text-n-400 mt-1 block">
                  Afeta apenas o que a cliente vê. Você continua enxergando todos os horários no seu painel. Os horários mostrados são distribuídos ao longo do dia.
                </span>
              </div>
            </div>

            {/* Sinal / Antecipação (anti no-show) */}
            <div className="border-t border-n-200 pt-5 space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="requiresDeposit"
                  checked={requiresDeposit}
                  onChange={(e) => setRequiresDeposit(e.target.checked)}
                  className="h-4.5 w-4.5 mt-0.5 rounded-sm border-n-200 text-wine-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wine-700 cursor-pointer"
                />
                <label htmlFor="requiresDeposit" className="cursor-pointer">
                  <span className="text-caption font-bold text-n-700 block">Exigir sinal / antecipação para reservar</span>
                  <span className="text-caption text-n-600">Reduz faltas: a cliente vê o aviso de sinal ao agendar.</span>
                </label>
              </div>

              {requiresDeposit && (
                <div>
                  <label className="mono-micro text-n-500 block mb-1.5">
                    Instruções de Sinal (exibidas na página de agendamento)
                  </label>
                  <textarea
                    rows={3}
                    value={depositInstructions}
                    onChange={(e) => setDepositInstructions(e.target.value)}
                    className="field-input"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: Branding/Identidade Visual */}
        {activeTab === 'branding' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-body font-bold text-n-800 tracking-tight">Identidade Visual da Página Pública</h3>
              <p className="text-caption text-n-600 mt-1">Configure cores personalizadas para combinar com a identidade visual da sua marca.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Cor Primária (Fundo do Cabeçalho)
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
                    className="field-input"
                  />
                </div>
              </div>

              <div>
                <label className="mono-micro text-n-500 block mb-1.5">
                  Cor Secundária (Destaques e Botões selecionados)
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
                    className="field-input"
                  />
                </div>
              </div>

              {/* Elementos decorativos do popup */}
              <div className="sm:col-span-2">
                <label className="mono-micro text-n-500 block mb-1.5">
                  Elementos decorativos do agendamento
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {BOOKING_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setBookingTheme(t.id)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-2xl border text-caption font-bold transition-ui ${
                        bookingTheme === t.id ? 'border-wine-700 bg-wine-700/5 text-wine-700 shadow-xs' : 'border-n-200 text-n-500 hover:bg-n-50'
                      }`}
                    >
                      <span className="text-h3 leading-none">{t.emoji}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-caption text-n-400 mt-1.5">Detalhes delicados que aparecem no topo do seu popup de agendamento.</p>
              </div>

              {/* Preview ao vivo do popup */}
              <div className="sm:col-span-2 border border-n-200 rounded-3xl p-5 flex flex-col items-center justify-center gap-4 text-center">
                <span className="text-caption font-bold text-n-400 uppercase tracking-wider">Pré-visualização do popup</span>
                <div className="w-full max-w-xs rounded-2xl overflow-hidden border border-n-200 shadow-sm bg-white">
                  {/* Cabeçalho com decoração */}
                  <div className="relative p-5 text-white text-center overflow-hidden" style={{ backgroundColor: primaryColor }}>
                    <BookingDecor theme={bookingTheme} color={secondaryColor} />
                    <div className="h-11 w-11 mx-auto bg-white/10 rounded-2xl flex items-center justify-center font-semibold border border-white/15 z-10 relative" style={{ color: secondaryColor }}>
                      {(brandName || 'LU').substring(0, 2).toUpperCase()}
                    </div>
                    <p className="font-semibold text-label mt-2 z-10 relative">{brandName || 'Sua Marca'}</p>
                  </div>
                  {/* Corpo */}
                  <div className="p-4 space-y-2">
                    <button type="button" className="w-full py-2.5 font-bold rounded-xl text-caption text-white" style={{ backgroundColor: primaryColor }}>Avançar</button>
                    <button type="button" className="w-full py-2.5 font-semibold rounded-xl text-caption" style={{ backgroundColor: secondaryColor, color: primaryColor }}>14:00 (selecionado)</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: Integrações */}
        {activeTab === 'integrations' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-body font-bold text-n-800 tracking-tight">Integrações</h3>
              <p className="text-caption text-n-600 mt-1">Conecte sua conta Lume a outros serviços e plataformas.</p>
            </div>

            {/* Retorno do OAuth do Google (?google=...) */}
            {googleAviso && (
              <div
                className={`rounded-2xl border p-4 text-caption ${
                  googleAviso.tipo === 'ok'
                    ? 'border-line text-success'
                    : 'border-line text-danger'
                }`}
              >
                <p className="font-bold">{googleAviso.titulo}</p>
                <p className="mt-0.5 opacity-90">{googleAviso.texto}</p>
              </div>
            )}

            <div className="bg-n-50 border border-n-100 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-n-100 flex items-center justify-center shrink-0 text-info">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-label font-bold text-n-800">Google Agenda</h4>
                  <p className="text-caption text-n-500 mt-1 max-w-sm">
                    Seus agendamentos da Lume aparecem na sua agenda do Google. E o que você marca no Google
                    bloqueia o horário aqui — ninguém agenda em cima de um compromisso seu.
                  </p>
                  {googleConnection && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-success text-caption font-bold">
                        <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        Conectado como {googleConnection.google_email}
                      </span>
                      {googleConnection.last_synced_at && (
                        <span className="text-caption text-n-600">
                          Última sincronização: {formatDateTimeBR(googleConnection.last_synced_at)}
                        </span>
                      )}
                    </div>
                  )}
                  {googleConnection?.last_error && (
                    <p className="mt-2 text-caption text-danger border-l-2 border-danger pl-2 max-w-sm">
                      Última tentativa falhou: {googleConnection.last_error}. Se continuar, desconecte e conecte de novo.
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                {googleConnection ? (
                  <>
                    <button
                      type="button"
                      disabled={syncing}
                      onClick={async () => {
                        setSyncing(true);
                        try {
                          const res = await fetch('/api/google/sync', { method: 'POST' });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data?.error || '');
                          success('Sincronizado', `${data.created} bloqueio(s) criado(s), ${data.updated} atualizado(s).`);
                          router.refresh();
                        } catch (e) {
                          error('Erro', e instanceof Error && e.message ? e.message : 'Não foi possível sincronizar agora.');
                        } finally {
                          setSyncing(false);
                        }
                      }}
                      className="field-input"
                    >
                      {syncing ? 'Sincronizando…' : 'Sincronizar agora'}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (window.confirm('Desconectar a Google Agenda? Os agendamentos param de sincronizar e os bloqueios vindos do Google são removidos daqui.')) {
                          try {
                            const res = await fetch('/api/google/disconnect', { method: 'POST' });
                            if (!res.ok) throw new Error();
                            success('Desconectado', 'Sua Google Agenda foi desconectada.');
                            router.refresh();
                          } catch {
                            error('Erro', 'Não foi possível desconectar a Google Agenda.');
                          }
                        }
                      }}
                      className="w-full sm:w-auto px-4 py-2 text-caption font-bold text-danger bg-danger-bg hover:bg-n-100 rounded-xl transition-colors"
                    >
                      Desconectar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = '/api/google/auth';
                    }}
                    className="w-full sm:w-auto px-4 py-2 text-caption font-bold text-white bg-info hover:bg-info rounded-xl shadow-sm transition-colors"
                  >
                    Conectar Google Agenda
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rodapé do Formulário */}
        <div className="pt-6 border-t border-n-200 flex justify-end gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-6 py-3.5 bg-wine-700 hover:bg-wine-800 text-white text-caption font-bold rounded-2xl shadow-md transition-ui cursor-pointer"
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
