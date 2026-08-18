'use client';

/**
 * ============================================================================
 * TEMPLATE · Clínica Sage
 * ============================================================================
 * Origem: repositório `page-4-portfolio`.
 * O que veio de lá: branco + verde-sálvia + bege claro, tipografia sem serifa
 * (Outfit nos títulos, Inter no corpo), cantos bem arredondados, cartões com
 * sombra suave, faixas alternadas de fundo e a linha do tempo numerada.
 * É o visual mais clínico e calmo — feito para transmitir confiança.
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
  IconWhatsApp, IconInstagram, IconMapPin, IconClock, IconMail,
  IconMenu, IconClose, IconChevron, IconArrow, IconSparkle,
} from '../shared';

const CSS = `
.t-sage { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.65; }
.t-sage *, .t-sage *::before, .t-sage *::after { box-sizing: border-box; }
.t-sage img { display: block; max-width: 100%; }
.t-sage a { color: inherit; text-decoration: none; }
.t-sage h1, .t-sage h2, .t-sage h3 { font-family: 'Outfit', ui-sans-serif, system-ui, sans-serif; font-weight: 500; line-height: 1.2; margin: 0; letter-spacing: -.01em; }
.t-sage p { margin: 0; }
.t-sage section[id] { scroll-margin-top: 80px; }
.t-sage [data-lume-placeholder] { background: var(--lume-secondary-soft); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 12px; }

.t-sage .wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 20px; }
@media (min-width: 768px) { .t-sage .wrap { padding: 0 32px; } }
.t-sage .sec { padding: 64px 0; }
@media (min-width: 768px) { .t-sage .sec { padding: 96px 0; } }
.t-sage .band-soft { background: var(--lume-surface); }
.t-sage .band-sage { background: var(--lume-secondary-soft); }
.t-sage .center { text-align: center; }

.t-sage .pill { display: inline-block; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; color: var(--lume-primary-text); background: var(--lume-primary-soft); padding: 7px 16px; border-radius: 999px; margin-bottom: 18px; }
.t-sage .h2 { font-size: clamp(28px, 5vw, 44px); }
.t-sage .h2 em { font-style: normal; color: var(--lume-primary-text); }
.t-sage .lead { margin-top: 16px; font-size: 16px; line-height: 1.75; color: var(--lume-fg-soft); max-width: 62ch; }
@media (min-width: 768px) { .t-sage .lead { font-size: 17px; } }
.t-sage .center .lead { margin-left: auto; margin-right: auto; }

.t-sage .btn { display: inline-flex; align-items: center; justify-content: center; gap: 9px; min-height: 50px; padding: 14px 28px; border-radius: 999px; font-size: 15px; font-weight: 600; border: 1.5px solid transparent; background: var(--lume-primary); color: var(--lume-on-primary); cursor: pointer; font-family: inherit; transition: background .25s, color .25s, border-color .25s, transform .25s; }
.t-sage .btn:hover { background: var(--lume-primary-hover); transform: translateY(-1px); }
.t-sage .btn svg { height: 18px; width: 18px; }
.t-sage .btn-outline { background: transparent; color: var(--lume-primary-text); border-color: var(--lume-line-strong); }
.t-sage .btn-outline:hover { background: var(--lume-primary-soft); border-color: var(--lume-primary); }
.t-sage .btn-block { width: 100%; }
@media (min-width: 640px) { .t-sage .btn-block { width: auto; } }

/* ── Topo ── */
.t-sage .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg-blur); backdrop-filter: blur(12px); border-bottom: 1px solid var(--lume-line); }
.t-sage .nav-in { display: flex; align-items: center; justify-content: space-between; height: 70px; }
.t-sage .brand { font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 600; display: flex; align-items: center; gap: 10px; }
.t-sage .brand img { height: 36px; width: auto; object-fit: contain; }
.t-sage .nav-links { display: none; gap: 30px; }
@media (min-width: 1024px) { .t-sage .nav-links { display: flex; } }
.t-sage .nav-links a { font-size: 14px; font-weight: 500; color: var(--lume-fg-soft); }
.t-sage .nav-links a:hover { color: var(--lume-primary-text); }
.t-sage .nav-cta { display: none; }
@media (min-width: 1024px) { .t-sage .nav-cta { display: inline-flex; min-height: 42px; padding: 10px 22px; font-size: 14px; } }
.t-sage .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-fg); cursor: pointer; }
@media (min-width: 1024px) { .t-sage .burger { display: none; } }
.t-sage .burger svg { height: 25px; width: 25px; }
.t-sage .drawer-bg { position: fixed; inset: 0; background: rgba(20,26,22,.45); z-index: 60; }
.t-sage .drawer { position: fixed; inset: 0 0 0 auto; width: 84%; max-width: 320px; background: var(--lume-bg); z-index: 61; padding: 18px 22px 30px; display: flex; flex-direction: column; }
.t-sage .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-sage .drawer nav { margin-top: 30px; display: flex; flex-direction: column; }
.t-sage .drawer nav a { font-family: 'Outfit', sans-serif; font-size: 19px; font-weight: 500; padding: 14px 0; border-bottom: 1px solid var(--lume-line); }
.t-sage .drawer .btn { margin-top: auto; }

