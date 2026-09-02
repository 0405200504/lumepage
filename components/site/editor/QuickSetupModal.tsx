'use client';

import React, { useState } from 'react';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Wand2,
  Phone, MapPin, Building2, User, HelpCircle, Eye,
} from 'lucide-react';
import { NICHE_LIST, type NicheId, type NichePreset, buildNicheConfig } from '@/lib/site/presets';
import { SITE_TEMPLATES, type SiteTemplateMeta } from '@/lib/site/templates';
import type { SiteConfig } from '@/types/site';
import { Modal } from '@/components/ui/Modal';
import { normalizeSlug } from '@/lib/site/slug';

interface QuickSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: SiteConfig, templateId: string) => Promise<void> | void;
  initialTemplateId?: string;
  initialConfig?: SiteConfig;
}

export function QuickSetupModal({
  isOpen,
  onClose,
  onComplete,
  initialTemplateId = 'editorial-nude',
  initialConfig,
}: QuickSetupModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedNiche, setSelectedNiche] = useState<NicheId>('nails');
  const [selectedTemplate, setSelectedTemplate] = useState<string>(initialTemplateId);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dados essenciais para o passo 3
  const [profName, setProfName] = useState(initialConfig?.identity.professionalName || '');
  const [studioName, setStudioName] = useState(initialConfig?.identity.studioName || '');
  const [role, setRole] = useState(initialConfig?.identity.role || '');
  const [whatsapp, setWhatsapp] = useState(initialConfig?.identity.whatsapp || '');
  const [city, setCity] = useState(initialConfig?.identity.city || '');

  const currentPreset = NICHE_LIST.find(n => n.id === selectedNiche) || NICHE_LIST[0];

  const handleNicheSelect = (niche: NichePreset) => {
    setSelectedNiche(niche.id);
    setSelectedTemplate(niche.recommendedTemplateId);
    if (!role || NICHE_LIST.some(n => n.sampleRoles.includes(role))) {
      setRole(niche.sampleRoles[0]);
    }
  };

  const handleFinish = async () => {
    setIsGenerating(true);
    try {
      const generated = buildNicheConfig(selectedNiche, selectedTemplate, {
        name: profName || undefined,
        brand_name: studioName || undefined,
        city: city || undefined,
        whatsapp: whatsapp || undefined,
        logo_url: initialConfig?.identity.logoUrl,
        profile_image_url: initialConfig?.identity.photoUrl,
        instagram: initialConfig?.identity.instagram,
        address: initialConfig?.identity.address,
      });

      if (role) {
        generated.identity.role = role;
        generated.seo.title = `${generated.identity.studioName || generated.identity.professionalName} — ${role}`;
      }

      await onComplete(generated, selectedTemplate);
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Assistente de Criação Rápida"
      trail={['Página', 'Assistente 2 min']}
      className="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
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
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold transition-all shadow-xs cursor-pointer"
              >
                Próximo passo <ArrowRight className="h-4 w-4" />
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
                    <Sparkles className="h-4 w-4 animate-spin" /> Gerando sua página…
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4" /> Gerar Minha Página Pronta
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 select-none py-1">
        {/* Indicador de Passos */}
        <div className="flex items-center justify-center gap-2 pb-2">
          {[
            { n: 1, label: 'Seu Nicho' },
            { n: 2, label: 'Visual & Modelo' },
            { n: 3, label: 'Dados Básicos' },
          ].map((item, idx) => {
            const active = step === item.n;
            const completed = step > item.n;
            return (
              <React.Fragment key={item.n}>
                {idx > 0 && (
                  <div
                    className={`h-0.5 w-8 transition-colors ${
                      completed ? 'bg-wine-700' : 'bg-n-200'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setStep(item.n as 1 | 2 | 3)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                    active
                      ? 'bg-wine-700 text-white ring-2 ring-wine-700/20'
                      : completed
                      ? 'bg-wine-50 text-wine-700 border border-wine-200'
                      : 'bg-n-100 text-n-500'
                  }`}
                >
                  <span className="flex items-center justify-center h-4 w-4 rounded-full text-[10px] font-bold">
                    {completed ? <Check className="h-3.5 w-3.5" /> : item.n}
                  </span>
                  <span>{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* PASSO 1: Escolha do Nicho */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center max-w-lg mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-heading">
                Qual é a sua área de atuação principal?
              </h3>
              <p className="text-[12px] text-n-600 mt-1">
                Vamos preencher sua página com textos magnéticos e perguntas frequentes
                específicas para o seu público.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {NICHE_LIST.map((niche) => {
                const active = selectedNiche === niche.id;
                return (
                  <button
                    key={niche.id}
                    type="button"
                    onClick={() => handleNicheSelect(niche)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      active
                        ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15 shadow-sm'
                        : 'border-n-200 bg-white hover:border-n-300 hover:bg-n-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-white border border-n-200 text-n-700 shadow-2xs">
                        {niche.badge}
                      </span>
                      {active && (
                        <span className="h-5 w-5 rounded-full bg-wine-700 text-white flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </div>

                    <h4 className="text-[14px] font-bold text-heading mt-2.5">
                      {niche.name}
                    </h4>
                    <p className="text-[11px] text-n-600 mt-1 leading-relaxed line-clamp-2">
                      {niche.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-n-200/60 flex flex-wrap gap-1">
                      {niche.keywords.slice(0, 3).map((kw, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-medium text-n-500 bg-n-100 px-1.5 py-0.5 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASSO 2: Escolha do Modelo */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center max-w-lg mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-heading">
                Escolha o estilo visual da sua página
              </h3>
              <p className="text-[12px] text-n-600 mt-1">
                Destacamos o modelo mais indicado para <b>{currentPreset.name}</b>, mas
                você pode escolher qualquer um.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {SITE_TEMPLATES.map((tmpl) => {
                const active = selectedTemplate === tmpl.id;
                const isRecommended = tmpl.id === currentPreset.recommendedTemplateId;
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
                    {/* Barra de destaque de recomendado */}
                    {isRecommended && (
                      <div className="bg-wine-700 text-white text-[9px] font-bold text-center py-1 tracking-wider uppercase">
                        ✨ Mais indicado
                      </div>
                    )}

                    {/* Miniatura do layout */}
                    <div
                      className="h-24 w-full p-3 flex flex-col justify-between"
                      style={{ background: tmpl.preview.background }}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          style={{
                            fontFamily: tmpl.preview.titleFont,
                            color: tmpl.preview.text,
                            fontSize: 10,
                            letterSpacing: '.08em',
                          }}
                        >
                          {tmpl.name}
                        </span>
                        <span
                          className="h-3 w-8 rounded-full"
                          style={{ background: tmpl.preview.accent }}
                        />
                      </div>
                      <div className="space-y-1">
                        <div
                          className="h-2 w-3/4 rounded"
                          style={{ background: `${tmpl.preview.text}22` }}
                        />
                        <div
                          className="h-2 w-1/2 rounded"
                          style={{ background: `${tmpl.preview.accent}44` }}
                        />
                      </div>
                    </div>

                    <div className="p-3">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="text-[13px] font-bold text-heading">
                          {tmpl.name}
                        </h5>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-n-500 bg-n-100 px-1.5 py-0.5 rounded">
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-n-600 mt-1 line-clamp-2">
                        {tmpl.bestFor}
                      </p>
                    </div>

                    {active && (
                      <span className="absolute top-2 right-2 h-5 w-5 rounded-full bg-wine-700 text-white flex items-center justify-center shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* PASSO 3: Dados Básicos */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-center max-w-lg mx-auto">
              <h3 className="text-base sm:text-lg font-bold text-heading">
                Confirme suas informações principais
              </h3>
              <p className="text-[12px] text-n-600 mt-1">
                Já puxamos os dados cadastrados. Você pode ajustar ou completar o que faltar.
              </p>
            </div>

            <div className="bg-n-50/70 border border-n-200 rounded-2xl p-4 sm:p-5 space-y-4 max-h-[380px] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                    <User className="h-3.5 w-3.5 text-wine-700" /> Seu nome
                  </label>
                  <input
                    type="text"
                    value={profName}
                    onChange={(e) => setProfName(e.target.value)}
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
                    onChange={(e) => setStudioName(e.target.value)}
                    placeholder="Ex: Marina Alves Studio"
                    className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-wine-700" /> Sua especialidade / título
                  </label>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder={currentPreset.sampleRoles[0]}
                    className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                    <Phone className="h-3.5 w-3.5 text-wine-700" /> WhatsApp de contato
                  </label>
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                    placeholder="5511999990000"
                    className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-n-700 flex items-center gap-1.5 mb-1.5">
                  <MapPin className="h-3.5 w-3.5 text-wine-700" /> Cidade ou Bairro
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: São Paulo - SP ou Jardins, SP"
                  className="w-full h-10 px-3 text-[13px] bg-white border border-n-200 rounded-xl focus:border-wine-700 focus:ring-1 focus:ring-wine-700 outline-none"
                />
              </div>

              <div className="p-3 bg-accent-soft border border-accent-soft-border rounded-xl flex items-start gap-2.5">
                <Wand2 className="h-4 w-4 text-wine-700 shrink-0 mt-0.5" />
                <p className="text-[11px] text-n-700 leading-relaxed">
                  Ao clicar em gerar, vamos criar títulos, textos de "sobre mim", perguntas
                  frequentes e seções de alta conversão. Você poderá ajustar tudo depois!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
