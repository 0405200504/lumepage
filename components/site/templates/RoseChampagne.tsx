'use client';

/**
 * ============================================================================
 * TEMPLATE · Rosé Champagne
 * ============================================================================
 * Origem: repositório `Julia-Roberta` (página de lash/brow em arquivo único).
 * O que veio de lá: rosé + champagne sobre off-white, títulos Playfair com
 * corpo em Poppins, o "kicker" com traço à esquerda, cartões macios com sombra
 * baixa, a faixa de números logo abaixo da capa, a grelha de tratamentos e o
 * mosaico estilo Instagram. É o template mais "beleza" do catálogo.
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
  IconWhatsApp, IconInstagram, IconMapPin, IconClock,
  IconMenu, IconClose, IconChevron, IconSparkle,
} from '../shared';

const CSS = `
.t-rose { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Poppins', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.75; font-weight: 300; }
.t-rose *, .t-rose *::before, .t-rose *::after { box-sizing: border-box; }
.t-rose img { display: block; max-width: 100%; }
.t-rose a { color: inherit; text-decoration: none; }
.t-rose h1, .t-rose h2, .t-rose h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 500; line-height: 1.2; margin: 0; color: var(--lume-fg); }
.t-rose p { margin: 0; }
.t-rose section[id] { scroll-margin-top: 84px; }
.t-rose [data-lume-placeholder] { background: var(--lume-secondary-soft); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 12px; }

.t-rose .wrap { width: 100%; max-width: 1140px; margin: 0 auto; padding: 0 24px; }
.t-rose .sec { padding: 70px 0; }
@media (min-width: 768px) { .t-rose .sec { padding: 100px 0; } }
.t-rose .soft { background: var(--lume-surface-alt); }
.t-rose .white { background: var(--lume-surface); }
.t-rose .center { text-align: center; }

.t-rose .kicker { display: inline-block; font-size: 11px; font-weight: 500; letter-spacing: .28em; text-transform: uppercase; color: var(--lume-primary-text); margin-bottom: 16px; }
.t-rose .kicker::before { content: ''; display: inline-block; width: 26px; height: 1px; background: var(--lume-secondary); vertical-align: middle; margin-right: 12px; }
.t-rose .center .kicker::after { content: ''; display: inline-block; width: 26px; height: 1px; background: var(--lume-secondary); vertical-align: middle; margin-left: 12px; }
.t-rose .h2 { font-size: clamp(28px, 5vw, 46px); }
.t-rose .h2 em { font-style: italic; color: var(--lume-primary-text); }
.t-rose .lead { margin-top: 16px; font-size: 16px; line-height: 1.9; color: var(--lume-fg-soft); max-width: 60ch; }
.t-rose .center .lead { margin-left: auto; margin-right: auto; }

.t-rose .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 50px; padding: 14px 30px; border-radius: var(--lume-r-pill); font-size: 13px; font-weight: 500; letter-spacing: .06em; border: 1px solid var(--lume-primary); background: var(--lume-primary); color: var(--lume-on-primary); cursor: pointer; font-family: inherit; transition: transform .35s cubic-bezier(.25,.46,.45,.94), box-shadow .35s, background .3s, color .3s; }
.t-rose .btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -14px var(--lume-shadow); background: var(--lume-primary-hover); }
.t-rose .btn svg { height: 17px; width: 17px; }
.t-rose .btn-outline { background: transparent; color: var(--lume-primary-text); border-color: var(--lume-secondary); }
.t-rose .btn-outline:hover { background: var(--lume-secondary-soft); }
.t-rose .btn-block { width: 100%; }
@media (min-width: 640px) { .t-rose .btn-block { width: auto; } }

/* ── Topo ── */
.t-rose .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg-blur); backdrop-filter: blur(12px); border-bottom: 1px solid var(--lume-line); }
.t-rose .nav-in { display: flex; align-items: center; justify-content: space-between; height: 74px; }
.t-rose .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; letter-spacing: .04em; display: flex; align-items: center; gap: 10px; }
.t-rose .brand em { font-style: italic; color: var(--lume-primary-text); }
.t-rose .brand img { height: 38px; width: auto; object-fit: contain; }
.t-rose .nav-links { display: none; gap: 30px; }
@media (min-width: 1024px) { .t-rose .nav-links { display: flex; } }
.t-rose .nav-links a { font-size: 13px; font-weight: 400; color: var(--lume-fg-soft); position: relative; }
.t-rose .nav-links a::after { content: ''; position: absolute; left: 0; right: 100%; bottom: -6px; height: 1px; background: var(--lume-primary); transition: right .3s; }
.t-rose .nav-links a:hover::after { right: 0; }
.t-rose .nav-cta { display: none; }
@media (min-width: 1024px) { .t-rose .nav-cta { display: inline-flex; min-height: 42px; padding: 10px 24px; font-size: 12px; } }
.t-rose .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-fg); cursor: pointer; }
@media (min-width: 1024px) { .t-rose .burger { display: none; } }
.t-rose .burger svg { height: 25px; width: 25px; }
.t-rose .drawer-bg { position: fixed; inset: 0; background: rgba(44,42,41,.5); z-index: 60; }
.t-rose .drawer { position: fixed; inset: 0 0 0 auto; width: 78%; max-width: 320px; background: var(--lume-bg); z-index: 61; padding: 20px 26px 34px; display: flex; flex-direction: column; box-shadow: -8px 0 40px rgba(0,0,0,.1); }
.t-rose .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-rose .drawer nav { margin-top: 40px; display: flex; flex-direction: column; gap: 24px; }
.t-rose .drawer nav a { font-size: 16px; }
.t-rose .drawer .btn { margin-top: auto; }

