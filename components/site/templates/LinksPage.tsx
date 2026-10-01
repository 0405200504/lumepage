'use client';

/**
 * ============================================================================
 * PÁGINA DE LINKS · modo "só links" (estilo Linktree)
 * ============================================================================
 * Foto, nome, uma frase e uma coluna de botões grandes. A cliente abre pelo
 * link da bio e escolhe o que quer: agendar, falar no WhatsApp, seguir, ver o
 * caminho ou abrir um link livre.
 *
 * Não é um template do registro (não tem seções): é um segundo FORMATO da
 * mesma página. Lê o mesmo SiteConfig — foto, nome, profissão, WhatsApp,
 * Instagram, endereço — e se pinta com a mesma paleta e as mesmas fontes.
 * Trocar de formato nunca apaga nada.
 *
 * O botão "Agendar" abre o agendamento REAL da Lume (mesmo `onBook` dos
 * templates completos).
 */

import React from 'react';
import type { SiteConfig } from '@/types/site';
import type { PublicService } from '../types';
import { themeToCssVars } from '@/lib/site/theme';
import { resolveLinks, type ResolvedLink } from '@/lib/site/config';
import {
  SiteImage, initials, formatPrice, formatDuration,
  IconWhatsApp, IconInstagram, IconMapPin, IconArrow, IconClock,
} from '../shared';

const CSS = `
.t-links { min-height: 100vh; background: var(--lume-bg); color: var(--lume-fg); font-family: var(--lume-font-body); font-size: 16px; line-height: 1.6; position: relative; overflow-x: hidden; }
.t-links *, .t-links *::before, .t-links *::after { box-sizing: border-box; }
.t-links a { color: inherit; text-decoration: none; }
.t-links p { margin: 0; }
.t-links h1, .t-links h2 { font-family: var(--lume-font-title); font-weight: var(--lume-font-title-weight); letter-spacing: var(--lume-font-title-tracking); margin: 0; line-height: 1.15; }
.t-links .glow { position: absolute; inset: -140px 0 auto 0; height: 420px; pointer-events: none; background: radial-gradient(60% 60% at 50% 30%, var(--lume-secondary-soft), transparent 70%); }
.t-links .wrap { position: relative; max-width: 480px; margin: 0 auto; padding: 48px 20px 56px; display: flex; flex-direction: column; align-items: center; }

.t-links .avatar { width: 112px; height: 112px; border-radius: 999px; padding: 4px; background: var(--lume-bg); box-shadow: 0 0 0 2px var(--lume-primary); }
.t-links .avatar img, .t-links .avatar .ini { width: 100%; height: 100%; border-radius: 999px; object-fit: cover; display: block; }
.t-links .avatar .ini { display: grid; place-items: center; background: var(--lume-primary-soft); color: var(--lume-primary-text); font-family: var(--lume-font-title); font-size: 36px; font-weight: 500; }
.t-links .logo { max-height: 30px; max-width: 160px; margin-top: 20px; object-fit: contain; }
.t-links h1 { font-size: 28px; text-align: center; margin-top: 18px; color: var(--lume-fg); }
.t-links .role { margin-top: 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; color: var(--lume-primary-text); text-align: center; }
.t-links .bio { margin-top: 12px; font-size: 15px; color: var(--lume-fg-soft); text-align: center; max-width: 380px; }

.t-links .list { width: 100%; margin-top: 30px; display: flex; flex-direction: column; gap: 12px; }
.t-links .lnk { display: grid; grid-template-columns: 24px 1fr 24px; align-items: center; gap: 12px; width: 100%; min-height: 58px; padding: 14px 18px; font-size: 15.5px; font-weight: 600; font-family: var(--lume-font-body); border: 1.5px solid transparent; cursor: pointer; transition: transform .15s ease, box-shadow .15s ease, background .15s ease, border-color .15s ease; text-align: center; }
.t-links .lnk svg { width: 22px; height: 22px; }
.t-links .lnk .arr { opacity: .55; justify-self: end; }
.t-links .lnk:hover { transform: translateY(-1px); }
.t-links .lnk:active { transform: translateY(0); }

/* ─ estilo PÍLULA: todos os botões cheios na cor principal ─ */
.t-links[data-style="pill"] .lnk { background: var(--lume-primary); color: var(--lume-on-primary); border-radius: var(--lume-r-pill); box-shadow: 0 10px 24px -14px var(--lume-shadow); }
.t-links[data-style="pill"] .lnk:hover { background: var(--lume-primary-hover); }

/* ─ estilo CARTÃO: superfícies claras, "Agendar" em destaque ─ */
.t-links[data-style="card"] .lnk { background: var(--lume-surface); color: var(--lume-fg); border-radius: var(--lume-r-md); border-color: var(--lume-line); box-shadow: 0 8px 20px -16px var(--lume-overlay); }
.t-links[data-style="card"] .lnk svg:first-child { color: var(--lume-primary-text); }
.t-links[data-style="card"] .lnk:hover { border-color: var(--lume-line-strong); }
.t-links[data-style="card"] .lnk[data-kind="book"] { background: var(--lume-primary); color: var(--lume-on-primary); border-color: var(--lume-primary); }
.t-links[data-style="card"] .lnk[data-kind="book"] svg:first-child { color: inherit; }

/* ─ estilo CONTORNO: traço fino, "Agendar" cheio ─ */
.t-links[data-style="outline"] .lnk { background: transparent; color: var(--lume-primary-text); border-radius: var(--lume-r-pill); border-color: var(--lume-primary-text); }
.t-links[data-style="outline"] .lnk:hover { background: var(--lume-primary-soft); }
.t-links[data-style="outline"] .lnk[data-kind="book"] { background: var(--lume-primary); color: var(--lume-on-primary); border-color: var(--lume-primary); }

.t-links .svc-block { width: 100%; margin-top: 36px; }
.t-links .eyebrow { font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: var(--lume-fg-faint); text-align: center; }
.t-links .svc-list { margin-top: 14px; display: flex; flex-direction: column; gap: 8px; }
.t-links .svc { display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 14px 16px; background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-md); text-align: left; cursor: pointer; font-family: var(--lume-font-body); color: var(--lume-fg); transition: border-color .15s ease, transform .15s ease; }
.t-links .svc:hover { border-color: var(--lume-line-strong); transform: translateY(-1px); }
.t-links .svc .nm { font-size: 15px; font-weight: 600; line-height: 1.3; }
.t-links .svc .mt { margin-top: 3px; font-size: 12.5px; color: var(--lume-fg-soft); display: flex; align-items: center; gap: 6px; }
.t-links .svc .mt svg { width: 13px; height: 13px; }
.t-links .svc .pr { font-family: var(--lume-font-title); font-size: 17px; white-space: nowrap; color: var(--lume-primary-text); }
.t-links .more { margin-top: 10px; width: 100%; background: none; border: none; cursor: pointer; font-family: var(--lume-font-body); font-size: 13px; font-weight: 600; color: var(--lume-primary-text); padding: 10px; display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.t-links .more svg { width: 16px; height: 16px; }

.t-links .foot { margin-top: 44px; text-align: center; font-size: 12.5px; color: var(--lume-fg-faint); line-height: 1.7; }
.t-links .foot .addr { color: var(--lume-fg-soft); }
.t-links .foot .by { margin-top: 14px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
@media (prefers-reduced-motion: reduce) { .t-links .lnk, .t-links .svc { transition: none; } .t-links .lnk:hover, .t-links .svc:hover { transform: none; } }
`;

