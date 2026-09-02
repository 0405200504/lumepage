'use client';

import React, { useState } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Wand2,
  Phone, MapPin, Building2, User, Camera, Instagram,
  Upload, Layers, CheckCircle2, ChevronRight,
} from 'lucide-react';
import { NICHE_LIST, type NicheId, type NichePreset, buildNicheConfig } from '@/lib/site/presets';
import { SITE_TEMPLATES, type SiteTemplateMeta } from '@/lib/site/templates';
import type { SiteConfig } from '@/types/site';
import { Modal } from '@/components/ui/Modal';
import { uploadSiteImage } from './uploadImage';

interface StepByStepWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  professionalId: string;
  onComplete: (config: SiteConfig, templateId: string) => Promise<void> | void;
  initialTemplateId?: string;
  initialConfig?: SiteConfig;
}

export function StepByStepWizardModal({
  isOpen,
  onClose,
  professionalId,
  onComplete,
  initialTemplateId = 'editorial-nude',
  initialConfig,
}: StepByStepWizardModalProps) {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 8;

  // Estado das respostas
  const [selectedNiche, setSelectedNiche] = useState<NicheId>('nails');
  const [profName, setProfName] = useState(initialConfig?.identity.professionalName || '');
  const [studioName, setStudioName] = useState(initialConfig?.identity.studioName || '');
  const [role, setRole] = useState(initialConfig?.identity.role || '');
  const [city, setCity] = useState(initialConfig?.identity.city || '');
  const [address, setAddress] = useState(initialConfig?.identity.address || '');
  const [whatsapp, setWhatsapp] = useState(initialConfig?.identity.whatsapp || '');
  const [instagram, setInstagram] = useState(initialConfig?.identity.instagram || '');
  const [photoUrl, setPhotoUrl] = useState(initialConfig?.identity.photoUrl || '');
  const [headline, setHeadline] = useState('');
  const [highlight, setHighlight] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplateId);

  const [uploading, setUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentPreset = NICHE_LIST.find(n => n.id === selectedNiche) || NICHE_LIST[0];

  const handleNicheSelect = (niche: NichePreset) => {
    setSelectedNiche(niche.id);
    setSelectedTemplate(niche.recommendedTemplateId);
    if (!role || NICHE_LIST.some(n => n.sampleRoles.includes(role))) {
      setRole(niche.sampleRoles[0]);
    }
    if (!headline || NICHE_LIST.some(n => n.content.hero.headline === headline)) {
      setHeadline(niche.content.hero.headline);
      setHighlight(niche.content.hero.highlight);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const res = await uploadSiteImage(professionalId, file, 'retrato');
    setUploading(false);

    if (res.ok && res.url) {
      setPhotoUrl(res.url);
    }
  };

  const handleFinish = async () => {
    setIsGenerating(true);
    try {
      const generated = buildNicheConfig(selectedNiche, selectedTemplate, {
        name: profName || undefined,
        brand_name: studioName || undefined,
        city: city || undefined,
        address: address || undefined,
        whatsapp: whatsapp || undefined,
        instagram: instagram || undefined,
        logo_url: initialConfig?.identity.logoUrl,
        profile_image_url: photoUrl || initialConfig?.identity.photoUrl,
      });

      if (role) {
        generated.identity.role = role;
        generated.seo.title = `${generated.identity.studioName || generated.identity.professionalName} — ${role}`;
      }

      if (headline) {
        generated.content.hero.headline = headline;
      }
      if (highlight) {
        generated.content.hero.highlight = highlight;
      }

      await onComplete(generated, selectedTemplate);
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  const titles = [
    'Qual a sua área principal?',
    'Quem é você e sua marca?',
    'Qual é o seu título?',
    'Onde você atende?',
    'Seus canais de contato',
    'Sua foto principal',
    'Frase de destaque da capa',
    'Visual da sua página',
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Assistente Passo a Passo"
      trail={['Página', `Etapa ${step} de ${totalSteps}`]}
      className="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[12px] font-bold text-n-600 hover:bg-n-100 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-[12px] font-bold text-n-500 hover:text-n-700 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 6 && !photoUrl && (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="px-3.5 py-2 text-[11px] font-semibold text-n-500 hover:text-n-800 transition-colors cursor-pointer"
              >
                Pular esta etapa
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isGenerating}
                onClick={handleFinish}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-md cursor-pointer disabled:opacity-60"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-spin" /> Gerando seu site…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" /> Gerar Meu Site Prontinho!
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-5 select-none py-1">
        {/* Barra de Progresso Fina */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-n-500">
            <span>{titles[step - 1]}</span>
            <span>{step} de {totalSteps}</span>
          </div>
          <div className="h-1.5 w-full bg-n-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-wine-700 transition-all duration-300 rounded-full"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* ETAPA 1: Nicho */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Qual é a sua especialidade principal?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Isso define os textos e sugestões de serviços para a sua página.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {NICHE_LIST.map((niche) => {
                const active = selectedNiche === niche.id;
                return (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() => handleNicheSelect(niche)}
                    className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                      active
                        ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15 shadow-sm'
                        : 'border-n-200 bg-white hover:border-n-300 hover:bg-n-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-n-200 text-n-700">
                        {niche.badge}
                      </span>
                      {active && (
                        <span className="h-4 w-4 rounded-full bg-wine-700 text-white flex items-center justify-center shrink-0">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                    <h4 className="text-[13px] font-bold text-heading mt-2">
                      {niche.name}
                    </h4>
                    <p className="text-[10px] text-n-600 mt-0.5 leading-relaxed line-clamp-2">
                      {niche.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ETAPA 2: Nome e Estúdio */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Como você se chama e qual o nome da sua marca?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Esses nomes vão aparecer no topo e no rodapé do seu site.
              </p>
            </div>

            <div className="bg-n-50/60 border border-n-200 rounded-2xl p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <User className="h-3.5 w-3.5 text-wine-700" /> Seu nome profissional
                </label>
                <input
                  type="text"
                  value={profName}
                  onChange={e => setProfName(e.target.value)}
                  placeholder="Ex: Marina Alves"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-wine-700" /> Nome do estúdio / marca
                </label>
                <input
                  type="text"
                  value={studioName}
                  onChange={e => setStudioName(e.target.value)}
                  placeholder="Ex: Marina Alves Studio"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 3: Título profissional */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Qual é a sua especialidade ou título?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Aparece no cabeçalho ao lado do seu nome (ex: "Nail Designer", "Lash Artist").
              </p>
            </div>

            <div className="bg-n-50/60 border border-n-200 rounded-2xl p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-n-700 block mb-1.5">
                  Sugestões para {currentPreset.name}:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {currentPreset.sampleRoles.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                        role === r
                          ? 'bg-wine-700 text-white border-wine-700'
                          : 'bg-white text-n-700 border-n-200 hover:border-wine-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-n-700 block mb-1.5">
                  Ou digite seu próprio título:
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  placeholder="Ex: Especialista em Nail Art & Alongamento"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 4: Cidade e Endereço */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Onde suas clientes encontram você?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Para as clientes saberem a localização do seu espaço de atendimento.
              </p>
            </div>

            <div className="bg-n-50/60 border border-n-200 rounded-2xl p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-wine-700" /> Cidade ou Bairro
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Ex: São Paulo - SP ou Moema, SP"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <Building2 className="h-3.5 w-3.5 text-wine-700" /> Endereço completo (opcional)
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Ex: Av. Ibirapuera, 1200 — Sala 42"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 5: WhatsApp e Instagram */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Quais são seus canais de contato?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Botões de WhatsApp e Instagram serão adicionados à sua página.
              </p>
            </div>

            <div className="bg-n-50/60 border border-n-200 rounded-2xl p-4 space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <Phone className="h-3.5 w-3.5 text-wine-700" /> WhatsApp para contato
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  placeholder="5511999990000"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
                <span className="text-[10px] text-n-400 mt-1 block">Com DDD e DDI, somente números.</span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <Instagram className="h-3.5 w-3.5 text-wine-700" /> Instagram (sem o @)
                </label>
                <input
                  type="text"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value.replace(/^@/, ''))}
                  placeholder="marinaalvesstudio"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 6: Foto Principal */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Envie a sua foto principal
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Uma foto sua de perfil ou do seu espaço transmite confiança e profissionalismo.
              </p>
            </div>

            <div className="bg-n-50/60 border border-n-200 rounded-2xl p-4 text-center space-y-3">
              {photoUrl ? (
                <div className="space-y-2">
                  <div className="relative mx-auto w-32 aspect-square rounded-2xl overflow-hidden border-2 border-wine-700 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoUrl} alt="Foto de perfil" className="w-full h-full object-cover" />
                  </div>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-wine-700 bg-white border border-wine-200 hover:bg-wine-50 transition-colors cursor-pointer shadow-2xs">
                    <Upload className="h-3.5 w-3.5" /> Trocar foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-n-300 hover:border-wine-700 rounded-2xl bg-white hover:bg-wine-50/30 transition-all cursor-pointer">
                  <div className="h-12 w-12 rounded-full bg-accent-soft text-wine-700 flex items-center justify-center shadow-2xs mb-2">
                    <Camera className="h-6 w-6" />
                  </div>
                  <span className="text-[12px] font-bold text-n-700">
                    {uploading ? 'Enviando imagem…' : 'Clique para escolher uma foto'}
                  </span>
                  <span className="text-[10px] text-n-400 mt-0.5">JPG, PNG ou WEBP até 5MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                </label>
              )}
            </div>
          </div>
        )}

        {/* ETAPA 7: Frase de Impacto */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Qual frase de impacto vai na sua capa?
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Escolha uma frase magnética do seu nicho ou personalize do seu jeito.
              </p>
            </div>

            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => {
                  setHeadline(currentPreset.content.hero.headline);
                  setHighlight(currentPreset.content.hero.highlight);
                }}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  headline === currentPreset.content.hero.headline
                    ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15'
                    : 'border-n-200 bg-white hover:border-n-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-wine-800 bg-white border border-wine-200 px-2 py-0.5 rounded">
                    Sugerida para {currentPreset.name}
                  </span>
                  {headline === currentPreset.content.hero.headline && (
                    <Check className="h-4 w-4 text-wine-700" />
                  )}
                </div>
                <p className="text-[13px] font-bold text-heading mt-2">
                  {currentPreset.content.hero.headline}{' '}
                  <span className="text-wine-700 italic">{currentPreset.content.hero.highlight}</span>
                </p>
              </button>

              <div className="bg-n-50/60 border border-n-200 rounded-2xl p-3.5 space-y-2">
                <label className="text-[11px] font-bold text-n-700 block">
                  Ou digite seu próprio título:
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="Ex: Cuidado feito sob medida"
                  className="w-full h-9 px-3 text-[12px] bg-white border border-n-200 rounded-xl outline-none focus:border-wine-700"
                />
                <input
                  type="text"
                  value={highlight}
                  onChange={e => setHighlight(e.target.value)}
                  placeholder="Ex: para você realçar sua beleza (destaque)"
                  className="w-full h-9 px-3 text-[12px] bg-white border border-n-200 rounded-xl outline-none focus:border-wine-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* ETAPA 8: Modelo Visual */}
        {step === 8 && (
          <div className="space-y-3">
            <div className="text-left">
              <h3 className="text-base font-bold text-heading">
                Escolha o modelo visual que mais te agrada
              </h3>
              <p className="text-[12px] text-n-600 mt-0.5">
                Destacamos o modelo mais indicado para {currentPreset.name}.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[340px] overflow-y-auto pr-1">
              {SITE_TEMPLATES.map((tmpl) => {
                const active = selectedTemplate === tmpl.id;
                const isRec = tmpl.id === currentPreset.recommendedTemplateId;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`text-left rounded-2xl border bg-white overflow-hidden transition-all cursor-pointer relative ${
                      active
                        ? 'border-wine-700 ring-2 ring-wine-700/20 shadow-md'
                        : 'border-n-200 hover:border-n-300'
                    }`}
                  >
                    {isRec && (
                      <div className="bg-wine-700 text-white text-[8px] font-bold text-center py-0.5 uppercase tracking-wider">
                        ✨ Mais indicado
                      </div>
                    )}
                    <div
                      className="h-16 w-full p-2 flex flex-col justify-between"
                      style={{ background: tmpl.preview.background }}
                    >
                      <span style={{ fontFamily: tmpl.preview.titleFont, color: tmpl.preview.text, fontSize: 10 }}>
                        {tmpl.name}
                      </span>
                      <div className="h-1.5 w-12 rounded" style={{ background: tmpl.preview.accent }} />
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-bold text-heading">{tmpl.name}</span>
                        <span className="text-[9px] text-n-500 bg-n-100 px-1 py-0.5 rounded">{tmpl.category}</span>
                      </div>
                      <p className="text-[10px] text-n-500 mt-0.5 line-clamp-1">{tmpl.bestFor}</p>
                    </div>
                    {active && (
                      <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-wine-700 text-white flex items-center justify-center">
                        <Check className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
