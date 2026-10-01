'use client';

/**
 * ============================================================================
 * Criação da página em 3 passos — sem editar nada
 * ============================================================================
 *   1. O que você faz?        → define textos, perguntas e sugestões
 *   2. Que cara ela vai ter?  → formato (site ou só links) + modelo pronto
 *   3. Confira seus dados     → já vem da conta; só confirma e publica
 *
 * No fim a página vai ao ar. Não existe "agora edite": ela recebe o link e as
 * instruções para colar na bio. Quem quiser mexer em texto encontra a edição
 * avançada depois, na tela inicial — mas não precisa.
 *
 * Tela inteira (não modal): em celular pequeno, modal com lista de 36 modelos
 * vira um scroll dentro de um scroll.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, Copy, ExternalLink, Loader2, Rocket, Sparkles,
  LayoutTemplate, List, Instagram, AlertTriangle,
} from 'lucide-react';
import type { SiteConfig, SitePageMode, SiteTheme } from '@/types/site';
import { NICHE_LIST, type NicheId, buildNicheConfig } from '@/lib/site/presets';
import { getLook, resolveLook, SITE_LOOKS, type ResolvedLook } from '@/lib/site/looks';
import { LIMITS, cleanText } from '@/lib/site/config';
import { LookPicker } from './LookPicker';
import { EssentialsForm, type EssentialsValue } from './EssentialsForm';

type Step = 1 | 2 | 3;

export interface SetupResult {
  ok: boolean;
  published: boolean;
  error?: string;
}

interface SimpleSetupProps {
  professionalId: string;
  initialConfig: SiteConfig;
  initialTemplateId: string;
  publicUrl: string;
  isDemo?: boolean;
  /** Salva e (se pedido) publica. Quem chama é o editor, dono do estado. */
  onFinish: (config: SiteConfig, templateId: string, publish: boolean) => Promise<SetupResult>;
  /** Depois da tela de sucesso: vai para a tela inicial. */
  onDone: () => void;
  onError: (msg: string) => void;
}

const STEP_TITLE: Record<Step, { title: string; sub: string }> = {
  1: { title: 'O que você faz?', sub: 'Com isso a gente já escreve os textos da página para você.' },
  2: { title: 'Que cara ela vai ter?', sub: 'Toque em um modelo. Cores, fontes e layout já vêm combinados.' },
  3: { title: 'Confira seus dados', sub: 'Já preenchemos com a sua conta. Ajuste o que quiser e publique.' },
};

const EMOJI: Record<NicheId, string> = {
  nails: '💅', lashes_brows: '👁️', esthetics: '✨', hair: '💇‍♀️', massage_spa: '🌿', general: '💼',
};

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

