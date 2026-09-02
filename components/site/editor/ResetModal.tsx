'use client';

import React, { useState } from 'react';
import {
  RotateCcw, Sparkles, FileX, AlertTriangle, Check, Loader2,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { defaultSiteConfig, type SiteSeedProfessional } from '@/lib/site/config';
import { buildBlankConfig } from '@/lib/site/presets';
import type { SiteConfig } from '@/types/site';

export type ResetType = 'default' | 'wizard' | 'blank';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReset: (newConfig: SiteConfig) => Promise<void> | void;
  onOpenWizard: () => void;
  templateId: string;
  currentConfig: SiteConfig;
}

export function ResetModal({
  isOpen,
  onClose,
  onConfirmReset,
  onOpenWizard,
  templateId,
  currentConfig,
}: ResetModalProps) {
  const [selectedType, setSelectedType] = useState<ResetType>('default');
  const [loading, setLoading] = useState(false);

  const seed: SiteSeedProfessional = {
    name: currentConfig.identity.professionalName,
    brand_name: currentConfig.identity.studioName,
    city: currentConfig.identity.city,
    address: currentConfig.identity.address,
    whatsapp: currentConfig.identity.whatsapp,
    instagram: currentConfig.identity.instagram,
    email: currentConfig.identity.email,
    logo_url: currentConfig.identity.logoUrl,
    profile_image_url: currentConfig.identity.photoUrl,
  };

  const handleExecute = async () => {
    if (selectedType === 'wizard') {
      onClose();
      onOpenWizard();
      return;
    }

    setLoading(true);
    try {
      let resetConfig: SiteConfig;
      if (selectedType === 'default') {
        resetConfig = defaultSiteConfig(templateId, seed);
      } else {
        resetConfig = buildBlankConfig(templateId, seed);
      }

      await onConfirmReset(resetConfig);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Recomeçar do Zero / Resetar"
      trail={['Página', 'Resetar']}
      className="max-w-md"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-bold text-n-600 hover:text-n-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleExecute}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 ${
              selectedType === 'blank'
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-wine-700 hover:bg-wine-800'
            }`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : selectedType === 'wizard' ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            {selectedType === 'wizard'
              ? 'Abrir Assistente'
              : selectedType === 'default'
              ? 'Restaurar Modelo Padrão'
              : 'Limpar e Começar do Zero'}
          </button>
        </div>
      }
    >
      <div className="space-y-4 select-none py-1">
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-warning-bg border border-warning-border">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-warning leading-relaxed">
            <b>Atenção:</b> Esta ação substituirá os textos e personalizações atuais do seu rascunho.
            Seus dados básicos de contato (nome, WhatsApp, cidade) serão preservados.
          </p>
        </div>

        <div className="space-y-2.5">
          {/* Opção 1: Restaurar padrão do modelo */}
          <button
            type="button"
            onClick={() => setSelectedType('default')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
              selectedType === 'default'
                ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15'
                : 'border-n-200 bg-white hover:border-n-300 hover:bg-n-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-wine-100 text-wine-700 flex items-center justify-center shrink-0">
                <RotateCcw className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-[13px] font-bold text-heading">
                  Restaurar modelo original
                </h4>
                <p className="text-[11px] text-n-600 mt-0.5 leading-relaxed">
                  Restaura todos os textos elegantes, cores e estrutura de fábrica deste modelo.
                </p>
              </div>
              {selectedType === 'default' && (
                <span className="absolute top-3.5 right-3.5 h-5 w-5 rounded-full bg-wine-700 text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>

          {/* Opção 2: Recomeçar com o Assistente de Nicho */}
          <button
            type="button"
            onClick={() => setSelectedType('wizard')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
              selectedType === 'wizard'
                ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15'
                : 'border-n-200 bg-white hover:border-n-300 hover:bg-n-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-[13px] font-bold text-heading">
                    Recomeçar com o Assistente Rápido
                  </h4>
                  <span className="text-[9px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded">
                    Recomendado
                  </span>
                </div>
                <p className="text-[11px] text-n-600 mt-0.5 leading-relaxed">
                  Abre o assistente para escolher outro nicho (Nails, Lash, Estética, etc.) e preencher tudo pronto.
                </p>
              </div>
              {selectedType === 'wizard' && (
                <span className="absolute top-3.5 right-3.5 h-5 w-5 rounded-full bg-wine-700 text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>

          {/* Opção 3: Limpar tudo em branco */}
          <button
            type="button"
            onClick={() => setSelectedType('blank')}
            className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
              selectedType === 'blank'
                ? 'border-rose-600 bg-rose-50/60 ring-2 ring-rose-600/15'
                : 'border-n-200 bg-white hover:border-n-300 hover:bg-n-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                <FileX className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h4 className="text-[13px] font-bold text-heading">
                  Começar com página 100% em branco
                </h4>
                <p className="text-[11px] text-n-600 mt-0.5 leading-relaxed">
                  Limpa todos os textos, galeria e depoimentos de exemplo para você escrever tudo manualmente.
                </p>
              </div>
              {selectedType === 'blank' && (
                <span className="absolute top-3.5 right-3.5 h-5 w-5 rounded-full bg-rose-600 text-white flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </Modal>
  );
}