/* ── Capa ── */
.t-sage .hero { padding: 44px 0 60px; }
@media (min-width: 1024px) { .t-sage .hero { padding: 72px 0 100px; } }
.t-sage .hero-grid { display: grid; gap: 34px; align-items: center; }
@media (min-width: 1024px) { .t-sage .hero-grid { grid-template-columns: 1fr 1fr; gap: 56px; } }
.t-sage .hero h1 { font-size: clamp(32px, 7vw, 54px); }
.t-sage .hero h1 em { font-style: normal; color: var(--lume-primary-text); }
.t-sage .hero-actions { margin-top: 28px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 640px) { .t-sage .hero-actions { flex-direction: row; } }
.t-sage .hero-photo { position: relative; aspect-ratio: 5/6; border-radius: var(--lume-r-lg); overflow: hidden; box-shadow: 0 30px 60px -34px var(--lume-shadow); }
.t-sage .hero-photo img, .t-sage .hero-photo > div { width: 100%; height: 100%; object-fit: cover; }
.t-sage .hero-tags { margin-top: 26px; display: flex; flex-wrap: wrap; gap: 8px; }
.t-sage .hero-tags span { font-size: 12px; font-weight: 500; color: var(--lume-fg-soft); background: var(--lume-surface); border: 1px solid var(--lume-line); padding: 7px 14px; border-radius: 999px; }

/* ── Números ── */
.t-sage .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.t-sage .stats > div { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-md); padding: 24px 12px; text-align: center; }
.t-sage .stats b { display: block; font-family: 'Outfit', sans-serif; font-size: clamp(24px, 5vw, 38px); font-weight: 600; color: var(--lume-primary-text); }
.t-sage .stats span { display: block; margin-top: 5px; font-size: 12px; color: var(--lume-fg-faint); }

