'use client';

/**
 * ============================================================================
 * Tela inicial de "Minha Página" — modo simples
 * ============================================================================
 * O que a profissional vê depois de criar a página: o link, o estado (no ar
 * ou não), a prévia no celular e CINCO botões grandes. Cada botão abre um
 * modal com uma decisão só. Nada de abas, nada de "headline".
 *
 * A edição completa continua existindo, atrás de "Edição avançada".
 */

import React, { useState } from 'react';
import {
  Palette, Camera, UserRound, Link2, SlidersHorizontal, Copy, Check, ExternalLink,
  Rocket, EyeOff, Loader2, AlertTriangle, Instagram, ChevronRight, FlaskConical,
} from 'lucide-react';
import type { SiteConfig, SiteStatus } from '@/types/site';
import type { PublicService } from '../types';
import type { ResolvedLook } from '@/lib/site/looks';
import { matchLook } from '@/lib/site/looks';
import { getFontPair } from '@/lib/site/fonts';
import { getTemplateMeta } from '@/lib/site/templates';
import type { ChecklistResult } from '@/lib/site/checklist';
import { Modal } from '@/components/ui/Modal';
import { SiteRenderer } from '../SiteRenderer';
import { PreviewFrame } from './PreviewFrame';
import { LookPicker } from './LookPicker';
import { QuickImageModal } from './QuickImageModal';
import { EssentialsForm, type EssentialsValue } from './EssentialsForm';
import { LinksPanel } from './LinksPanel';

type Sheet = null | 'look' | 'photo' | 'data' | 'links';

export interface SimpleHomeProps {
  config: SiteConfig;
  templateId: string;
  status: SiteStatus;
  publicUrl: string;
  services: PublicService[];
  professionalId: string;
  isDemo?: boolean;
  saving: boolean;
  publishing: boolean;
  /** Há mudança salva no rascunho que ainda não foi para o ar. */
  hasUnpublished: boolean;
  blocker: string | null;
  checklist: ChecklistResult;
  set: (mutate: (draft: SiteConfig) => void) => void;
  applyLook: (resolved: ResolvedLook) => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onOpenAdvanced: () => void;
  onError: (msg: string) => void;
}

function essentialsFrom(c: SiteConfig): EssentialsValue {
  return {
    photoUrl: c.identity.photoUrl,
    professionalName: c.identity.professionalName,
    studioName: c.identity.studioName,
    role: c.identity.role,
    whatsapp: c.identity.whatsapp,
    instagram: c.identity.instagram,
    city: c.identity.city,
    address: c.identity.address,
    hours: c.content.location.hours,
  };
}