/* ── Capa ── */
.t-rose .hero { padding: 44px 0 56px; position: relative; overflow: hidden; }
@media (min-width: 1024px) { .t-rose .hero { padding: 76px 0 96px; } }
.t-rose .hero::before { content: ''; position: absolute; right: -140px; top: -60px; height: 420px; width: 420px; border-radius: 999px; background: var(--lume-secondary-soft); filter: blur(60px); pointer-events: none; }
.t-rose .hero-grid { position: relative; display: grid; gap: 34px; align-items: center; }
@media (min-width: 1024px) { .t-rose .hero-grid { grid-template-columns: 1.05fr .95fr; gap: 56px; } }
.t-rose .hero-copy { order: 2; }
@media (min-width: 1024px) { .t-rose .hero-copy { order: 1; } }
.t-rose .hero-art { order: 1; }
@media (min-width: 1024px) { .t-rose .hero-art { order: 2; } }
.t-rose .hero h1 { font-size: clamp(32px, 7.5vw, 58px); }
.t-rose .hero h1 em { font-style: italic; color: var(--lume-primary-text); }
.t-rose .hero-actions { margin-top: 30px; display: flex; flex-direction: column; gap: 12px; }
@media (min-width: 640px) { .t-rose .hero-actions { flex-direction: row; } }
.t-rose .hero-photo { position: relative; aspect-ratio: 1/1; border-radius: 999px; overflow: hidden; border: 8px solid var(--lume-surface); box-shadow: 0 30px 60px -30px var(--lume-shadow); max-width: 420px; margin: 0 auto; }
.t-rose .hero-photo img, .t-rose .hero-photo > div { width: 100%; height: 100%; object-fit: cover; }

/* ── Números ── */
.t-rose .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 34px 0; }
.t-rose .stats > div { text-align: center; }
.t-rose .stats b { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(26px, 5.5vw, 42px); font-weight: 600; color: var(--lume-primary-text); }
.t-rose .stats span { display: block; margin-top: 4px; font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--lume-fg-faint); }