/* ── Serviços ── */
.t-sage .cards { margin-top: 40px; display: grid; gap: 18px; }
@media (min-width: 640px) { .t-sage .cards { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .t-sage .cards { grid-template-columns: repeat(3, 1fr); gap: 24px; } }
.t-sage .card { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 26px; display: flex; flex-direction: column; transition: box-shadow .25s, transform .25s, border-color .25s; }
.t-sage .card:hover { box-shadow: 0 20px 40px -26px var(--lume-shadow); transform: translateY(-3px); border-color: var(--lume-primary); }
.t-sage .card-ico { height: 48px; width: 48px; border-radius: var(--lume-r-md); background: var(--lume-primary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-sage .card-ico svg { height: 22px; width: 22px; }
.t-sage .card h3 { margin-top: 18px; font-size: 21px; }
.t-sage .card-desc { margin-top: 8px; font-size: 15px; color: var(--lume-fg-soft); flex: 1; }
.t-sage .card-img { margin-top: 18px; aspect-ratio: 16/10; border-radius: var(--lume-r-md); overflow: hidden; }
.t-sage .card-img img { width: 100%; height: 100%; object-fit: cover; }
.t-sage .card-meta { margin-top: 18px; padding-top: 16px; border-top: 1px solid var(--lume-line); display: flex; align-items: baseline; justify-content: space-between; gap: 10px; }
.t-sage .card-price { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 600; color: var(--lume-primary-text); }
.t-sage .card-dur { font-size: 13px; color: var(--lume-fg-faint); }
.t-sage .card .btn { margin-top: 16px; }

/* ── Galeria ── */
.t-sage .grid-img { margin-top: 40px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
@media (min-width: 900px) { .t-sage .grid-img { grid-template-columns: repeat(3, 1fr); gap: 20px; } }
.t-sage .grid-img figure { margin: 0; position: relative; aspect-ratio: 1/1; border-radius: var(--lume-r-lg); overflow: hidden; }
.t-sage .grid-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
.t-sage .grid-img figure:hover img { transform: scale(1.05); }
.t-sage .grid-img figcaption { position: absolute; inset: auto 0 0 0; padding: 24px 14px 12px; font-size: 12px; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.6), transparent); }

/* ── Antes e depois (linha do tempo) ── */
.t-sage .steps { margin-top: 40px; display: grid; gap: 18px; }
@media (min-width: 900px) { .t-sage .steps { grid-template-columns: repeat(2, 1fr); gap: 24px; } }
.t-sage .step { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); overflow: hidden; }
.t-sage .step-pair { display: grid; grid-template-columns: 1fr 1fr; }
.t-sage .step-pair > div { position: relative; aspect-ratio: 1/1; }
.t-sage .step-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-sage .step-pair span { position: absolute; left: 10px; top: 10px; font-size: 11px; font-weight: 600; background: var(--lume-surface); color: var(--lume-primary-text); padding: 5px 12px; border-radius: 999px; box-shadow: 0 4px 12px -6px rgba(0,0,0,.3); }
.t-sage .step-body { padding: 20px 22px 24px; }
.t-sage .step-body h3 { font-size: 19px; }
.t-sage .step-body p { margin-top: 6px; font-size: 14px; color: var(--lume-fg-soft); }

/* ── Depoimentos ── */
.t-sage .testi { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 26px; display: flex; flex-direction: column; }
.t-sage .testi .stars { display: inline-flex; gap: 2px; color: var(--lume-primary-text); }
.t-sage .testi .stars svg { height: 16px; width: 16px; }
.t-sage .testi p { margin-top: 14px; flex: 1; font-size: 15px; line-height: 1.75; color: var(--lume-fg-soft); }
.t-sage .testi-who { margin-top: 20px; display: flex; align-items: center; gap: 12px; }
.t-sage .testi-who img, .t-sage .testi-avatar { height: 42px; width: 42px; border-radius: 999px; object-fit: cover; }
.t-sage .testi-avatar { display: grid; place-items: center; background: var(--lume-primary-soft); color: var(--lume-primary-text); font-size: 13px; font-weight: 700; }
.t-sage .testi-who b { font-family: 'Outfit', sans-serif; font-size: 15px; font-weight: 600; }

/* ── Sobre ── */
.t-sage .split { display: grid; gap: 34px; align-items: center; }
@media (min-width: 1024px) { .t-sage .split { grid-template-columns: 1fr 1.1fr; gap: 60px; } }
.t-sage .split-img { aspect-ratio: 1/1; border-radius: var(--lume-r-lg); overflow: hidden; }
.t-sage .split-img img, .t-sage .split-img > div { width: 100%; height: 100%; object-fit: cover; }

/* ── FAQ ── */
.t-sage .faq { margin-top: 36px; max-width: 820px; margin-left: auto; margin-right: auto; display: grid; gap: 12px; }
.t-sage .faq details { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-md); }
.t-sage .faq summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 22px; font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 500; }
.t-sage .faq summary::-webkit-details-marker { display: none; }
.t-sage .faq summary svg { height: 19px; width: 19px; flex-shrink: 0; color: var(--lume-primary-text); transition: transform .25s; }
.t-sage .faq details[open] summary svg { transform: rotate(180deg); }
.t-sage .faq .answer { padding: 0 22px 22px; font-size: 15px; color: var(--lume-fg-soft); }