const IconCalendar = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <path d="m9.5 15.5 1.8 1.8 3.4-3.6" />
  </svg>
);

const IconLink = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.1 0l2.8-2.8a5 5 0 0 0-7.1-7.1L11 4.9" />
    <path d="M14 11a5 5 0 0 0-7.1 0L4.1 13.8a5 5 0 0 0 7.1 7.1L13 19.1" />
  </svg>
);

function LinkIcon({ kind }: { kind: ResolvedLink['kind'] }) {
  switch (kind) {
    case 'book': return <IconCalendar />;
    case 'whatsapp': return <IconWhatsApp />;
    case 'instagram': return <IconInstagram />;
    case 'maps': return <IconMapPin />;
    default: return <IconLink />;
  }
}

export interface LinksPageProps {
  config: SiteConfig;
  services: PublicService[];
  onBook: (serviceId?: string) => void;
  preview?: boolean;
}

const MAX_SERVICES_SHOWN = 6;

export default function LinksPage({ config, services, onBook }: LinksPageProps) {
  const { identity: i, links } = config;
  const name = i.studioName || i.professionalName || 'Minha página';
  const subtitle = [i.role, i.city].filter(Boolean).join(' · ');
  const resolved = resolveLinks(config);
  const shown = links.showServices ? services.slice(0, MAX_SERVICES_SHOWN) : [];
  const hasMore = links.showServices && services.length > MAX_SERVICES_SHOWN;
  const hours = config.content.location.hours;

  return (
    <div className="t-links" data-style={links.style} style={themeToCssVars(config.theme)}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="glow" aria-hidden="true" />

      <main className="wrap">
        <div className="avatar">
          {i.photoUrl
            ? <SiteImage src={i.photoUrl} alt={name} priority />
            : <span className="ini" aria-hidden="true">{initials(name)}</span>}
        </div>

        {i.logoUrl && <SiteImage src={i.logoUrl} alt={`Logo de ${name}`} className="logo" />}

        <h1>{name}</h1>
        {subtitle && <p className="role">{subtitle}</p>}
        {links.bio && <p className="bio">{links.bio}</p>}

        {resolved.length > 0 && (
          <nav className="list" aria-label="Links">
            {resolved.map(link => (
              link.href === null ? (
                <button
                  key={link.id}
                  type="button"
                  className="lnk"
                  data-kind={link.kind}
                  onClick={() => onBook()}
                >
                  <LinkIcon kind={link.kind} />
                  <span>{link.label}</span>
                  <IconArrow className="arr" />
                </button>
              ) : (
                <a
                  key={link.id}
                  className="lnk"
                  data-kind={link.kind}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkIcon kind={link.kind} />
                  <span>{link.label}</span>
                  <IconArrow className="arr" />
                </a>
              )
            ))}
          </nav>
        )}

        {shown.length > 0 && (
          <section className="svc-block" aria-labelledby="links-servicos">
            <h2 id="links-servicos" className="eyebrow">Serviços</h2>
            <div className="svc-list">
              {shown.map(s => (
                <button
                  key={s.id}
                  type="button"
                  className="svc"
                  onClick={() => onBook(s.id)}
                  aria-label={`Agendar ${s.name}`}
                >
                  <span>
                    <span className="nm" style={{ display: 'block' }}>{s.name}</span>
                    <span className="mt">
                      <IconClock /> {formatDuration(s.durationMinutes)}
                    </span>
                  </span>
                  <span className="pr">{formatPrice(s.priceCents)}</span>
                </button>
              ))}
            </div>
            {hasMore && (
              <button type="button" className="more" onClick={() => onBook()}>
                Ver todos os serviços <IconArrow />
              </button>
            )}
          </section>
        )}

        <footer className="foot">
          {(i.address || hours) && (
            <p className="addr">
              {[i.address, hours].filter(Boolean).join(' · ')}
            </p>
          )}
          <p className="by">Página feita com Lume</p>
        </footer>
      </main>
    </div>
  );
}
