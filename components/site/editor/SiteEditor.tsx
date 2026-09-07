'use client';

/**
 * ============================================================================
 * LUME · Editor "Minha Página"
 * ============================================================================
 * Configurações à esquerda, página de verdade à direita. O preview usa o MESMO
 * SiteRenderer da página pública — o que ela vê enquanto edita é literalmente
 * o que vai ao ar.
 *
 * Rascunho e publicado são separados de propósito: a profissional mexe à
 * vontade (com autosave do rascunho) e a página no ar só muda quando ela
 * clica em "Publicar".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Palette, LayoutTemplate, UserRound, Type, Sparkles, Images, GitCompareArrows,
  MessageSquareQuote, HelpCircle, ListOrdered, Link2, Smartphone, Monitor,
  ExternalLink, Copy, Check, Loader2, Rocket, EyeOff, AlertTriangle, ArrowRight, FlaskConical,
  Wand2, RotateCcw, Pencil, Info, ChevronDown,
} from 'lucide-react';
import type { SiteConfig, SiteStatus } from '@/types/site';
import type { PublicService } from '../types';
import { getTemplateMeta } from '@/lib/site/templates';
import { getFontPair } from '@/lib/site/fonts';
import { matchLook, SITE_LOOKS, type ResolvedLook } from '@/lib/site/looks';
import { buildChecklist } from '@/lib/site/checklist';
import { normalizeSlug, validateSlug, SLUG_MAX } from '@/lib/site/slug';
import { LIMITS } from '@/lib/site/config';
import { useToast } from '@/components/ui/Toast';
import {
  saveSiteDraftAction, publishSiteAction, unpublishSiteAction, updateSiteSlugAction,
} from '@/app/actions/site';
import { SiteRenderer } from '../SiteRenderer';
import { PreviewFrame, type PreviewDevice } from './PreviewFrame';
import { TemplatePicker } from './TemplatePicker';
import { LookPicker } from './LookPicker';
import { ProgressChecklist } from './ProgressChecklist';
import { StepByStepWizardModal } from './StepByStepWizardModal';
import { QuickImageModal } from './QuickImageModal';
import { ResetModal } from './ResetModal';
import type { VisualElementPayload } from './VisualEditorContext';
import { FieldGroup, TextField, TextArea, ImageField } from './fields';
import {
  IdentityPanel, ThemePanel, ContentPanel, ServicesPanel, GalleryPanel,
  BeforeAfterPanel, TestimonialsPanel, ExtrasPanel, SectionsPanel, type PanelProps,
} from './panels';

type TabId =
  | 'template' | 'identity' | 'theme' | 'content' | 'services'
  | 'gallery' | 'beforeAfter' | 'testimonials' | 'extras' | 'sections' | 'address';

/**
 * A ordem aqui é o roteiro que a profissional segue: primeiro o visual (que é
 * a parte divertida e engaja), depois o conteúdo (o trabalho de verdade) e só
 * então os ajustes. Os grupos aparecem na navegação como separadores — sem
 * eles, onze abas em fila viram uma lista sem começo nem fim.
 */
const TAB_GROUPS: { label: string; tabs: { id: TabId; label: string; icon: React.ElementType }[] }[] = [
  {
    label: '1 · Visual',
    tabs: [
      { id: 'template', label: 'Modelos', icon: LayoutTemplate },
      { id: 'theme', label: 'Cores e fontes', icon: Palette },
    ],
  },
  {
    label: '2 · Conteúdo',
    tabs: [
      { id: 'identity', label: 'Identidade', icon: UserRound },
      { id: 'content', label: 'Textos', icon: Type },
      { id: 'services', label: 'Serviços', icon: Sparkles },
      { id: 'gallery', label: 'Galeria', icon: Images },
      { id: 'beforeAfter', label: 'Antes e depois', icon: GitCompareArrows },
      { id: 'testimonials', label: 'Depoimentos', icon: MessageSquareQuote },
      { id: 'extras', label: 'Números e dúvidas', icon: HelpCircle },
    ],
  },
  {
    label: '3 · Ajustes',
    tabs: [
      { id: 'sections', label: 'Seções', icon: ListOrdered },
      { id: 'address', label: 'Endereço e SEO', icon: Link2 },
    ],
  },
];

