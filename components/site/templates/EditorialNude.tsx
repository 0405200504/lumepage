'use client';

/**
 * ============================================================================
 * TEMPLATE · Editorial Nude
 * ============================================================================
 * Origem: repositório `page-1-portf-lio-` (Marina Alves Nails, Next 14).
 * O que veio de lá: a linguagem visual — creme quente + nude + vinho, títulos
 * em serifa com trecho em itálico, eyebrow em caixa alta bem espaçada, galeria
 * em mosaico e o cartão de contato em bloco cheio de cor.
 * O que NÃO veio: framer-motion, next/font, next/image, textos e fotos da
 * Marina, o link fixo de WhatsApp — nada disso escala para 5.000 profissionais.
 *
 * Aqui o template é uma função pura: nenhum dado de cliente está escrito no
 * código; tudo chega por `config` e `services`.
 */

import React, { useState } from 'react';
import type { TemplateProps } from '../types';
import type { SiteSectionId } from '@/types/site';
import { themeToCssVars } from '@/lib/site/theme';
import { Reveal, REVEAL_CSS } from '../Reveal';
import {
  SiteImage, ImageFallback, Paragraphs, Stars, initials,
  formatPrice, formatDuration, buildNav, SECTION_ANCHOR,
  whatsappHref, instagramHref, mapsHref,
  IconWhatsApp, IconInstagram, IconMapPin, IconClock, IconPhone,
  IconMenu, IconClose, IconChevron, IconSparkle,
} from '../shared';