export function SimpleSetup({
  professionalId, initialConfig, initialTemplateId, publicUrl, isDemo, onFinish, onDone, onError,
}: SimpleSetupProps) {
  const [step, setStep] = useState<Step>(1);

  // A barra fixa do rodapé ocupa a largura toda no celular: avisa a casca
  // para os botões flutuantes (Ana, "+") subirem acima dela (globals.css).
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-bottom-bar', '');
    return () => root.removeAttribute('data-bottom-bar');
  }, []);
  const [niche, setNiche] = useState<NicheId | null>(null);
  const [mode, setMode] = useState<SitePageMode>('site');
  const [look, setLook] = useState<ResolvedLook | null>(null);
  /** Ela tocou em um modelo? Se não, trocar de área troca a sugestão junto. */
  const [lookPicked, setLookPicked] = useState(false);
  const [essentials, setEssentials] = useState<EssentialsValue>(() => essentialsFrom(initialConfig));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [copied, setCopied] = useState(false);

  const preset = useMemo(() => NICHE_LIST.find(n => n.id === niche) || null, [niche]);

  const pickNiche = (id: NicheId) => {
    setNiche(id);
    const p = NICHE_LIST.find(n => n.id === id)!;
    const suggested = getLook(p.recommendedLookId);
    if (suggested && !lookPicked) setLook(resolveLook(suggested));
    if (!essentials.role || NICHE_LIST.some(n => n.sampleRoles.includes(essentials.role))) {
      setEssentials(e => ({ ...e, role: p.sampleRoles[0] }));
    }
    setStep(2);
  };

  /** Tema que o seletor compara para marcar o card ativo. */
  const activeTheme: SiteTheme = look?.theme || initialConfig.theme;
  const activeTemplateId = look?.template.id || initialTemplateId;

  const build = (): { config: SiteConfig; templateId: string } => {
    const templateId = activeTemplateId;
    const cfg = buildNicheConfig(niche || 'general', templateId, {
      name: essentials.professionalName || undefined,
      brand_name: essentials.studioName || essentials.professionalName || undefined,
      city: essentials.city || undefined,
      address: essentials.address || undefined,
      whatsapp: essentials.whatsapp || undefined,
      instagram: essentials.instagram || undefined,
      email: initialConfig.identity.email || undefined,
      logo_url: initialConfig.identity.logoUrl || undefined,
      profile_image_url: essentials.photoUrl || undefined,
    });
    if (look) cfg.theme = { ...cfg.theme, ...look.theme };
    const role = cleanText(essentials.role, LIMITS.short);
    if (role) {
      cfg.identity.role = role;
      cfg.seo.title = `${cfg.identity.studioName || cfg.identity.professionalName} — ${role}`;
    }
    if (essentials.hours) cfg.content.location.hours = cleanText(essentials.hours, LIMITS.short);
    cfg.links.mode = mode;
    // Frase da página de links: profissão + cidade, sem a profissional escrever nada.
    cfg.links.bio = cleanText(
      [role, essentials.city ? `em ${essentials.city}` : ''].filter(Boolean).join(' ') + ' · Agende online',
      LIMITS.bio,
    );
    return { config: cfg, templateId };
  };

  const finish = async (publish: boolean) => {
    setBusy(true);
    try {
      const { config, templateId } = build();
      const res = await onFinish(config, templateId, publish);
      if (!res.ok) { onError(res.error || 'Não foi possível salvar.'); return; }
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { onError('Selecione e copie o endereço manualmente.'); }
  };

  // ── Tela de sucesso ────────────────────────────────────────────────────────
  if (result) {
    const live = result.published;
    return (
      <div className="max-w-xl mx-auto py-6 space-y-6 select-none">
        <div className="text-center space-y-3">
          <span className={`inline-flex h-16 w-16 rounded-full items-center justify-center mx-auto ${live ? 'bg-success-bg text-success' : 'bg-warning-bg text-warning'}`}>
            {live ? <Rocket className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-heading tracking-tight">
            {live ? 'Sua página está no ar!' : 'Sua página foi criada'}
          </h1>
          <p className="text-sm text-n-600 leading-relaxed max-w-md mx-auto">
            {live
              ? 'Agora é só colar o link na bio do Instagram. Tudo que você precisar mudar depois, muda por aqui.'
              : (result.error || 'Ela ficou salva como rascunho. Você pode publicar quando quiser.')}
          </p>
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600">Seu link</p>
          <div className="flex items-center gap-2 rounded-xl bg-n-100 border border-n-200 px-3 py-3">
            <span className="text-[13px] font-mono text-heading truncate flex-1">{publicUrl}</span>
            <button type="button" onClick={copy}
              className="inline-flex items-center gap-1 text-[12px] font-bold text-wine-700 hover:underline shrink-0 cursor-pointer">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
          {live && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[12px] font-bold text-n-600 hover:text-heading">
              <ExternalLink className="h-3.5 w-3.5" /> Abrir minha página
            </a>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-n-600 flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5" /> Como colocar na bio do Instagram
          </p>
          <ol className="space-y-2 text-[13px] text-n-700">
            {[
              'Copie o link acima.',
              'No Instagram, abra o seu perfil e toque em “Editar perfil”.',
              'Toque em “Links” (ou “Site”), cole o link e salve.',
            ].map((t, i) => (
              <li key={i} className="flex gap-2.5">
                <span className="h-5 w-5 shrink-0 rounded-full bg-wine-700 text-white text-[11px] font-bold grid place-items-center">{i + 1}</span>
                <span className="leading-relaxed">{t}</span>
              </li>
            ))}
          </ol>
        </div>

        <button type="button" onClick={onDone}
          className="w-full inline-flex items-center justify-center gap-2 h-12 bg-wine-700 hover:bg-wine-800 text-white text-sm font-bold rounded-2xl cursor-pointer">
          Ir para a minha página <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Passos ─────────────────────────────────────────────────────────────────
  const canContinue = step === 2 ? !!look : true;

  return (
    <div className="max-w-3xl mx-auto space-y-5 select-none pb-28">
      {/* Progresso: três bolinhas grandes, um título por passo */}
      <header className="space-y-4">
        <div className="flex items-center justify-center gap-2">
          {([1, 2, 3] as Step[]).map(s => (
            <React.Fragment key={s}>
              <span className={`h-8 w-8 rounded-full grid place-items-center text-[12px] font-bold border ${
                s < step ? 'bg-success text-white border-success' : s === step ? 'bg-wine-700 text-white border-wine-700' : 'bg-white text-n-400 border-n-200'
              }`}>
                {s < step ? <Check className="h-4 w-4" /> : s}
              </span>
              {s < 3 && <span className={`h-0.5 w-8 sm:w-14 rounded ${s < step ? 'bg-success' : 'bg-n-200'}`} />}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-wine-700">Passo {step} de 3</p>
          <h1 className="text-2xl sm:text-3xl font-black text-heading tracking-tight mt-1">{STEP_TITLE[step].title}</h1>
          <p className="text-sm text-n-600 mt-1.5">{STEP_TITLE[step].sub}</p>
        </div>
      </header>

      {isDemo && (
        <p className="text-[12px] text-warning bg-warning-bg border border-warning-border rounded-2xl px-4 py-3 leading-relaxed">
          <b>Conta teste:</b> você pode montar a página e ver a prévia, mas ela não vai ao ar. Entre com a sua conta para publicar.
        </p>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {NICHE_LIST.map(n => (
            <button
              key={n.id}
              type="button"
              onClick={() => pickNiche(n.id)}
              className={`text-left rounded-2xl border p-4 min-h-[128px] flex flex-col justify-between transition-ui cursor-pointer ${
                niche === n.id ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15' : 'border-n-200 bg-white hover:border-n-300 hover:shadow-soft'
              }`}
            >
              <span className="text-3xl" aria-hidden="true">{EMOJI[n.id]}</span>
              <span>
                <span className="text-[14px] font-bold text-heading block">{n.name}</span>
                <span className="text-[11px] text-n-500 block mt-0.5 leading-snug line-clamp-2">{n.description}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          {/* Formato: duas opções grandes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {([
              { id: 'site' as const, title: 'Site completo', desc: 'Capa, serviços, fotos, depoimentos e agendamento. Para quem quer impressionar.', icon: LayoutTemplate },
              { id: 'links' as const, title: 'Só links (estilo bio)', desc: 'Sua foto e botões grandes: agendar, WhatsApp, Instagram. Direto ao ponto.', icon: List },
            ]).map(o => {
              const Icon = o.icon;
              const active = mode === o.id;
              return (
                <button key={o.id} type="button" onClick={() => setMode(o.id)} aria-pressed={active}
                  className={`text-left rounded-2xl border p-4 flex gap-3 transition-ui cursor-pointer ${
                    active ? 'border-wine-700 bg-accent-soft ring-2 ring-wine-700/15' : 'border-n-200 bg-white hover:border-n-300'
                  }`}>
                  <span className={`h-11 w-11 shrink-0 rounded-xl grid place-items-center ${active ? 'bg-wine-700 text-white' : 'bg-n-100 text-n-600'}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="text-[14px] font-bold text-heading block">{o.title}</span>
                    <span className="text-[11.5px] text-n-600 block mt-0.5 leading-snug">{o.desc}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <p className="text-[12px] text-n-600 text-center">
              Os modelos marcados com <b>✨ Indicado para você</b> costumam cair bem para {preset?.name || 'a sua área'}.
              Dá para trocar depois, sem perder nada.
            </p>
            <LookPicker
              templateId={activeTemplateId}
              theme={activeTheme}
              priorityIds={SITE_LOOKS.filter(l => niche && l.niches.includes(niche)).map(l => l.id)}
              onSelect={r => { setLook(r); setLookPicked(true); }}
            />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-4 sm:p-6">
          <EssentialsForm
            value={essentials}
            onChange={setEssentials}
            professionalId={professionalId}
            roleSuggestions={preset?.sampleRoles || []}
            onError={onError}
            compact
          />
        </div>
      )}

      {/* Barra fixa de navegação */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4 pt-6 bg-gradient-to-t from-n-50 via-n-50/95 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3 rounded-2xl border border-n-200 bg-white px-4 py-3 shadow-lg pointer-events-auto">
          {step > 1 ? (
            <button type="button" onClick={() => setStep(s => (s - 1) as Step)} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 h-11 rounded-xl text-[13px] font-bold text-n-600 hover:bg-n-100 cursor-pointer disabled:opacity-50">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </button>
          ) : <span className="text-[12px] text-n-500 pl-1">Toque em uma opção para continuar</span>}

          {step === 2 && (
            <button type="button" onClick={() => setStep(3)} disabled={!canContinue}
              className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-[13px] font-bold rounded-xl cursor-pointer disabled:opacity-40">
              Continuar <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {step === 3 && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => finish(false)} disabled={busy}
                className="hidden sm:inline-flex px-3 h-11 rounded-xl text-[12px] font-bold text-n-500 hover:text-n-800 cursor-pointer disabled:opacity-50">
                Salvar sem publicar
              </button>
              <button type="button" onClick={() => finish(!isDemo)} disabled={busy}
                className="inline-flex items-center gap-2 px-5 h-11 bg-wine-700 hover:bg-wine-800 text-white text-[13px] font-bold rounded-xl shadow-md cursor-pointer disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isDemo ? 'Criar minha página' : 'Publicar minha página'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SimpleSetup;