/* ── Serviços (tiles) ── */
.t-rose .tiles { margin-top: 42px; display: grid; gap: 18px; grid-template-columns: repeat(2, 1fr); }
@media (min-width: 900px) { .t-rose .tiles { grid-template-columns: repeat(3, 1fr); gap: 26px; } }
.t-rose .tile { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 24px 20px; display: flex; flex-direction: column; text-align: center; align-items: center; transition: transform .35s cubic-bezier(.25,.46,.45,.94), box-shadow .35s, border-color .3s; }
.t-rose .tile:hover { transform: translateY(-5px); box-shadow: 0 22px 44px -26px var(--lume-shadow); border-color: var(--lume-secondary); }
.t-rose .tile-ico { height: 54px; width: 54px; border-radius: 999px; background: var(--lume-secondary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-rose .tile-ico svg { height: 24px; width: 24px; }
.t-rose .tile h3 { margin-top: 16px; font-size: 19px; }
.t-rose .tile-desc { margin-top: 8px; font-size: 14px; color: var(--lume-fg-soft); flex: 1; }
.t-rose .tile-img { margin-top: 16px; width: 100%; aspect-ratio: 4/3; border-radius: var(--lume-r-md); overflow: hidden; }
.t-rose .tile-img img { width: 100%; height: 100%; object-fit: cover; }
.t-rose .tile-price { margin-top: 14px; font-family: 'Playfair Display', Georgia, serif; font-size: 22px; font-weight: 600; color: var(--lume-primary-text); }
.t-rose .tile-dur { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-rose .tile .btn { margin-top: 16px; width: 100%; min-height: 44px; padding: 11px 18px; font-size: 12px; }

/* ── Sobre ── */
.t-rose .split { display: grid; gap: 34px; align-items: center; }
@media (min-width: 1024px) { .t-rose .split { grid-template-columns: .9fr 1.1fr; gap: 60px; } }
.t-rose .split-img { aspect-ratio: 4/5; border-radius: var(--lume-r-lg); overflow: hidden; box-shadow: 0 26px 52px -30px var(--lume-shadow); }
.t-rose .split-img img, .t-rose .split-img > div { width: 100%; height: 100%; object-fit: cover; }

/* ── Galeria (mosaico Instagram) ── */
.t-rose .insta { margin-top: 42px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 768px) { .t-rose .insta { grid-template-columns: repeat(4, 1fr); gap: 14px; } }
.t-rose .insta figure { margin: 0; position: relative; aspect-ratio: 1/1; border-radius: var(--lume-r-md); overflow: hidden; }
.t-rose .insta img { width: 100%; height: 100%; object-fit: cover; transition: transform .5s; }
.t-rose .insta figure:hover img { transform: scale(1.07); }
.t-rose .insta figcaption { position: absolute; inset: auto 0 0 0; padding: 22px 12px 10px; font-size: 11px; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.62), transparent); }

/* ── Antes e depois ── */
.t-rose .ba { margin-top: 42px; display: grid; gap: 22px; }
@media (min-width: 900px) { .t-rose .ba { grid-template-columns: repeat(2, 1fr); gap: 30px; } }
.t-rose .ba-card { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); overflow: hidden; }
.t-rose .ba-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
.t-rose .ba-pair > div { position: relative; aspect-ratio: 1/1; }
.t-rose .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-rose .ba-pair span { position: absolute; left: 10px; top: 10px; font-size: 10px; letter-spacing: .14em; text-transform: uppercase; font-weight: 500; background: var(--lume-primary); color: var(--lume-on-primary); padding: 5px 12px; border-radius: var(--lume-r-pill); }
.t-rose .ba-body { padding: 18px 22px 22px; }
.t-rose .ba-body h3 { font-size: 19px; }
.t-rose .ba-body p { margin-top: 6px; font-size: 14px; color: var(--lume-fg-soft); }

/* ── Depoimentos ── */
.t-rose .testi-grid { margin-top: 42px; display: grid; gap: 20px; }
@media (min-width: 900px) { .t-rose .testi-grid { grid-template-columns: repeat(3, 1fr); gap: 26px; } }
.t-rose .testi { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 26px; display: flex; flex-direction: column; }
.t-rose .testi .stars { display: inline-flex; gap: 3px; color: var(--lume-secondary); }
.t-rose .testi .stars svg { height: 16px; width: 16px; }
.t-rose .testi p { margin-top: 14px; flex: 1; font-size: 15px; line-height: 1.85; color: var(--lume-fg-soft); }
.t-rose .testi-who { margin-top: 20px; display: flex; align-items: center; gap: 12px; }
.t-rose .testi-who img, .t-rose .testi-avatar { height: 44px; width: 44px; border-radius: 999px; object-fit: cover; }
.t-rose .testi-avatar { display: grid; place-items: center; background: var(--lume-secondary-soft); color: var(--lume-primary-text); font-size: 14px; font-weight: 600; }
.t-rose .testi-who b { font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 600; }

/* ── FAQ ── */
.t-rose .faq { margin-top: 38px; max-width: 820px; margin-left: auto; margin-right: auto; display: grid; gap: 12px; }
.t-rose .faq details { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-md); }
.t-rose .faq summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 20px 24px; font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 500; }
.t-rose .faq summary::-webkit-details-marker { display: none; }
.t-rose .faq summary svg { height: 19px; width: 19px; flex-shrink: 0; color: var(--lume-primary-text); transition: transform .25s; }
.t-rose .faq details[open] summary svg { transform: rotate(180deg); }
.t-rose .faq .answer { padding: 0 24px 22px; font-size: 15px; color: var(--lume-fg-soft); }