const CSS = `
.t-nude { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.6; }
.t-nude *, .t-nude *::before, .t-nude *::after { box-sizing: border-box; }
.t-nude img { display: block; max-width: 100%; }
.t-nude a { color: inherit; text-decoration: none; }
.t-nude h1, .t-nude h2, .t-nude h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; line-height: 1.12; margin: 0; }
.t-nude p { margin: 0; }
.t-nude section[id] { scroll-margin-top: 80px; }
.t-nude [data-lume-placeholder] { background: var(--lume-secondary-soft); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 12px; letter-spacing: .1em; text-transform: uppercase; }

.t-nude .wrap { width: 100%; max-width: 1120px; margin: 0 auto; padding: 0 20px; }
@media (min-width: 640px) { .t-nude .wrap { padding: 0 32px; } }
@media (min-width: 1024px) { .t-nude .wrap { padding: 0 48px; } }
.t-nude .sec { padding: 64px 0; }
@media (min-width: 640px) { .t-nude .sec { padding: 96px 0; } }

.t-nude .eyebrow { font-size: 11px; letter-spacing: .25em; text-transform: uppercase; color: var(--lume-secondary); font-weight: 500; margin: 0 0 16px; }
.t-nude .h2 { font-size: clamp(30px, 6vw, 46px); }
.t-nude .h2 em { font-style: italic; color: var(--lume-primary-text); }
.t-nude .lead { margin-top: 18px; font-size: 16px; line-height: 1.75; color: var(--lume-fg-soft); max-width: 58ch; }
@media (min-width: 640px) { .t-nude .lead { font-size: 18px; } }

.t-nude .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 48px; padding: 13px 28px; border-radius: var(--lume-r-pill); font-size: 15px; font-weight: 500; border: 1px solid transparent; cursor: pointer; transition: opacity .2s, background .2s, color .2s, border-color .2s; font-family: inherit; }
.t-nude .btn-primary { background: var(--lume-primary); color: var(--lume-on-primary); }
.t-nude .btn-primary:hover { background: var(--lume-primary-hover); }
.t-nude .btn-ghost { border-color: var(--lume-line-strong); color: var(--lume-fg); background: transparent; }
.t-nude .btn-ghost:hover { border-color: var(--lume-primary); color: var(--lume-primary-text); }
.t-nude .btn-light { background: var(--lume-bg); color: var(--lume-primary-text); }
.t-nude .btn-light:hover { opacity: .9; }
.t-nude .btn-block { width: 100%; }
@media (min-width: 640px) { .t-nude .btn-block { width: auto; } }

/* ── Topo ── */
.t-nude .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg); border-bottom: 1px solid var(--lume-line); }
.t-nude .nav-in { display: flex; align-items: center; justify-content: space-between; height: 64px; }
.t-nude .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 19px; letter-spacing: .04em; display: flex; align-items: center; gap: 10px; }
.t-nude .brand em { font-style: italic; color: var(--lume-primary-text); }
.t-nude .brand img { height: 34px; width: auto; object-fit: contain; }
.t-nude .nav-links { display: none; align-items: center; gap: 28px; }
@media (min-width: 1024px) { .t-nude .nav-links { display: flex; } }
.t-nude .nav-links a { font-size: 14px; color: var(--lume-fg-soft); }
.t-nude .nav-links a:hover { color: var(--lume-primary-text); }
.t-nude .nav-cta { display: none; }
@media (min-width: 1024px) { .t-nude .nav-cta { display: inline-flex; padding: 10px 22px; min-height: 0; font-size: 14px; } }
.t-nude .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-fg); cursor: pointer; }
@media (min-width: 1024px) { .t-nude .burger { display: none; } }
.t-nude .burger svg { height: 26px; width: 26px; }

.t-nude .drawer-bg { position: fixed; inset: 0; background: var(--lume-overlay); z-index: 60; }
.t-nude .drawer { position: fixed; top: 0; right: 0; bottom: 0; width: 82%; max-width: 320px; background: var(--lume-bg); z-index: 61; padding: 18px 24px 32px; display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(0,0,0,.14); animation: t-nude-slide .28s cubic-bezier(.22,1,.36,1); }
@keyframes t-nude-slide { from { transform: translateX(100%); } to { transform: none; } }
.t-nude .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-nude .drawer nav { margin-top: 32px; display: flex; flex-direction: column; }
.t-nude .drawer nav a { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; padding: 14px 0; border-bottom: 1px solid var(--lume-line); }
.t-nude .drawer .btn { margin-top: auto; }

/* ── Hero ── */
.t-nude .hero { padding: 40px 0 56px; position: relative; overflow: hidden; }
@media (min-width: 1024px) { .t-nude .hero { padding: 72px 0 104px; } }
.t-nude .hero-grid { display: grid; gap: 32px; align-items: center; }
@media (min-width: 1024px) { .t-nude .hero-grid { grid-template-columns: 7fr 5fr; gap: 48px; } }
.t-nude .hero-copy { order: 2; }
@media (min-width: 1024px) { .t-nude .hero-copy { order: 1; } }
.t-nude .hero-art { order: 1; position: relative; }
@media (min-width: 1024px) { .t-nude .hero-art { order: 2; } }
.t-nude .hero h1 { font-size: clamp(34px, 8.5vw, 60px); }
.t-nude .hero h1 em { font-style: italic; color: var(--lume-primary-text); }
.t-nude .hero-actions { margin-top: 30px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 640px) { .t-nude .hero-actions { flex-direction: row; } }
.t-nude .hero-photo { position: relative; width: 100%; aspect-ratio: 4 / 5; border-radius: var(--lume-r-lg); overflow: hidden; box-shadow: 0 30px 60px -30px var(--lume-shadow); }
.t-nude .hero-photo img, .t-nude .hero-photo > div { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.t-nude .hero-badge { position: absolute; left: -10px; bottom: -16px; background: var(--lume-primary); color: var(--lume-on-primary); border-radius: var(--lume-r-md); padding: 12px 20px; box-shadow: 0 16px 32px -18px var(--lume-shadow); display: none; }
@media (min-width: 640px) { .t-nude .hero-badge { display: block; } }
.t-nude .hero-badge b { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 400; display: block; line-height: 1; }
.t-nude .hero-badge span { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; opacity: .8; }
.t-nude .hero-blob { position: absolute; right: -90px; top: 60px; height: 340px; width: 340px; border-radius: 999px; background: var(--lume-secondary-soft); filter: blur(70px); pointer-events: none; }

/* ── Números ── */
.t-nude .stats { border-top: 1px solid var(--lume-line); border-bottom: 1px solid var(--lume-line); padding: 36px 0; }
.t-nude .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; }
.t-nude .stats dt { font-family: 'Playfair Display', Georgia, serif; font-size: clamp(26px, 6vw, 42px); color: var(--lume-primary-text); }
.t-nude .stats dd { margin: 6px 0 0; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--lume-fg-faint); }
@media (min-width: 640px) { .t-nude .stats dd { font-size: 11px; } }

/* ── Serviços ── */
.t-nude .cards { margin-top: 40px; display: grid; gap: 20px; }
@media (min-width: 640px) { .t-nude .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .t-nude .cards { grid-template-columns: repeat(3, 1fr); gap: 28px; } }
.t-nude .svc { display: flex; flex-direction: column; border: 1px solid var(--lume-secondary-soft); border-radius: var(--lume-r-lg); background: var(--lume-surface); padding: 22px; transition: border-color .25s, transform .25s; }
.t-nude .svc:hover { border-color: var(--lume-primary); transform: translateY(-3px); }
@media (min-width: 1024px) { .t-nude .cards > *:nth-child(3n+2) .svc { margin-top: 28px; } }
.t-nude .svc-ico { height: 46px; width: 46px; border-radius: 999px; background: var(--lume-primary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-nude .svc-ico svg { height: 22px; width: 22px; }
.t-nude .svc h3 { margin-top: 18px; font-size: 23px; }
.t-nude .svc-desc { margin-top: 8px; font-size: 15px; line-height: 1.65; color: var(--lume-fg-soft); }
.t-nude .svc-meta { margin-top: 16px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.t-nude .svc-price { font-family: 'Playfair Display', Georgia, serif; font-size: 24px; color: var(--lume-primary-text); }
.t-nude .svc-dur { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-nude .svc-img { margin-top: 18px; aspect-ratio: 1/1; border-radius: var(--lume-r-md); overflow: hidden; }
.t-nude .svc-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
.t-nude .svc:hover .svc-img img { transform: scale(1.05); }
.t-nude .svc .btn { margin-top: 18px; }

/* ── Galeria ── */
.t-nude .gallery-band { background: var(--lume-surface); }
.t-nude .masonry { margin-top: 36px; columns: 2; column-gap: 14px; }
@media (min-width: 1024px) { .t-nude .masonry { columns: 3; column-gap: 22px; } }
.t-nude .masonry figure { break-inside: avoid; margin: 0 0 14px; border-radius: var(--lume-r-md); overflow: hidden; position: relative; }
@media (min-width: 1024px) { .t-nude .masonry figure { margin-bottom: 22px; } }
.t-nude .masonry img { width: 100%; height: auto; transition: transform .5s; }
.t-nude .masonry figure:hover img { transform: scale(1.05); }
.t-nude .masonry figcaption { position: absolute; inset: auto 0 0 0; padding: 20px 12px 10px; font-size: 12px; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.6), transparent); }

/* ── Antes e depois ── */
.t-nude .ba-grid { margin-top: 36px; display: grid; gap: 24px; }
@media (min-width: 768px) { .t-nude .ba-grid { grid-template-columns: repeat(2, 1fr); } }
.t-nude .ba-card { border: 1px solid var(--lume-secondary-soft); border-radius: var(--lume-r-lg); overflow: hidden; background: var(--lume-surface); }
.t-nude .ba-pair { display: grid; grid-template-columns: 1fr 1fr; }
.t-nude .ba-pair > div { position: relative; aspect-ratio: 4/5; }
.t-nude .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-nude .ba-pair span { position: absolute; left: 10px; top: 10px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; background: var(--lume-primary); color: var(--lume-on-primary); padding: 4px 10px; border-radius: var(--lume-r-pill); }
.t-nude .ba-body { padding: 18px 20px 22px; }
.t-nude .ba-body h3 { font-size: 21px; }
.t-nude .ba-body p { margin-top: 6px; font-size: 14px; color: var(--lume-fg-soft); }

/* ── Depoimentos ── */
.t-nude .testi-band { background: var(--lume-surface); }
.t-nude .testi { display: flex; flex-direction: column; border: 1px solid var(--lume-secondary-soft); border-radius: var(--lume-r-lg); background: var(--lume-bg); padding: 24px; }
.t-nude .testi .stars { display: inline-flex; gap: 2px; color: var(--lume-primary-text); }
.t-nude .testi .stars svg { height: 15px; width: 15px; }
.t-nude .testi p { margin-top: 14px; flex: 1; font-size: 15px; line-height: 1.7; color: var(--lume-fg-soft); }
.t-nude .testi-who { margin-top: 18px; display: flex; align-items: center; gap: 12px; }
.t-nude .testi-who img, .t-nude .testi-avatar { height: 40px; width: 40px; border-radius: 999px; object-fit: cover; }
.t-nude .testi-avatar { display: grid; place-items: center; background: var(--lume-primary-soft); color: var(--lume-primary-text); font-size: 13px; font-weight: 600; }
.t-nude .testi-who b { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 400; }

/* ── Sobre ── */
.t-nude .about-grid { display: grid; gap: 32px; align-items: center; }
@media (min-width: 1024px) { .t-nude .about-grid { grid-template-columns: 5fr 7fr; gap: 56px; } }
.t-nude .about-photo { position: relative; width: 100%; aspect-ratio: 4/5; border-radius: var(--lume-r-lg); overflow: hidden; box-shadow: 0 30px 60px -30px var(--lume-shadow); }
.t-nude .about-photo img { width: 100%; height: 100%; object-fit: cover; }

/* ── FAQ ── */
.t-nude .faq-list { margin-top: 32px; max-width: 780px; }
.t-nude .faq-list details { border-bottom: 1px solid var(--lume-line); }
.t-nude .faq-list summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 0; font-size: 17px; font-family: 'Playfair Display', Georgia, serif; }
.t-nude .faq-list summary::-webkit-details-marker { display: none; }
.t-nude .faq-list summary svg { height: 20px; width: 20px; flex-shrink: 0; color: var(--lume-primary-text); transition: transform .25s; }
.t-nude .faq-list details[open] summary svg { transform: rotate(180deg); }
.t-nude .faq-list .answer { padding: 0 0 20px; font-size: 15px; line-height: 1.7; color: var(--lume-fg-soft); }

/* ── Onde estou ── */
.t-nude .info-grid { margin-top: 32px; display: grid; gap: 20px; }
@media (min-width: 640px) { .t-nude .info-grid { grid-template-columns: repeat(3, 1fr); } }
.t-nude .info { display: flex; gap: 14px; align-items: flex-start; }
.t-nude .info-ico { height: 42px; width: 42px; flex-shrink: 0; border-radius: 999px; background: var(--lume-primary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-nude .info-ico svg { height: 19px; width: 19px; }
.t-nude .info dt { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-nude .info dd { margin: 5px 0 0; font-size: 15px; line-height: 1.55; }

/* ── Contato ── */
.t-nude .contact-card { border-radius: var(--lume-r-lg); background: var(--lume-primary); color: var(--lume-on-primary); padding: 40px 24px; }
@media (min-width: 640px) { .t-nude .contact-card { padding: 56px 48px; } }
.t-nude .contact-card .eyebrow { color: var(--lume-on-primary-faint); }
.t-nude .contact-card h2 em { color: inherit; }
.t-nude .contact-card p { margin-top: 16px; font-size: 16px; line-height: 1.7; color: var(--lume-on-primary-soft); max-width: 46ch; }
.t-nude .contact-grid { display: grid; gap: 32px; }
@media (min-width: 1024px) { .t-nude .contact-grid { grid-template-columns: 1fr 1fr; gap: 48px; } }
.t-nude .contact-card .info-ico { background: var(--lume-on-primary-veil); color: var(--lume-on-primary); }
.t-nude .contact-card .info dt { color: var(--lume-on-primary-faint); }
.t-nude .contact-card .info-grid { grid-template-columns: 1fr; }

/* ── Rodapé ── */
.t-nude .foot { border-top: 1px solid var(--lume-line); }
.t-nude .foot-in { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 32px 0; text-align: center; }
@media (min-width: 640px) { .t-nude .foot-in { flex-direction: row; justify-content: space-between; text-align: left; } }
.t-nude .foot-links { display: flex; gap: 12px; }
.t-nude .foot-links a { height: 40px; width: 40px; border-radius: 999px; border: 1px solid var(--lume-line-strong); display: grid; place-items: center; color: var(--lume-fg-soft); }
.t-nude .foot-links a:hover { border-color: var(--lume-primary); color: var(--lume-primary-text); }
.t-nude .foot-links svg { height: 18px; width: 18px; }
.t-nude .foot-legal { border-top: 1px solid var(--lume-line); font-size: 11px; color: var(--lume-fg-faint); text-align: center; padding: 14px 0; }

/* ── Botão flutuante ── */
.t-nude .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 9px; padding: 14px 22px; border-radius: var(--lume-r-pill); background: var(--lume-primary); color: var(--lume-on-primary); border: 0; font-family: inherit; font-size: 14px; font-weight: 600; cursor: pointer; box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-nude .fab svg { height: 18px; width: 18px; }
.t-nude .fab:hover { background: var(--lume-primary-hover); }
`;

