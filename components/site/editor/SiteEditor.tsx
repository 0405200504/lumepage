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
} from 'lucide-react';
import type { SiteConfig, SiteStatus } from '@/types/site';
import type { PublicService } from '../types';
import { getTemplateMeta } from '@/lib/site/templates';
import { normalizeSlug, validateSlug, SLUG_MAX } from '@/lib/site/slug';
import { LIMITS } from '@/lib/site/config';
import { useToast } from '@/components/ui/Toast';
import {
  saveSiteDraftAction, publishSiteAction, unpublishSiteAction, updateSiteSlugAction,
} from '@/app/actions/site';
import { SiteRenderer } from '../SiteRenderer';
import { PreviewFrame, type PreviewDevice } from './PreviewFrame';
import { TemplatePicker } from './TemplatePicker';
import { FieldGroup, TextField, TextArea, ImageField } from './fields';
import {
  IdentityPanel, ThemePanel, ContentPanel, ServicesPanel, GalleryPanel,
  BeforeAfterPanel, TestimonialsPanel, ExtrasPanel, SectionsPanel, type PanelProps,
} from './panels';

type TabId =
  | 'template' | 'identity' | 'theme' | 'content' | 'services'
  | 'gallery' | 'beforeAfter' | 'testimonials' | 'extras' | 'sections' | 'address';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'template', label: 'Modelo', icon: LayoutTemplate },
  { id: 'identity', label: 'Identidade', icon: UserRound },
  { id: 'theme', label: 'Cores', icon: Palette },
  { id: 'content', label: 'Textos', icon: Type },
  { id: 'services', label: 'Serviços', icon: Sparkles },
  { id: 'gallery', label: 'Galeria', icon: Images },
  { id: 'beforeAfter', label: 'Antes e depois', icon: GitCompareArrows },
  { id: 'testimonials', label: 'Depoimentos', icon: MessageSquareQuote },
  { id: 'extras', label: 'Números e dúvidas', icon: HelpCircle },
  { id: 'sections', label: 'Seções', icon: ListOrdered },
  { id: 'address', label: 'Endereço e SEO', icon: Link2 },
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

  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [blocker, setBlocker] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [slugBusy, setSlugBusy] = useState(false);

  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = getTemplateMeta(templateId);
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
      success('Sua página está no ar! 🎉', 'Copie o link e coloque na bio do Instagram.');
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

  // ── Onboarding: escolher o modelo antes de tudo ───────────────────────────
  if (onboarding) {
    return (
      <div className="space-y-6 select-none">
        <header className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-wine-700 bg-accent-soft border border-accent-soft-border px-3 py-1.5 rounded-full">
            <Rocket className="h-3 w-3" /> Seu negócio inteiro em um único link
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-heading tracking-tight mt-4">
            Escolha o visual da sua página
          </h1>
          <p className="text-sm text-n-600 mt-2 leading-relaxed">
            Você pode trocar de modelo quando quiser — seus textos, fotos e depoimentos
            continuam onde estão. O conteúdo é seu; o modelo só muda o desenho.
          </p>
        </header>

        {isDemo && <DemoBanner />}

        <TemplatePicker
          selected={templateId}
          onSelect={id => { setTemplateId(id); dirty.current = true; }}
        />

        <div className="flex justify-center pt-2">
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const ok = await save(config, templateId, { silent: true });
              if (ok) { setOnboarding(false); setTab('identity'); }
            }}
            className="inline-flex items-center gap-2 px-6 h-11 bg-wine-700 hover:bg-wine-800 text-white text-body-sm font-semibold rounded-chip transition-ui cursor-pointer disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Continuar com {meta.name}
          </button>
        </div>

        {blocker && (
          <div className="max-w-2xl mx-auto flex items-start gap-2.5 border-l-2 border-warning pl-3 py-1">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <p className="text-[12px] text-warning leading-relaxed">{blocker}</p>
          </div>
        )}
      </div>
    );
  }

  // ── Editor ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 select-none">
      {isDemo && <DemoBanner />}

      {/* Barra de status e ações */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <StatusPill status={status} />
            <span className="text-[11px] text-n-400 truncate">
              {isDemo
                ? 'Conta teste — nada é salvo'
                : saving ? 'Salvando…' : savedAt ? 'Rascunho salvo' : 'Alterações são salvas sozinhas'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {status === 'published' && (
              <>
                <Link
                  href={`/${slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver página
                </Link>
                <button
                  type="button"
                  onClick={unpublish}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-[11px] font-bold rounded-xl border border-n-200 text-n-600 hover:bg-n-50 cursor-pointer transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-wine-700 hover:bg-wine-800 text-white text-[11px] font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-4 items-start">
        {/* Configurações */}
        <div className="card overflow-hidden">
          <nav className="flex gap-1 overflow-x-auto scrollbar-none border-b border-n-200 px-2 py-2">
            {TABS.map(t => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-[11px] font-bold rounded-xl transition-colors cursor-pointer ${
                    active ? 'bg-accent-soft text-wine-700' : 'text-n-600 hover:bg-n-50'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </nav>

          <div className="p-4 sm:p-5 max-h-[calc(100vh-16rem)] overflow-y-auto scroll-touch">
            {tab === 'template' && (
              <div className="space-y-4">
                <p className="text-[11px] text-n-600 leading-relaxed">
                  Troque de modelo à vontade: <b>nada do que você escreveu ou enviou é perdido</b>.
                  O conteúdo pertence a você, o modelo só o desenha de outro jeito.
                </p>
                <TemplatePicker
                  selected={templateId}
                  onSelect={id => { setTemplateId(id); dirty.current = true; }}
                />
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
          <div className="flex items-center justify-between gap-2 border-b border-n-200 bg-white px-4 py-2.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-n-600">
              Prévia ao vivo · {meta.name}
            </span>
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
            <PreviewFrame device={device} fontsHref={meta.fontsHref}>
              {preview}
            </PreviewFrame>
            <p className="text-[10px] text-n-400 text-center mt-3 leading-relaxed">
              Na prévia os botões de agendar não abrem o formulário. Publique e abra sua página
              para testar o agendamento de ponta a ponta.
            </p>
          </div>
        </div>
      </div>
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