export function SimpleHome(p: SimpleHomeProps) {
  const {
    config, templateId, status, publicUrl, services, professionalId, isDemo,
    saving, publishing, hasUnpublished, blocker, checklist, set, applyLook,
    onPublish, onUnpublish, onOpenAdvanced, onError,
  } = p;

  const [sheet, setSheet] = useState<Sheet>(null);
  const [copied, setCopied] = useState(false);

  const look = matchLook(templateId, config.theme);
  const visualName = look?.name || `${getTemplateMeta(templateId).name} (personalizado)`;
  const isLinks = config.links.mode === 'links';
  const live = status === 'published';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { onError('Selecione e copie o endereço manualmente.'); }
  };

  const applyEssentials = (v: EssentialsValue) => set(d => {
    d.identity.photoUrl = v.photoUrl;
    d.identity.professionalName = v.professionalName;
    d.identity.studioName = v.studioName;
    d.identity.role = v.role;
    d.identity.whatsapp = v.whatsapp.replace(/\D/g, '');
    d.identity.phone = d.identity.whatsapp;
    d.identity.instagram = v.instagram.replace(/^@/, '');
    d.identity.city = v.city;
    d.identity.address = v.address;
    d.content.location.hours = v.hours;
    // A foto da capa e do "sobre" seguem a foto principal enquanto a
    // profissional não escolher outra na edição avançada.
    if (!d.content.hero.imageUrl || d.content.hero.imageUrl === config.identity.photoUrl) d.content.hero.imageUrl = v.photoUrl;
    if (!d.content.about.imageUrl || d.content.about.imageUrl === config.identity.photoUrl) d.content.about.imageUrl = v.photoUrl;
  });

  const tiles: { id: Sheet | 'advanced'; icon: React.ElementType; title: string; desc: string }[] = [
    { id: 'look', icon: Palette, title: 'Trocar o visual', desc: `Agora: ${visualName}` },
    { id: 'photo', icon: Camera, title: 'Minha foto', desc: config.identity.photoUrl ? 'Trocar a foto principal' : 'Você ainda não colocou foto' },
    { id: 'data', icon: UserRound, title: 'Meus dados', desc: 'Nome, profissão, WhatsApp, Instagram, endereço' },
    { id: 'links', icon: Link2, title: isLinks ? 'Meus links' : 'Formato e links', desc: isLinks ? 'Página só com links · botões e ordem' : 'Site completo · mudar para só links' },
    { id: 'advanced', icon: SlidersHorizontal, title: 'Edição avançada', desc: 'Textos, galeria, depoimentos e seções' },
  ];

  const pending = checklist.missingEssential;

  return (
    <div className="space-y-4 select-none">
      {isDemo && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3">
          <FlaskConical className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[12px] text-warning leading-relaxed">
            <b>Conta teste:</b> explore à vontade, mas nada é salvo e a página não vai ao ar.
          </p>
        </div>
      )}

      {/* Link + estado + publicar */}
      <div data-tour="module-action" className="card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-full border ${
              live ? 'bg-success-bg text-success border-success-border'
                : status === 'unpublished' ? 'bg-warning-bg text-warning border-warning-border'
                : 'bg-n-100 text-n-600 border-n-200'
            }`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {live ? 'No ar' : status === 'unpublished' ? 'Fora do ar' : 'Ainda não publicada'}
            </span>
            <span className="text-[11px] text-n-400 truncate">
              {isDemo ? 'Nada é salvo na conta teste' : saving ? 'Salvando…' : hasUnpublished && live ? 'Há mudanças ainda não publicadas' : 'Tudo salvo'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {live && (
              <button type="button" onClick={onUnpublish}
                className="inline-flex items-center gap-1.5 px-3 h-10 text-[12px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 cursor-pointer">
                <EyeOff className="h-3.5 w-3.5" /> Tirar do ar
              </button>
            )}
            {(!live || hasUnpublished) && (
              <button type="button" onClick={onPublish} disabled={publishing || isDemo}
                title={isDemo ? 'A conta teste não publica páginas.' : undefined}
                className="inline-flex items-center gap-1.5 px-4 h-10 bg-wine-700 hover:bg-wine-800 text-white text-[12px] font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                {live ? 'Publicar mudanças' : 'Publicar página'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-n-100 border border-n-200 px-3 py-3">
          <Link2 className="h-4 w-4 text-n-400 shrink-0" />
          <span className="text-[13px] font-mono text-heading truncate flex-1">{publicUrl}</span>
          <button type="button" onClick={copy}
            className="inline-flex items-center gap-1 text-[12px] font-bold text-wine-700 hover:underline shrink-0 cursor-pointer">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {live && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir minha página"
              className="icon-chip shrink-0"><ExternalLink className="h-4 w-4" /></a>
          )}
        </div>

        <p className="text-[11.5px] text-n-500 flex items-center gap-1.5">
          <Instagram className="h-3.5 w-3.5 shrink-0" />
          No Instagram: Editar perfil → Links → colar este endereço.
        </p>

        {blocker && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-warning leading-relaxed">{blocker}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)] gap-4 items-start">
        {/* Ações */}
        <div className="space-y-3 order-2 lg:order-1">
          {pending.length > 0 && (
            <div className="rounded-2xl border border-warning-border bg-warning-bg px-4 py-3">
              <p className="text-[12px] font-bold text-warning">Para a página ficar completa, falta:</p>
              <ul className="mt-1.5 space-y-1">
                {pending.map(it => (
                  <li key={it.id} className="text-[12px] text-warning flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-current" /> {it.label}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tiles.map(t => {
              const Icon = t.icon;
              const advanced = t.id === 'advanced';
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => advanced ? onOpenAdvanced() : setSheet(t.id as Sheet)}
                  className={`card card-interactive text-left p-4 flex items-center gap-3.5 cursor-pointer ${advanced ? 'sm:col-span-2' : ''}`}
                >
                  <span className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center ${advanced ? 'bg-n-100 text-n-600' : 'bg-accent-soft text-wine-700'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-[14px] font-bold text-heading block">{t.title}</span>
                    <span className="text-[11.5px] text-n-500 block mt-0.5 truncate">{t.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-n-300 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Prévia no celular */}
        <div className="rounded-hero border border-line bg-n-100 overflow-hidden order-1 lg:order-2">
          <div className="flex items-center justify-between border-b border-n-200 bg-white px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-600">Como a cliente vê</span>
            <span className="text-[10px] text-n-400">{isLinks ? 'Só links' : 'Site completo'}</span>
          </div>
          <div className="p-4">
            <PreviewFrame device="mobile" fontsHref={getFontPair(config.theme.fontPair).href} canvaMode={false}>
              <SiteRenderer slug="" templateId={templateId} config={config} services={services} preview />
            </PreviewFrame>
          </div>
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}
      <Modal open={sheet === 'look'} onClose={() => setSheet(null)} title="Trocar o visual"
        trail={['Minha Página', visualName]} className="sm:max-w-3xl!"
        footer={
          <button type="button" onClick={() => setSheet(null)}
            className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-[13px] font-bold rounded-xl cursor-pointer">
            <Check className="h-4 w-4" /> Pronto
          </button>
        }>
        <p className="text-[12px] text-n-600 mb-3">
          Toque em um modelo e veja a prévia mudar. Seus textos e fotos continuam iguais.
        </p>
        <LookPicker templateId={templateId} theme={config.theme} onSelect={applyLook} />
      </Modal>

      <QuickImageModal
        isOpen={sheet === 'photo'}
        onClose={() => setSheet(null)}
        label="Foto principal"
        fieldId="identity.photoUrl"
        currentUrl={config.identity.photoUrl}
        imageKind="retrato"
        professionalId={professionalId}
        onUpdateImage={(_, url) => set(d => {
          const old = d.identity.photoUrl;
          d.identity.photoUrl = url;
          if (!d.content.hero.imageUrl || d.content.hero.imageUrl === old) d.content.hero.imageUrl = url;
          if (!d.content.about.imageUrl || d.content.about.imageUrl === old) d.content.about.imageUrl = url;
        })}
        onError={onError}
      />

      <Modal open={sheet === 'data'} onClose={() => setSheet(null)} title="Meus dados"
        trail={['Minha Página']} className="sm:max-w-2xl!"
        footer={
          <button type="button" onClick={() => setSheet(null)}
            className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-[13px] font-bold rounded-xl cursor-pointer">
            <Check className="h-4 w-4" /> Pronto
          </button>
        }>
        <EssentialsForm
          value={essentialsFrom(config)}
          onChange={applyEssentials}
          professionalId={professionalId}
          onError={onError}
        />
      </Modal>

      <Modal open={sheet === 'links'} onClose={() => setSheet(null)} title="Formato e links"
        trail={['Minha Página']} className="sm:max-w-2xl!"
        footer={
          <button type="button" onClick={() => setSheet(null)}
            className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-[13px] font-bold rounded-xl cursor-pointer">
            <Check className="h-4 w-4" /> Pronto
          </button>
        }>
        <LinksPanel config={config} set={set} />
      </Modal>
    </div>
  );
}

export default SimpleHome;