/* ── Onde estou ── */
.t-rose .info-grid { margin-top: 38px; display: grid; gap: 16px; }
@media (min-width: 768px) { .t-rose .info-grid { grid-template-columns: repeat(3, 1fr); } }
.t-rose .info { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-lg); padding: 26px; text-align: center; }
.t-rose .info-ico { height: 48px; width: 48px; margin: 0 auto; border-radius: 999px; background: var(--lume-secondary-soft); color: var(--lume-primary-text); display: grid; place-items: center; }
.t-rose .info-ico svg { height: 21px; width: 21px; }
.t-rose .info dt { margin-top: 14px; font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-rose .info dd { margin: 7px 0 0; font-size: 15px; }

/* ── Fecho ── */
.t-rose .cta-box { border-radius: var(--lume-r-lg); background: var(--lume-primary); color: var(--lume-on-primary); padding: 46px 24px; text-align: center; box-shadow: 0 30px 60px -34px var(--lume-shadow); }
@media (min-width: 768px) { .t-rose .cta-box { padding: 68px 52px; } }
.t-rose .cta-box .kicker { color: var(--lume-on-primary-faint); }
.t-rose .cta-box .kicker::before, .t-rose .cta-box .kicker::after { background: var(--lume-on-primary-line); }
.t-rose .cta-box h2, .t-rose .cta-box h2 em { color: var(--lume-on-primary); }
.t-rose .cta-box .lead { color: var(--lume-on-primary-soft); }
.t-rose .cta-box .btn { margin-top: 30px; background: var(--lume-on-primary); border-color: var(--lume-on-primary); color: var(--lume-primary-text); }

/* ── Rodapé ── */
.t-rose .foot { padding: 42px 0; border-top: 1px solid var(--lume-line); text-align: center; }
.t-rose .foot-links { margin-top: 20px; display: flex; justify-content: center; gap: 12px; }
.t-rose .foot-links a { height: 44px; width: 44px; border-radius: 999px; background: var(--lume-surface); border: 1px solid var(--lume-line); display: grid; place-items: center; color: var(--lume-fg-soft); transition: transform .3s, color .3s; }
.t-rose .foot-links a:hover { transform: translateY(-3px); color: var(--lume-primary-text); }
.t-rose .foot-links svg { height: 19px; width: 19px; }
.t-rose .foot-legal { margin-top: 20px; font-size: 12px; color: var(--lume-fg-faint); }

.t-rose .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 9px; padding: 15px 24px; border-radius: var(--lume-r-pill); background: var(--lume-primary); color: var(--lume-on-primary); border: 0; font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-rose .fab svg { height: 18px; width: 18px; }
`;

export default function RoseChampagne({ config, services, sections, onBook, preview }: TemplateProps) {
  const [menu, setMenu] = useState(false);
  const { identity, content } = config;
  const nav = buildNav(sections);
  const wa = whatsappHref(config);
  const ig = instagramHref(config);
  const maps = mapsHref(config);
  const brandName = identity.studioName || identity.professionalName || 'Meu estúdio';
  const heroImage = content.hero.imageUrl || identity.photoUrl;
  const aboutImage = content.about.imageUrl || identity.photoUrl;

  const Head = ({ kicker, title, highlight, lead }: { kicker: string; title: string; highlight: string; lead?: string }) => (
    <Reveal className="center">
      {kicker && <span className="kicker">{kicker}</span>}
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
              <Reveal className="hero-copy">
                {(content.hero.eyebrow || identity.role) && (
                  <span className="kicker">{[identity.role, content.hero.eyebrow].filter(Boolean).join(' · ')}</span>
                )}
                <h1>{content.hero.headline}{content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}</h1>
                {content.hero.subheadline && <p className="lead">{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button type="button" className="btn btn-block" onClick={() => onBook()}>
                    <IconSparkle />{content.hero.ctaPrimary}
                  </button>
                  {content.hero.ctaSecondary && sections.includes('gallery') && (
                    <a className="btn btn-outline btn-block" href={`#${SECTION_ANCHOR.gallery}`}>{content.hero.ctaSecondary}</a>
                  )}
                </div>
              </Reveal>
              <Reveal className="hero-art" delay={120}>
                <div className="hero-photo">
                  {heroImage
                    ? <SiteImage src={heroImage} alt={identity.professionalName || brandName} priority />
                    : <ImageFallback label="sua foto aqui" />}
                </div>
              </Reveal>
            </div>
          </section>
        );

      case 'stats':
        return (
          <section id={SECTION_ANCHOR.stats} className="white">
            <Reveal className="wrap">
              <div className="stats">
                {content.stats.items.map(s => <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>)}
              </div>
            </Reveal>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec soft">
            <div className="wrap">
              <Head kicker={content.services.eyebrow} title={content.services.title} highlight={content.services.highlight} lead={content.services.subtitle} />
              <div className="tiles">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 3) * 80}>
                    <article className="tile">
                      <span className="tile-ico"><IconSparkle /></span>
                      <h3>{s.name}</h3>
                      {s.description && <p className="tile-desc">{s.description}</p>}
                      {s.imageUrl && <div className="tile-img"><SiteImage src={s.imageUrl} alt={s.name} /></div>}
                      {content.services.showPrices && <span className="tile-price">{formatPrice(s.priceCents)}</span>}
                      {content.services.showDuration && <span className="tile-dur">{formatDuration(s.durationMinutes)}</span>}
                      <button type="button" className="btn" onClick={() => onBook(s.id)}>Agendar</button>
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
                {content.about.eyebrow && <span className="kicker">{content.about.eyebrow}</span>}
                <h2 className="h2">{content.about.title}{content.about.highlight ? <> <em>{content.about.highlight}</em></> : null}</h2>
                <div className="lead"><Paragraphs text={content.about.text} /></div>
                {content.about.cta && (
                  <button type="button" className="btn btn-block" style={{ marginTop: 28 }} onClick={() => onBook()}>{content.about.cta}</button>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'beforeAfter':
        return (
          <section id={SECTION_ANCHOR.beforeAfter} className="sec soft">
            <div className="wrap">
              <Head kicker={content.beforeAfter.eyebrow} title={content.beforeAfter.title} highlight={content.beforeAfter.highlight} />
              <div className="ba">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 80}>
                    <article className="ba-card">
                      <div className="ba-pair">
                        <div><SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} /><span>Antes</span></div>
                        <div><SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} /><span>Depois</span></div>
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
          <section id={SECTION_ANCHOR.testimonials} className="sec">
            <div className="wrap">
              <Head kicker={content.testimonials.eyebrow} title={content.testimonials.title} highlight={content.testimonials.highlight} />
              <div className="testi-grid">
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

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec soft">
            <div className="wrap">
              <Head kicker={content.gallery.eyebrow} title={content.gallery.title} highlight={content.gallery.highlight} />
              <div className="insta">
                {content.gallery.items.map((item, i) => (
                  <Reveal as="figure" key={item.id} delay={(i % 4) * 60}>
                    <SiteImage src={item.url} alt={item.caption || `Trabalho de ${brandName}`} />
                    {item.caption && <figcaption>{item.caption}</figcaption>}
                  </Reveal>
                ))}
              </div>
              {ig && (
                <div className="center" style={{ marginTop: 28 }}>
                  <a className="btn btn-outline" href={ig} target="_blank" rel="noopener noreferrer">
                    <IconInstagram />Ver mais no Instagram
                  </a>
                </div>
              )}
            </div>
          </section>
        );

      case 'faq':
        return (
          <section id={SECTION_ANCHOR.faq} className="sec">
            <div className="wrap">
              <Head kicker={content.faq.eyebrow} title={content.faq.title} highlight={content.faq.highlight} />
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
          <section id={SECTION_ANCHOR.location} className="sec soft">
            <div className="wrap">
              <Head kicker={content.location.eyebrow} title={content.location.title} highlight={content.location.highlight} lead={content.location.note} />
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
                  {wa && (
                    <div className="info">
                      <span className="info-ico"><IconWhatsApp /></span>
                      <dt>WhatsApp</dt>
                      <dd><a href={wa} target="_blank" rel="noopener noreferrer">Falar comigo</a></dd>
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
                {content.contact.eyebrow && <span className="kicker">{content.contact.eyebrow}</span>}
                <h2 className="h2">{content.contact.title}{content.contact.highlight ? <> <em>{content.contact.highlight}</em></> : null}</h2>
                {content.contact.text && <p className="lead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>{content.contact.text}</p>}
                <button type="button" className="btn" onClick={() => onBook()}><IconSparkle />{content.contact.cta}</button>
              </div>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-rose" style={themeToCssVars(config.theme)}>
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
          <span className="brand" style={{ justifyContent: 'center' }}>{brandName}</span>
          <div className="foot-links">
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>}
            {maps && <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Como chegar"><IconMapPin /></a>}
          </div>
          <p className="foot-legal">{content.footer.note || `© ${new Date().getFullYear()} ${brandName}`}</p>
        </div>
      </footer>

      {!preview && <button type="button" className="fab" onClick={() => onBook()}><IconWhatsApp /> Agendar</button>}
    </div>
  );
}