interface SiteEditorProps {
  professionalId: string;
  initialSlug: string;
  initialTemplateId: string;
  initialConfig: SiteConfig;
  initialStatus: SiteStatus;
  /** false = a profissional nunca salvou (mostramos o onboarding de modelo). */
  exists: boolean;
  services: PublicService[];
  appUrl: string;
  /** Conta teste: o editor funciona, mas nada é salvo nem vai ao ar. */
  isDemo?: boolean;
}

export function SiteEditor({
  professionalId, initialSlug, initialTemplateId, initialConfig, initialStatus,
  exists, services, appUrl, isDemo,
}: SiteEditorProps) {
  const { success, error: toastError } = useToast();

  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [status, setStatus] = useState<SiteStatus>(initialStatus);
  const [slug, setSlug] = useState(initialSlug);
  const [slugDraft, setSlugDraft] = useState(initialSlug);

  const [onboarding, setOnboarding] = useState(!exists);
  const [tab, setTab] = useState<TabId>('identity');
  const [device, setDevice] = useState<PreviewDevice>('mobile');

  const [canvaMode, setCanvaMode] = useState(true);
  const [quickImageState, setQuickImageState] = useState<{
    isOpen: boolean;
    fieldId: string;
    label: string;
    currentUrl?: string;
    imageKind?: string;
  }>({
    isOpen: false,
    fieldId: '',
    label: '',
  });

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugBusy, setSlugBusy] = useState(false);

  const dirty = useRef(false);
  /** Painel de configurações — usado para achar o campo clicado na prévia. */
  const panelRef = useRef<HTMLDivElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = getTemplateMeta(templateId);
  /** Modelo pronto correspondente ao estado atual — some assim que ela ajusta algo. */
  const currentLook = matchLook(templateId, config.theme);
  const publicUrl = `${(appUrl || '').replace(/\/+$/, '')}/${slug}`;

  /** Muta uma cópia do config — mesma ergonomia do editor, imutabilidade preservada. */
  const set = useCallback((mutate: (draft: SiteConfig) => void) => {
    setConfig(prev => {
      const next = structuredClone(prev);
      mutate(next);
      return next;
    });
    dirty.current = true;
  }, []);

  /**
   * Aplica um MODELO PRONTO: layout, paleta, dupla de fontes e cantos de uma
   * vez. Só mexe na apresentação — textos, fotos, serviços e seções ficam
   * exatamente como estavam, que é o que permite experimentar sem medo.
   */
  const applyLook = useCallback((resolved: ResolvedLook) => {
    setTemplateId(resolved.template.id);
    setConfig(prev => {
      const next = structuredClone(prev);
      next.theme = { ...next.theme, ...resolved.theme };
      return next;
    });
    dirty.current = true;
    success(`Modelo "${resolved.look.name}" aplicado`, 'Seus textos e fotos continuam onde estavam.');
  }, [success]);

  /** O que ainda falta na página — alimenta a barra de progresso e a navegação. */
  const checklist = useMemo(
    () => buildChecklist(config, services.length),
    [config, services.length],
  );
  const pendingTabs = useMemo(
    () => new Set(checklist.items.filter(i => !i.done).map(i => i.tab)),
    [checklist],
  );

  /**
   * Clique em um elemento da prévia (modo Canva). Para imagem, abre a troca
   * rápida. Para texto, faz o que a dica promete: abre a aba certa, ROLA até o
   * campo e põe o cursor dentro dele. Antes disso a promessa era meia — a aba
   * abria e a profissional tinha que caçar o campo na lista.
   */
  const handleVisualElementClick = useCallback((payload: VisualElementPayload) => {
    setTab(payload.tab);
    if (payload.kind === 'image') {
      setQuickImageState({
        isOpen: true,
        fieldId: payload.fieldId,
        label: payload.label,
        currentUrl: payload.currentValue,
        imageKind: payload.imageKind || 'geral',
      });
      return;
    }

    // O painel só troca de conteúdo no próximo render — daí o rAF duplo:
    // procurar o campo antes disso encontraria o painel antigo.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const holder = panelRef.current?.querySelector<HTMLElement>(`[data-field="${payload.fieldId}"]`);
      if (!holder) {
        success('Aba aberta ✏️', `Edite aqui: ${payload.label}`);
        return;
      }
      holder.scrollIntoView({ behavior: 'smooth', block: 'center' });
      holder.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')?.focus();
      // Um pulso de destaque: sem ele, em uma aba com dez campos, o cursor
      // aparece em um lugar que a profissional não estava olhando.
      holder.setAttribute('data-field-flash', 'true');
      setTimeout(() => holder.removeAttribute('data-field-flash'), 1600);
    }));
  }, [success]);

  /** Atualiza imagem com 1 clique vinda do popover rápido */
  const handleQuickUpdateImage = useCallback((fieldId: string, newUrl: string) => {
    set(d => {
      if (fieldId === 'identity.photoUrl') d.identity.photoUrl = newUrl;
      else if (fieldId === 'identity.logoUrl') d.identity.logoUrl = newUrl;
      else if (fieldId === 'content.hero.imageUrl') d.content.hero.imageUrl = newUrl;
      else if (fieldId === 'content.about.imageUrl') d.content.about.imageUrl = newUrl;
      else if (fieldId === 'seo.ogImageUrl') d.seo.ogImageUrl = newUrl;
    });
    success('Foto atualizada! 📸', 'A alteração foi aplicada na sua página.');
  }, [set, success]);

  /** Salva o rascunho. Recebe o estado atual por parâmetro — nada de ref lido
   *  na renderização, e nada de gravar uma versão velha por closure defasada. */
  const save = useCallback(async (
    cfg: SiteConfig,
    tpl: string,
    opts?: { silent?: boolean },
  ) => {
    if (saving) return false;
    setSaving(true);
    const res = await saveSiteDraftAction(professionalId, { config: cfg, templateId: tpl });
    setSaving(false);
    if (res.success) {
      dirty.current = false;
      setSavedAt(Date.now());
      setBlocker(null);
      if (!opts?.silent) success('Rascunho salvo', 'Suas alterações estão guardadas.');
      return true;
    }
    setBlocker(res.error);
    if (!opts?.silent) toastError('Não deu para salvar', res.error);
    return false;
  }, [professionalId, saving, success, toastError]);

  /** Aplica o resultado gerado pelo assistente rápido. */
  const handleCompleteWizard = useCallback(async (newConfig: SiteConfig, newTemplateId: string) => {
    setConfig(newConfig);
    setTemplateId(newTemplateId);
    dirty.current = true;
    setOnboarding(false);
    setTab('content');
    const ok = await save(newConfig, newTemplateId, { silent: false });
    if (ok) {
      success('Página pronta com sucesso! ✨', 'Textos e estrutura do seu nicho foram aplicados.');
    }
  }, [save, success]);

  /** Aplica a redefinição / reset do modelo. */
  const handleConfirmReset = useCallback(async (newConfig: SiteConfig) => {
    setConfig(newConfig);
    dirty.current = true;
    const ok = await save(newConfig, templateId, { silent: false });
    if (ok) {
      success('Modelo resetado com sucesso! 🔄', 'Sua página foi restaurada para o rascunho limpo.');
    }
  }, [save, templateId, success]);

  // Autosave do RASCUNHO: 2s parada de digitação. Nunca mexe no que está no ar.
  useEffect(() => {
    if (onboarding) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { if (dirty.current) save(config, templateId, { silent: true }); }, 2000);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [config, templateId, onboarding, save]);

  // Avisa antes de fechar a aba com alteração ainda não gravada.
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => { if (dirty.current) e.preventDefault(); };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, []);

  const publish = async () => {
    setPublishing(true);
    const res = await publishSiteAction(professionalId, { config, templateId });
    setPublishing(false);
    if (res.success) {
      dirty.current = false;
      setStatus('published');
      setSavedAt(Date.now());
      setBlocker(null);
      // Publicar com pendência essencial é permitido — a página é dela. Mas
      // dizer só "está no ar" esconderia que ela subiu sem foto ou sem serviço.
      if (checklist.missingEssential.length > 0) {
        success(
          'Sua página está no ar! 🎉',
          `Ainda falta${checklist.missingEssential.length > 1 ? 'm' : ''}: ${checklist.missingEssential.map(i => i.label.toLowerCase()).join(', ')}.`,
        );
      } else {
        success('Sua página está no ar! 🎉', 'Copie o link e coloque na bio do Instagram.');
      }
    } else {
      setBlocker(res.error);
      toastError('Não foi possível publicar', res.error);
    }
  };

  const unpublish = async () => {
    const res = await unpublishSiteAction(professionalId);
    if (res.success) {
      setStatus('unpublished');
      success('Página fora do ar', 'Seu conteúdo continua salvo aqui.');
    } else {
      toastError('Não deu certo', res.error);
    }
  };

  const saveSlug = async () => {
    const check = validateSlug(slugDraft);
    if (!check.ok) { toastError('Endereço inválido', check.error!); return; }
    setSlugBusy(true);
    const res = await updateSiteSlugAction(professionalId, check.slug);
    setSlugBusy(false);
    if (res.success) {
      setSlug(res.slug);
      setSlugDraft(res.slug);
      success('Endereço atualizado', `Sua página agora é /${res.slug}`);
    } else {
      toastError('Não foi possível trocar', res.error);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toastError('Não deu para copiar', 'Selecione e copie o endereço manualmente.');
    }
  };

  const panelProps: PanelProps = { config, set, professionalId, onError: msg => toastError('Imagem', msg) };

  const preview = useMemo(() => (
    <SiteRenderer slug={slug} templateId={templateId} config={config} services={services} preview />
  ), [slug, templateId, config, services]);

  // ── Onboarding: escolher o modelo ou usar o assistente ───────────────────
  if (onboarding) {
    return (
      <div className="space-y-6 select-none">
        <header className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-wine-700 bg-accent-soft border border-accent-soft-border px-3 py-1.5 rounded-full">
            <Rocket className="h-3 w-3" /> Seu negócio inteiro em um único link
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-heading tracking-tight mt-4">
            Como você prefere criar sua página?
          </h1>
          <p className="text-sm text-n-600 mt-2 leading-relaxed">
            Os dois caminhos terminam no mesmo editor, com tudo ainda editável. A diferença é
            só por onde você começa: <b>com os textos já escritos</b> para a sua profissão, ou
            <b> escolhendo o visual</b> primeiro.
          </p>
        </header>

        {isDemo && <DemoBanner />}

        {/* Card em Destaque: Assistente Rápido */}
        <div className="max-w-2xl mx-auto rounded-3xl border-2 border-wine-700/20 bg-gradient-to-b from-accent-soft/60 to-accent-soft/20 p-6 sm:p-7 shadow-sm text-center space-y-4">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-wine-700 text-white shadow-md mx-auto">
            <Wand2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-wine-800 bg-white/80 border border-wine-200 px-2.5 py-0.5 rounded-full">
              ✨ Recomendado · Leva 2 minutos
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-heading">
              Assistente de Criação Rápida por Nicho
            </h3>
            <p className="text-xs sm:text-sm text-n-600 max-w-md mx-auto leading-relaxed">
              Oito perguntas curtas (nome, cidade, WhatsApp, foto) e a página sai pronta:
              títulos, texto de &ldquo;sobre mim&rdquo;, perguntas frequentes e o visual mais
              indicado para a sua profissão. Você ajusta o que quiser depois.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-2 px-7 h-12 bg-wine-700 hover:bg-wine-800 text-white text-sm font-bold rounded-2xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              Criar Minha Página Pronta Agora
            </button>
          </div>
        </div>

        <div className="relative max-w-2xl mx-auto my-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-n-200" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-n-50 px-3 text-n-400 font-medium uppercase tracking-wider text-[10px]">
Ou comece escolhendo o visual
            </span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-3">
          <p className="text-[12px] text-n-600 text-center leading-relaxed max-w-xl mx-auto">
            São {SITE_LOOKS.length} modelos prontos: cada um já vem com <b>layout, paleta de
            cores, fontes e cantos</b> combinados. Clique para ver como fica — trocar de modelo
            nunca apaga o que você escreveu.
          </p>
          <LookPicker
            templateId={templateId}
            theme={config.theme}
            onSelect={applyLook}
          />
        </div>

        {/* A lista tem 22 cards: sem esta barra colada no rodapé, o botão de
            continuar ficaria a uma rolagem inteira de distância do modelo que
            ela acabou de escolher. */}
        <div className="sticky bottom-3 z-10 max-w-2xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-n-200 bg-white/95 backdrop-blur px-4 py-3 shadow-lg">
            <span className="text-[12px] text-n-600 min-w-0">
              Escolhido: <b className="text-heading">{currentLook?.name || meta.name}</b>
            </span>
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                const ok = await save(config, templateId, { silent: true });
                if (ok) { setOnboarding(false); setTab('identity'); }
              }}
              className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-body-sm font-bold rounded-chip transition-ui cursor-pointer disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Continuar e preencher
            </button>
          </div>
        </div>

        {blocker && (
          <div className="max-w-2xl mx-auto flex items-start gap-2.5 border-l-2 border-warning pl-3 py-1">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-warning leading-relaxed">{blocker}</p>
          </div>
        )}

        {/* Modal do Assistente durante Onboarding */}
        <StepByStepWizardModal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          professionalId={professionalId}
          onComplete={handleCompleteWizard}
          initialTemplateId={templateId}
          initialConfig={config}
        />
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 select-none">
      {isDemo && <DemoBanner />}

      {/* Barra de status e ações */}
      <div data-tour="module-action" className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusPill status={status} />
            <span className="text-[11px] text-n-400 truncate">
              {isDemo
                ? 'Conta teste — nada é salvo'
                : saving ? 'Salvando…' : savedAt ? 'Rascunho salvo' : 'Alterações são salvas sozinhas'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Ações de facilitação: Assistente Rápido e Reset */}
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border border-wine-200 bg-accent-soft text-wine-800 hover:bg-wine-100/70 transition-colors cursor-pointer shadow-2xs"
            >
              <Wand2 className="h-3.5 w-3.5 text-wine-700" /> Assistente Rápido
            </button>

            <button
              type="button"
              onClick={() => setIsResetOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 transition-colors cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Recomeçar do zero
            </button>

            {status === 'published' && (
              <>
                <Link
                  href={`/${slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver página
                </Link>
                <button
                  type="button"
                  onClick={unpublish}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 cursor-pointer transition-colors"
                >
                  <EyeOff className="h-3.5 w-3.5" /> Tirar do ar
                </button>
              </>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={publishing || isDemo}
              title={isDemo ? 'A conta teste não publica páginas.' : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-wine-700 hover:bg-wine-800 text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {publishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
              {status === 'published' ? 'Publicar alterações' : 'Publicar página'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-n-100 border border-n-200 px-3 py-2.5">
          <Link2 className="h-3.5 w-3.5 text-n-400 shrink-0" />
          <span className="text-[12px] font-mono text-n-600 truncate flex-1">{publicUrl}</span>
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-wine-700 hover:underline shrink-0 cursor-pointer"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>

        {blocker && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning-border bg-warning-bg px-3.5 py-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-warning leading-relaxed">{blocker}</p>
          </div>
        )}
      </div>

      {/* Roteiro: "falta o quê?" respondido antes de a profissional abrir aba
          por aba procurando. */}
      <ProgressChecklist result={checklist} onGo={t => setTab(t as TabId)} />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 items-start">
        {/* Configurações */}
        <div className="card overflow-hidden">
          {/* Navegação agrupada: o ponto laranja marca a aba que ainda tem
              pendência na lista de "falta o quê" — assim a profissional sabe
              onde ir sem abrir aba por aba. */}
          <nav className="border-b border-n-200 px-2.5 py-2.5 space-y-2">
            {TAB_GROUPS.map(group => (
              <div key={group.label} className="flex flex-wrap items-center gap-1">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-n-400 pr-1 shrink-0">
                  {group.label}
                </span>
                {group.tabs.map(t => {
                  const Icon = t.icon;
                  const active = tab === t.id;
                  const pending = pendingTabs.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`relative inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1.5 text-[11px] font-bold rounded-xl transition-colors cursor-pointer ${
                        active ? 'bg-accent-soft text-wine-700' : 'text-n-600 hover:bg-n-50'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" /> {t.label}
                      {pending && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-warning"
                          title="Ainda falta algo aqui"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          <div ref={panelRef} className="p-4 sm:p-5 max-h-[calc(100vh-16rem)] overflow-y-auto scroll-touch">
            {tab === 'template' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-n-200 bg-n-50/60 px-3.5 py-3 flex gap-2.5">
                  <Info className="h-4 w-4 text-wine-700 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-n-600 leading-relaxed">
                    Cada modelo já vem com <b>layout, cores, fontes e cantos combinados</b>.
                    Experimente à vontade: <b>nada do que você escreveu ou enviou é perdido</b> —
                    o conteúdo é seu, o modelo só o desenha de outro jeito.
                  </p>
                </div>

                <LookPicker
                  templateId={templateId}
                  theme={config.theme}
                  onSelect={applyLook}
                />

                {/* Trocar só o layout continua possível, mas fora do caminho
                    principal: quem chega aqui quer ver a página pronta, não
                    montar a combinação peça por peça. */}
                <details className="rounded-2xl border border-n-200 overflow-hidden group">
                  <summary className="px-3.5 py-3 cursor-pointer list-none flex items-center justify-between hover:bg-n-50 transition-colors">
                    <span>
                      <span className="text-[12px] font-bold text-heading block">
                        Trocar só o layout, mantendo minhas cores
                      </span>
                      <span className="text-[10px] text-n-500 block mt-0.5">
                        Para quem já acertou a paleta e quer outra estrutura de página.
                      </span>
                    </span>
                    <ChevronDown className="h-4 w-4 text-n-400 shrink-0 transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="p-3.5 border-t border-n-100">
                    <TemplatePicker
                      selected={templateId}
                      onSelect={id => { setTemplateId(id); dirty.current = true; }}
                    />
                  </div>
                </details>
              </div>
            )}
            {tab === 'identity' && <IdentityPanel {...panelProps} />}
            {tab === 'theme' && <ThemePanel {...panelProps} />}
            {tab === 'content' && <ContentPanel {...panelProps} />}
            {tab === 'services' && <ServicesPanel {...panelProps} services={services} />}
            {tab === 'gallery' && <GalleryPanel {...panelProps} />}
            {tab === 'beforeAfter' && <BeforeAfterPanel {...panelProps} />}
            {tab === 'testimonials' && <TestimonialsPanel {...panelProps} />}
            {tab === 'extras' && <ExtrasPanel {...panelProps} />}
            {tab === 'sections' && <SectionsPanel {...panelProps} templateId={templateId} />}
            {tab === 'address' && (
              <div className="space-y-7">
                <FieldGroup
                  title="Endereço da sua página"
                  hint="É o mesmo endereço do seu agendamento — trocar aqui troca também o link /agendar. Avise suas clientes se você já divulgou o antigo."
                >
                  <div>
                    <label className="text-[11px] font-bold text-n-600 block mb-1.5">Seu link</label>
                    <div className="flex items-stretch gap-2">
                      <div className="flex items-center flex-1 rounded-xl border border-n-200 bg-white overflow-hidden">
                        <span className="px-3 text-[12px] text-n-400 border-r border-n-200 bg-n-100 py-2.5 whitespace-nowrap">
                          lume.com.br/
                        </span>
                        <input
                          className="flex-1 min-w-0 px-3 py-2.5 text-[13px] outline-none"
                          value={slugDraft}
                          maxLength={SLUG_MAX}
                          onChange={e => setSlugDraft(normalizeSlug(e.target.value))}
                          placeholder="marianails"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={saveSlug}
                        disabled={slugBusy || slugDraft === slug}
                        className="px-4 text-[11px] font-bold rounded-xl bg-wine-700 hover:bg-wine-800 text-white disabled:opacity-40 cursor-pointer transition-colors"
                      >
                        {slugBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Salvar'}
                      </button>
                    </div>
                    {slugDraft !== slug && (
                      <p className="text-[10px] text-warning mt-1.5 font-semibold">
                        Endereço ainda não salvo.
                      </p>
                    )}
                  </div>
                </FieldGroup>

                <FieldGroup
                  title="Como sua página aparece quando compartilhada"
                  hint="É o que a cliente vê ao receber seu link no WhatsApp ou no Instagram."
                >
                  <TextField label="Título" value={config.seo.title} max={LIMITS.title}
                    onChange={v => set(d => { d.seo.title = v; })}
                    placeholder="Marina Alves Nails — Nail Designer em São Paulo" />
                  <TextArea label="Descrição" value={config.seo.description} max={160} rows={3}
                    onChange={v => set(d => { d.seo.description = v; })}
                    placeholder="Alongamento em gel, blindagem e nail art. Agende online." />
                  <ImageField label="Imagem de compartilhamento" value={config.seo.ogImageUrl}
                    kind="compartilhamento" aspect="wide"
                    professionalId={professionalId} onError={msg => toastError('Imagem', msg)}
                    onChange={url => set(d => { d.seo.ogImageUrl = url; })}
                    hint="Vazio = usamos a imagem da capa." />
                </FieldGroup>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {/* Moldura de dispositivo: hairline + fundo n-100, raio `hero`.
            É o único lugar da tela onde o conteúdo de dentro NÃO segue o
            design system — ele é a página pública da profissional, com a cor
            de marca DELA. A moldura existe justamente para dizer "isto aqui é
            outro contexto". */}
        <div className="rounded-hero border border-line bg-n-100 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-n-200 bg-white px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-600">
                Prévia ao vivo · {currentLook?.name || `${meta.name} (personalizado)`}
              </span>
              <button
                type="button"
                onClick={() => setCanvaMode(!canvaMode)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                  canvaMode
                    ? 'bg-wine-700 text-white shadow-2xs'
                    : 'bg-n-100 text-n-600 hover:bg-n-200'
                }`}
                title="Clique nos textos e fotos da prévia para editar diretamente"
              >
                <Pencil className="h-3 w-3" />
                <span>{canvaMode ? 'Modo Canva: Ativo' : 'Ativar Modo Canva'}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-n-100 border border-n-200 p-0.5">
              {([
                { id: 'mobile' as const, icon: Smartphone, label: 'Celular' },
                { id: 'desktop' as const, icon: Monitor, label: 'Computador' },
              ]).map(d => {
                const Icon = d.icon;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDevice(d.id)}
                    aria-label={d.label}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                      device === d.id ? 'bg-wine-50 text-wine-700 border border-wine-200' : 'text-n-600'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4">
            <PreviewFrame
              device={device}
              fontsHref={getFontPair(config.theme.fontPair).href}
              canvaMode={canvaMode}
              onElementClick={handleVisualElementClick}
            >
              {preview}
            </PreviewFrame>
            <p className="text-[10px] text-n-400 text-center mt-3 leading-relaxed">
              {canvaMode
                ? '💡 Clique em qualquer texto ou foto da prévia: levamos você direto ao campo que muda aquilo.'
                : 'Na prévia os botões de agendar não abrem o formulário. Publique e abra sua página para testar o agendamento de ponta a ponta.'}
            </p>
          </div>
        </div>
      </div>

      {/* Modais de Facilitação, Troca Rápida de Imagem e Reset */}
      <StepByStepWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        professionalId={professionalId}
        onComplete={handleCompleteWizard}
        initialTemplateId={templateId}
        initialConfig={config}
      />

      <QuickImageModal
        isOpen={quickImageState.isOpen}
        onClose={() => setQuickImageState(prev => ({ ...prev, isOpen: false }))}
        label={quickImageState.label}
        fieldId={quickImageState.fieldId}
        currentUrl={quickImageState.currentUrl}
        imageKind={quickImageState.imageKind}
        professionalId={professionalId}
        onUpdateImage={handleQuickUpdateImage}
        onError={msg => toastError('Imagem', msg)}
      />

      <ResetModal
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        onConfirmReset={handleConfirmReset}
        onOpenWizard={() => setIsWizardOpen(true)}
        templateId={templateId}
        currentConfig={config}
      />
    </div>
  );
}

/**
 * Aviso da conta teste. Existe porque o silêncio aqui vira uma mentira: a
 * pessoa monta a página inteira, clica em publicar e só descobre depois que o
 * link não abre. Melhor dizer na primeira tela.
 */
function DemoBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-warning-border bg-warning-bg px-4 py-3">
      <FlaskConical className="h-4 w-4 text-warning shrink-0 mt-0.5" />
      <p className="text-[12px] text-warning leading-relaxed">
        <b>Você está na conta teste.</b> Pode explorar o editor à vontade — trocar de modelo,
        mexer nas cores, ver a prévia — mas <b>nada é salvo e a página não vai ao ar</b>.
        Entre com a sua conta da Lume para publicar de verdade.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: SiteStatus }) {
  const map: Record<SiteStatus, { label: string; cls: string }> = {
    draft: { label: 'Rascunho — ainda não publicada', cls: 'bg-n-100 text-n-600 border-n-200' },
    published: { label: 'Publicada', cls: 'bg-success-bg text-success border-success-border' },
    unpublished: { label: 'Fora do ar', cls: 'bg-warning-bg text-warning border-warning-border' },
  };
  const s = map[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-2.5 py-1.5 rounded-full border ${s.cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  );
}

export default SiteEditor;