export default function EditorialNude({ config, services, sections, onBook, preview }: TemplateProps) {
  const [menu, setMenu] = useState(false);
  const { identity, content } = config;
  const nav = buildNav(sections);
  const wa = whatsappHref(config);
  const ig = instagramHref(config);
  const maps = mapsHref(config);
  const brandName = identity.studioName || identity.professionalName || 'Meu estúdio';

  const heroImage = content.hero.imageUrl || identity.photoUrl;
  const aboutImage = content.about.imageUrl || identity.photoUrl;

  const Title = ({ text, highlight }: { text: string; highlight: string }) => (
    <h2 className="h2">
      {text}{highlight ? <> <em>{highlight}</em></> : null}
    </h2>
  );

  const section = (id: SiteSectionId) => {
    switch (id) {
      case 'hero':
        return (
          <section id={SECTION_ANCHOR.hero} className="hero">
            <span className="hero-blob" aria-hidden="true" />
            <div className="wrap hero-grid">
              <Reveal className="hero-copy">
                {(content.hero.eyebrow || identity.role) && (
                  <p className="eyebrow">
                    {[identity.role, content.hero.eyebrow].filter(Boolean).join(' · ')}
                  </p>
                )}
                <h1>
                  {content.hero.headline}
                  {content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}
                </h1>
                {content.hero.subheadline && <p className="lead">{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button type="button" className="btn btn-primary btn-block" onClick={() => onBook()}>
                    {content.hero.ctaPrimary}
                  </button>
                  {content.hero.ctaSecondary && sections.includes('gallery') && (
                    <a className="btn btn-ghost btn-block" href={`#${SECTION_ANCHOR.gallery}`}>
                      {content.hero.ctaSecondary}
                    </a>
                  )}
                </div>
              </Reveal>
              <Reveal className="hero-art" delay={120}>
                <div className="hero-photo">
                  {heroImage
                    ? <SiteImage src={heroImage} alt={`Retrato de ${identity.professionalName || brandName}`} priority />
                    : <ImageFallback label="sua foto aqui" />}
                </div>
                {content.stats.items[1]?.value && (
                  <div className="hero-badge">
                    <b>{content.stats.items[1].value}</b>
                    <span>{content.stats.items[1].label}</span>
                  </div>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'stats':
        return (
          <section id={SECTION_ANCHOR.stats} className="stats">
            <Reveal className="wrap">
              <dl className="stats-grid">
                {content.stats.items.map(s => (
                  <div key={s.id}>
                    <dt>{s.value}</dt>
                    <dd>{s.label}</dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec">
            <div className="wrap">
              <Reveal>
                {content.services.eyebrow && <p className="eyebrow">{content.services.eyebrow}</p>}
                <Title text={content.services.title} highlight={content.services.highlight} />
                {content.services.subtitle && <p className="lead">{content.services.subtitle}</p>}
              </Reveal>
              <div className="cards">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 3) * 90}>
                    <article className="svc">
                      <span className="svc-ico"><IconSparkle /></span>
                      <h3>{s.name}</h3>
                      {s.description && <p className="svc-desc">{s.description}</p>}
                      <div className="svc-meta">
                        {content.services.showPrices && <span className="svc-price">{formatPrice(s.priceCents)}</span>}
                        {content.services.showDuration && <span className="svc-dur">{formatDuration(s.durationMinutes)}</span>}
                      </div>
                      {s.imageUrl && (
                        <div className="svc-img"><SiteImage src={s.imageUrl} alt={s.name} /></div>
                      )}
                      <button type="button" className="btn btn-primary" onClick={() => onBook(s.id)}>
                        Agendar
                      </button>
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec gallery-band">
            <div className="wrap">
              <Reveal>
                {content.gallery.eyebrow && <p className="eyebrow">{content.gallery.eyebrow}</p>}
                <Title text={content.gallery.title} highlight={content.gallery.highlight} />
              </Reveal>
              <div className="masonry">
                {content.gallery.items.map((item, i) => (
                  <Reveal as="figure" key={item.id} delay={(i % 3) * 70}>
                    <SiteImage src={item.url} alt={item.caption || `Trabalho de ${brandName}`} />
                    {item.caption && <figcaption>{item.caption}</figcaption>}
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'beforeAfter':
        return (
          <section id={SECTION_ANCHOR.beforeAfter} className="sec">
            <div className="wrap">
              <Reveal>
                {content.beforeAfter.eyebrow && <p className="eyebrow">{content.beforeAfter.eyebrow}</p>}
                <Title text={content.beforeAfter.title} highlight={content.beforeAfter.highlight} />
              </Reveal>
              <div className="ba-grid">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 90}>
                    <article className="ba-card">
                      <div className="ba-pair">
                        <div>
                          <SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} />
                          <span>Antes</span>
                        </div>
                        <div>
                          <SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} />
                          <span>Depois</span>
                        </div>
                      </div>
                      {(item.title || item.description) && (
                        <div className="ba-body">
                          {item.title && <h3>{item.title}</h3>}
                          {item.description && <p>{item.description}</p>}
                        </div>
                      )}
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section id={SECTION_ANCHOR.testimonials} className="sec testi-band">
            <div className="wrap">
              <Reveal>
                {content.testimonials.eyebrow && <p className="eyebrow">{content.testimonials.eyebrow}</p>}
                <Title text={content.testimonials.title} highlight={content.testimonials.highlight} />
              </Reveal>
              <div className="cards">
                {content.testimonials.items.map((t, i) => (
                  <Reveal key={t.id} delay={(i % 3) * 90}>
                    <article className="testi">
                      <Stars rating={t.rating} className="stars" />
                      <p>&ldquo;{t.text}&rdquo;</p>
                      {t.name && (
                        <div className="testi-who">
                          {t.photoUrl
                            ? <SiteImage src={t.photoUrl} alt={t.name} />
                            : <span className="testi-avatar">{initials(t.name)}</span>}
                          <b>{t.name}</b>
                        </div>
                      )}
                    </article>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'about':
        return (
          <section id={SECTION_ANCHOR.about} className="sec">
            <div className="wrap about-grid">
              <Reveal>
                <div className="about-photo">
                  {aboutImage
                    ? <SiteImage src={aboutImage} alt={`${identity.professionalName || brandName} no atendimento`} />
                    : <ImageFallback label="sua foto aqui" />}
                </div>
              </Reveal>
              <Reveal delay={110}>
                {content.about.eyebrow && <p className="eyebrow">{content.about.eyebrow}</p>}
                <Title text={content.about.title} highlight={content.about.highlight} />
                <div className="lead">
                  <Paragraphs text={content.about.text} />
                </div>
                {content.about.cta && (
                  <button type="button" className="btn btn-primary btn-block" style={{ marginTop: 28 }} onClick={() => onBook()}>
                    {content.about.cta}
                  </button>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'faq':
        return (
          <section id={SECTION_ANCHOR.faq} className="sec">
            <div className="wrap">
              <Reveal>
                {content.faq.eyebrow && <p className="eyebrow">{content.faq.eyebrow}</p>}
                <Title text={content.faq.title} highlight={content.faq.highlight} />
              </Reveal>
              <div className="faq-list">
                {content.faq.items.map(item => (
                  <details key={item.id}>
                    <summary>{item.question}<IconChevron /></summary>
                    <div className="answer"><Paragraphs text={item.answer} /></div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );

      case 'location':
        return (
          <section id={SECTION_ANCHOR.location} className="sec">
            <div className="wrap">
              <Reveal>
                {content.location.eyebrow && <p className="eyebrow">{content.location.eyebrow}</p>}
                <Title text={content.location.title} highlight={content.location.highlight} />
                {content.location.note && <p className="lead">{content.location.note}</p>}
              </Reveal>
              <Reveal delay={90}>
                <dl className="info-grid">
                  {(identity.address || identity.city) && (
                    <div className="info">
                      <span className="info-ico"><IconMapPin /></span>
                      <div>
                        <dt>Endereço</dt>
                        <dd>
                          {maps
                            ? <a href={maps} target="_blank" rel="noopener noreferrer">{[identity.address, identity.city].filter(Boolean).join(' — ')}</a>
                            : [identity.address, identity.city].filter(Boolean).join(' — ')}
                        </dd>
                      </div>
                    </div>
                  )}
                  {content.location.hours && (
                    <div className="info">
                      <span className="info-ico"><IconClock /></span>
                      <div><dt>Horário</dt><dd>{content.location.hours}</dd></div>
                    </div>
                  )}
                  {wa && (
                    <div className="info">
                      <span className="info-ico"><IconPhone /></span>
                      <div>
                        <dt>WhatsApp</dt>
                        <dd><a href={wa} target="_blank" rel="noopener noreferrer">Falar comigo</a></dd>
                      </div>
                    </div>
                  )}
                </dl>
              </Reveal>
            </div>
          </section>
        );

      case 'contact':
        return (
          <section id={SECTION_ANCHOR.contact} className="sec">
            <Reveal className="wrap">
              <div className="contact-card">
                <div className="contact-grid">
                  <div>
                    {content.contact.eyebrow && <p className="eyebrow">{content.contact.eyebrow}</p>}
                    <Title text={content.contact.title} highlight={content.contact.highlight} />
                    {content.contact.text && <p>{content.contact.text}</p>}
                    <button type="button" className="btn btn-light btn-block" style={{ marginTop: 30 }} onClick={() => onBook()}>
                      {content.contact.cta}
                    </button>
                  </div>
                  <dl className="info-grid">
                    {(identity.address || identity.city) && (
                      <div className="info">
                        <span className="info-ico"><IconMapPin /></span>
                        <div><dt>Endereço</dt><dd>{[identity.address, identity.city].filter(Boolean).join(' — ')}</dd></div>
                      </div>
                    )}
                    {content.location.hours && (
                      <div className="info">
                        <span className="info-ico"><IconClock /></span>
                        <div><dt>Horário</dt><dd>{content.location.hours}</dd></div>
                      </div>
                    )}
                    {wa && (
                      <div className="info">
                        <span className="info-ico"><IconWhatsApp /></span>
                        <div><dt>WhatsApp</dt><dd><a href={wa} target="_blank" rel="noopener noreferrer">Chamar no WhatsApp</a></dd></div>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-nude" style={themeToCssVars(config.theme)}>
      <style dangerouslySetInnerHTML={{ __html: CSS + REVEAL_CSS }} />

      <header className="nav">
        <div className="wrap nav-in">
          <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>
            {identity.logoUrl
              ? <SiteImage src={identity.logoUrl} alt={brandName} priority />
              : <span>{brandName.split(' ')[0]} <em>{brandName.split(' ').slice(1).join(' ')}</em></span>}
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            {nav.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <button type="button" className="btn btn-primary nav-cta" onClick={() => onBook()}>Agendar</button>
          <button type="button" className="burger" aria-label="Abrir menu" onClick={() => setMenu(true)}>
            <IconMenu />
          </button>
        </div>
      </header>

      {menu && (
        <>
          <div className="drawer-bg" onClick={() => setMenu(false)} aria-hidden="true" />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-top">
              <span className="brand">{brandName}</span>
              <button type="button" className="burger" aria-label="Fechar menu" onClick={() => setMenu(false)}>
                <IconClose />
              </button>
            </div>
            <nav>
              {nav.map(l => <a key={l.href} href={l.href} onClick={() => setMenu(false)}>{l.label}</a>)}
            </nav>
            <button type="button" className="btn btn-primary" onClick={() => { setMenu(false); onBook(); }}>
              {content.hero.ctaPrimary}
            </button>
          </div>
        </>
      )}

      <main>
        {sections.map(id => <React.Fragment key={id}>{section(id)}</React.Fragment>)}
      </main>

      <footer className="foot">
        <div className="wrap foot-in">
          <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>{brandName}</a>
          <div className="foot-links">
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>}
            {maps && <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Como chegar"><IconMapPin /></a>}
          </div>
        </div>
        <p className="foot-legal">
          {content.footer.note || `© ${new Date().getFullYear()} ${brandName}. Todos os direitos reservados.`}
        </p>
      </footer>

      {!preview && (
        <button type="button" className="fab" onClick={() => onBook()}>
          <IconWhatsApp /> Agendar
        </button>
      )}
    </div>
  );
}