/* ── Onde estou ── */
.t-sage .info-grid { margin-top: 36px; display: grid; gap: 16px; }
@media (min-width: 768px) { .t-sage .info-grid { grid-template-columns: repeat(3, 1fr); } }
.t-sage .info { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 24px; }
.t-sage .info-ico { height: 44px; width: 44px; border-radius: var(--lume-r-md); background: var(--lume-primary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-sage .info-ico svg { height: 20px; width: 20px; }
.t-sage .info dt { margin-top: 16px; font-size: 12px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-sage .info dd { margin: 6px 0 0; font-size: 15px; }

/* ── Fecho ── */
.t-sage .cta-box { border-radius: var(--lume-r-lg); background: var(--lume-primary); color: var(--lume-on-primary); padding: 44px 24px; text-align: center; }
@media (min-width: 768px) { .t-sage .cta-box { padding: 64px 48px; } }
.t-sage .cta-box .pill { background: var(--lume-on-primary-veil); color: var(--lume-on-primary); }
.t-sage .cta-box h2, .t-sage .cta-box h2 em { color: var(--lume-on-primary); }
.t-sage .cta-box .lead { color: var(--lume-on-primary-soft); }
.t-sage .cta-box .btn { margin-top: 30px; background: var(--lume-on-primary); color: var(--lume-primary-text); }
.t-sage .cta-box .btn:hover { background: var(--lume-on-primary); opacity: .9; }

/* ── Rodapé ── */
.t-sage .foot { border-top: 1px solid var(--lume-line); padding: 34px 0; }
.t-sage .foot-in { display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
@media (min-width: 768px) { .t-sage .foot-in { flex-direction: row; justify-content: space-between; text-align: left; } }
.t-sage .foot-links { display: flex; gap: 10px; }
.t-sage .foot-links a { height: 42px; width: 42px; border-radius: 999px; background: var(--lume-surface); border: 1px solid var(--lume-line); display: grid; place-items: center; color: var(--lume-fg-soft); }
.t-sage .foot-links a:hover { color: var(--lume-primary-text); border-color: var(--lume-primary); }
.t-sage .foot-links svg { height: 18px; width: 18px; }
.t-sage .foot-legal { margin-top: 18px; text-align: center; font-size: 12px; color: var(--lume-fg-faint); }

.t-sage .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 9px; padding: 15px 24px; border-radius: 999px; background: var(--lume-primary); color: var(--lume-on-primary); border: 0; font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-sage .fab svg { height: 19px; width: 19px; }
`;

export default function ClinicSage({ config, services, sections, onBook, preview }: TemplateProps) {
  const [menu, setMenu] = useState(false);
  const { identity, content } = config;
  const nav = buildNav(sections);
  const wa = whatsappHref(config);
  const ig = instagramHref(config);
  const maps = mapsHref(config);
  const brandName = identity.studioName || identity.professionalName || 'Meu estúdio';
  const heroImage = content.hero.imageUrl || identity.photoUrl;
  const aboutImage = content.about.imageUrl || identity.photoUrl;

  const Head = ({ pill, title, highlight, lead, center = true }: {
    pill: string; title: string; highlight: string; lead?: string; center?: boolean;
  }) => (
    <Reveal className={center ? 'center' : undefined}>
      {pill && <span className="pill">{pill}</span>}
      <h2 className="h2">{title}{highlight ? <> <em>{highlight}</em></> : null}</h2>
      {lead && <p className="lead">{lead}</p>}
    </Reveal>
  );

  const section = (id: SiteSectionId) => {
    switch (id) {
      case 'hero':
        return (
          <section id={SECTION_ANCHOR.hero} className="hero">
            <div className="wrap hero-grid">
              <Reveal>
                {(content.hero.eyebrow || identity.role) && (
                  <span className="pill">{[identity.role, content.hero.eyebrow].filter(Boolean).join(' · ')}</span>
                )}
                <h1>{content.hero.headline}{content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}</h1>
                {content.hero.subheadline && <p className="lead">{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button type="button" className="btn btn-block" onClick={() => onBook()}>
                    {content.hero.ctaPrimary}<IconArrow />
                  </button>
                  {content.hero.ctaSecondary && sections.includes('services') && (
                    <a className="btn btn-outline btn-block" href={`#${SECTION_ANCHOR.services}`}>{content.hero.ctaSecondary}</a>
                  )}
                </div>
                {services.length > 0 && (
                  <div className="hero-tags">
                    {services.slice(0, 4).map(s => <span key={s.id}>{s.name}</span>)}
                  </div>
                )}
              </Reveal>
              <Reveal delay={120}>
                <div className="hero-photo">
                  {heroImage
                    ? <SiteImage src={heroImage} alt={`${identity.professionalName || brandName}`} priority />
                    : <ImageFallback label="sua foto aqui" />}
                </div>
              </Reveal>
            </div>
          </section>
        );

      case 'stats':
        return (
          <section id={SECTION_ANCHOR.stats} style={{ paddingBottom: 24 }}>
            <Reveal className="wrap">
              <div className="stats">
                {content.stats.items.map(s => <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>)}
              </div>
            </Reveal>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec band-soft">
            <div className="wrap">
              <Head pill={content.services.eyebrow} title={content.services.title} highlight={content.services.highlight} lead={content.services.subtitle} />
              <div className="cards">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 3) * 80}>
                    <article className="card">
                      <span className="card-ico"><IconSparkle /></span>
                      <h3>{s.name}</h3>
                      {s.description && <p className="card-desc">{s.description}</p>}
                      {s.imageUrl && <div className="card-img"><SiteImage src={s.imageUrl} alt={s.name} /></div>}
                      {(content.services.showPrices || content.services.showDuration) && (
                        <div className="card-meta">
                          {content.services.showPrices && <span className="card-price">{formatPrice(s.priceCents)}</span>}
                          {content.services.showDuration && <span className="card-dur">{formatDuration(s.durationMinutes)}</span>}
                        </div>
                      )}
                      <button type="button" className="btn" onClick={() => onBook(s.id)}>Agendar<IconArrow /></button>
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
            <div className="wrap split">
              <Reveal>
                <div className="split-img">
                  {aboutImage ? <SiteImage src={aboutImage} alt={identity.professionalName || brandName} /> : <ImageFallback label="sua foto" />}
                </div>
              </Reveal>
              <Reveal delay={110}>
                {content.about.eyebrow && <span className="pill">{content.about.eyebrow}</span>}
                <h2 className="h2">{content.about.title}{content.about.highlight ? <> <em>{content.about.highlight}</em></> : null}</h2>
                <div className="lead"><Paragraphs text={content.about.text} /></div>
                {content.about.cta && (
                  <button type="button" className="btn btn-block" style={{ marginTop: 26 }} onClick={() => onBook()}>
                    {content.about.cta}<IconArrow />
                  </button>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec band-sage">
            <div className="wrap">
              <Head pill={content.gallery.eyebrow} title={content.gallery.title} highlight={content.gallery.highlight} />
              <div className="grid-img">
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
              <Head pill={content.beforeAfter.eyebrow} title={content.beforeAfter.title} highlight={content.beforeAfter.highlight} />
              <div className="steps">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 80}>
                    <article className="step">
                      <div className="step-pair">
                        <div><SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} /><span>Antes</span></div>
                        <div><SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} /><span>Depois</span></div>
                      </div>
                      {(item.title || item.description) && (
                        <div className="step-body">
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
          <section id={SECTION_ANCHOR.testimonials} className="sec band-soft">
            <div className="wrap">
              <Head pill={content.testimonials.eyebrow} title={content.testimonials.title} highlight={content.testimonials.highlight} />
              <div className="cards">
                {content.testimonials.items.map((t, i) => (
                  <Reveal key={t.id} delay={(i % 3) * 80}>
                    <article className="testi">
                      <Stars rating={t.rating} className="stars" />
                      <p>&ldquo;{t.text}&rdquo;</p>
                      {t.name && (
                        <div className="testi-who">
                          {t.photoUrl ? <SiteImage src={t.photoUrl} alt={t.name} /> : <span className="testi-avatar">{initials(t.name)}</span>}
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

      case 'faq':
        return (
          <section id={SECTION_ANCHOR.faq} className="sec">
            <div className="wrap">
              <Head pill={content.faq.eyebrow} title={content.faq.title} highlight={content.faq.highlight} />
              <div className="faq">
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
          <section id={SECTION_ANCHOR.location} className="sec band-sage">
            <div className="wrap">
              <Head pill={content.location.eyebrow} title={content.location.title} highlight={content.location.highlight} lead={content.location.note} />
              <Reveal>
                <dl className="info-grid">
                  {(identity.address || identity.city) && (
                    <div className="info">
                      <span className="info-ico"><IconMapPin /></span>
                      <dt>Endereço</dt>
                      <dd>{maps
                        ? <a href={maps} target="_blank" rel="noopener noreferrer">{[identity.address, identity.city].filter(Boolean).join(' — ')}</a>
                        : [identity.address, identity.city].filter(Boolean).join(' — ')}</dd>
                    </div>
                  )}
                  {content.location.hours && (
                    <div className="info"><span className="info-ico"><IconClock /></span><dt>Horário</dt><dd>{content.location.hours}</dd></div>
                  )}
                  {(wa || identity.email) && (
                    <div className="info">
                      <span className="info-ico">{wa ? <IconWhatsApp /> : <IconMail />}</span>
                      <dt>Contato</dt>
                      <dd>{wa
                        ? <a href={wa} target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
                        : <a href={`mailto:${identity.email}`}>{identity.email}</a>}</dd>
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
              <div className="cta-box">
                {content.contact.eyebrow && <span className="pill">{content.contact.eyebrow}</span>}
                <h2 className="h2">{content.contact.title}{content.contact.highlight ? <> <em>{content.contact.highlight}</em></> : null}</h2>
                {content.contact.text && <p className="lead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>{content.contact.text}</p>}
                <button type="button" className="btn" onClick={() => onBook()}>{content.contact.cta}<IconArrow /></button>
              </div>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-sage" style={themeToCssVars(config.theme)}>
      <style dangerouslySetInnerHTML={{ __html: CSS + REVEAL_CSS }} />

      <header className="nav">
        <div className="wrap nav-in">
          <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>
            {identity.logoUrl ? <SiteImage src={identity.logoUrl} alt={brandName} priority /> : brandName}
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            {nav.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
          <button type="button" className="btn nav-cta" onClick={() => onBook()}>Agendar</button>
          <button type="button" className="burger" aria-label="Abrir menu" onClick={() => setMenu(true)}><IconMenu /></button>
        </div>
      </header>

      {menu && (
        <>
          <div className="drawer-bg" onClick={() => setMenu(false)} aria-hidden="true" />
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-top">
              <span className="brand">{brandName}</span>
              <button type="button" className="burger" aria-label="Fechar menu" onClick={() => setMenu(false)}><IconClose /></button>
            </div>
            <nav>{nav.map(l => <a key={l.href} href={l.href} onClick={() => setMenu(false)}>{l.label}</a>)}</nav>
            <button type="button" className="btn" onClick={() => { setMenu(false); onBook(); }}>{content.hero.ctaPrimary}</button>
          </div>
        </>
      )}

      <main>{sections.map(id => <React.Fragment key={id}>{section(id)}</React.Fragment>)}</main>

      <footer className="foot">
        <div className="wrap">
          <div className="foot-in">
            <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>{brandName}</a>
            <div className="foot-links">
              {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>}
              {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>}
              {maps && <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Como chegar"><IconMapPin /></a>}
            </div>
          </div>
          <p className="foot-legal">{content.footer.note || `© ${new Date().getFullYear()} ${brandName}`}</p>
        </div>
      </footer>

      {!preview && <button type="button" className="fab" onClick={() => onBook()}><IconWhatsApp /> Agendar</button>}
    </div>
  );
}
