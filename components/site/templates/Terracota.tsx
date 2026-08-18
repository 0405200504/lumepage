'use client';

/**
 * ============================================================================
 * TEMPLATE · Terracota
 * ============================================================================
 * Origem: repositório `page-3-portf-lio`.
 * O que veio de lá: marrom profundo + terracota + bege areia, títulos em
 * Cormorant sobre corpo em Montserrat, botões retos em caixa alta com muito
 * espaçamento, blocos largos de texto explicando o método e o fecho em bloco
 * escuro. É o template mais "acolhedor" do catálogo.
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
  IconMenu, IconClose, IconChevron,
} from '../shared';

const CSS = `
.t-terra { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.7; font-weight: 300; }
.t-terra *, .t-terra *::before, .t-terra *::after { box-sizing: border-box; }
.t-terra img { display: block; max-width: 100%; }
.t-terra a { color: inherit; text-decoration: none; }
.t-terra h1, .t-terra h2, .t-terra h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 500; line-height: 1.18; margin: 0; color: var(--lume-primary-text); }
.t-terra p { margin: 0; }
.t-terra section[id] { scroll-margin-top: 74px; }
.t-terra [data-lume-placeholder] { background: var(--lume-secondary-soft); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }

.t-terra .wrap { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 20px; }
.t-terra .narrow { max-width: 820px; margin: 0 auto; }
.t-terra .sec { padding: 68px 0; }
@media (min-width: 768px) { .t-terra .sec { padding: 104px 0; } }
.t-terra .sand { background: var(--lume-secondary-soft); }
.t-terra .center { text-align: center; }

.t-terra .kicker { font-size: 11px; letter-spacing: .3em; text-transform: uppercase; color: var(--lume-secondary); font-weight: 500; margin: 0 0 14px; }
.t-terra .h2 { font-size: clamp(32px, 5.4vw, 52px); }
.t-terra .h2 em { font-style: italic; color: var(--lume-secondary); }
.t-terra .lead { margin-top: 18px; font-size: 16px; line-height: 1.85; color: var(--lume-fg-soft); }
@media (min-width: 768px) { .t-terra .lead { font-size: 17px; } }
.t-terra .center .lead { max-width: 60ch; margin-left: auto; margin-right: auto; }

.t-terra .btn { display: inline-block; text-align: center; padding: 15px 32px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; font-weight: 500; border: 1px solid var(--lume-primary); background: var(--lume-primary); color: var(--lume-on-primary); border-radius: var(--lume-r-sm); cursor: pointer; font-family: inherit; transition: background .3s, color .3s, border-color .3s; }
.t-terra .btn:hover { background: var(--lume-secondary); border-color: var(--lume-secondary); color: var(--lume-on-secondary); }
.t-terra .btn-outline { background: transparent; color: var(--lume-primary-text); }
.t-terra .btn-outline:hover { background: var(--lume-primary); color: var(--lume-on-primary); border-color: var(--lume-primary); }
.t-terra .btn-onDark { background: transparent; border-color: rgba(255,255,255,.6); color: #fff; }
.t-terra .btn-onDark:hover { background: #fff; border-color: #fff; color: var(--lume-primary-text); }
.t-terra .btn-block { display: block; width: 100%; }
@media (min-width: 640px) { .t-terra .btn-block { display: inline-block; width: auto; } }

/* ── Topo ── */
.t-terra .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg-blur); backdrop-filter: blur(8px); border-bottom: 1px solid var(--lume-line); }
.t-terra .nav-in { display: flex; align-items: center; justify-content: space-between; height: 66px; }
.t-terra .brand { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 23px; font-weight: 600; letter-spacing: .06em; color: var(--lume-primary-text); display: flex; align-items: center; gap: 10px; }
.t-terra .brand img { height: 34px; width: auto; object-fit: contain; }
.t-terra .nav-links { display: none; gap: 30px; }
@media (min-width: 1024px) { .t-terra .nav-links { display: flex; } }
.t-terra .nav-links a { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; font-weight: 500; color: var(--lume-fg-soft); }
.t-terra .nav-links a:hover { color: var(--lume-secondary); }
.t-terra .nav-cta { display: none; }
@media (min-width: 1024px) { .t-terra .nav-cta { display: inline-block; padding: 11px 24px; } }
.t-terra .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-primary-text); cursor: pointer; }
@media (min-width: 1024px) { .t-terra .burger { display: none; } }
.t-terra .burger svg { height: 25px; width: 25px; }
.t-terra .drawer-bg { position: fixed; inset: 0; background: rgba(28,26,25,.5); z-index: 60; }
.t-terra .drawer { position: fixed; inset: 0 0 0 auto; width: 84%; max-width: 320px; background: var(--lume-bg); z-index: 61; padding: 18px 24px 32px; display: flex; flex-direction: column; }
.t-terra .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-terra .drawer nav { margin-top: 34px; display: flex; flex-direction: column; }
.t-terra .drawer nav a { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 23px; padding: 13px 0; border-bottom: 1px solid var(--lume-line); color: var(--lume-primary-text); }
.t-terra .drawer .btn { margin-top: auto; }

/* ── Capa ── */
.t-terra .hero { position: relative; min-height: 80vh; display: grid; place-items: center; text-align: center; padding: 80px 0; overflow: hidden; }
.t-terra .hero-bg { position: absolute; inset: 0; }
.t-terra .hero-bg img, .t-terra .hero-bg > div { width: 100%; height: 100%; object-fit: cover; }
.t-terra .hero-veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(30,22,18,.36), rgba(30,22,18,.62)); }
.t-terra .hero-in { position: relative; z-index: 2; }
.t-terra .hero.has-img h1, .t-terra .hero.has-img .kicker { color: #fff; }
.t-terra .hero.has-img .lead { color: rgba(255,255,255,.9); }
.t-terra .hero h1 { font-size: clamp(38px, 9vw, 76px); }
.t-terra .hero h1 em { font-style: italic; }
.t-terra .hero-actions { margin-top: 34px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
@media (min-width: 640px) { .t-terra .hero-actions { flex-direction: row; justify-content: center; } }

/* ── Números ── */
.t-terra .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center; padding: 44px 0; }
.t-terra .stats b { display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(30px, 6vw, 46px); font-weight: 500; color: var(--lume-secondary); }
.t-terra .stats span { display: block; margin-top: 4px; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--lume-fg-faint); }

/* ── Serviços (linhas com preço) ── */
.t-terra .svc-list { margin-top: 44px; border-top: 1px solid var(--lume-line-strong); }
.t-terra .svc-row { display: grid; gap: 12px; padding: 28px 0; border-bottom: 1px solid var(--lume-line-strong); align-items: center; }
@media (min-width: 768px) { .t-terra .svc-row { grid-template-columns: 1fr auto auto; gap: 28px; } }
.t-terra .svc-row h3 { font-size: 26px; }
.t-terra .svc-row .svc-desc { margin-top: 6px; font-size: 15px; color: var(--lume-fg-soft); max-width: 60ch; }
.t-terra .svc-price { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 27px; color: var(--lume-secondary); white-space: nowrap; }
.t-terra .svc-dur { display: block; font-family: 'Montserrat', sans-serif; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-terra .svc-row .btn { padding: 11px 24px; }

/* ── Sobre / split ── */
.t-terra .split { display: grid; gap: 36px; align-items: center; }
@media (min-width: 900px) { .t-terra .split { grid-template-columns: 1fr 1fr; gap: 64px; } }
.t-terra .split-img { aspect-ratio: 4/5; overflow: hidden; border-radius: var(--lume-r-md); }
.t-terra .split-img img, .t-terra .split-img > div { width: 100%; height: 100%; object-fit: cover; }

/* ── Galeria ── */
.t-terra .grid-img { margin-top: 44px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
@media (min-width: 900px) { .t-terra .grid-img { grid-template-columns: repeat(4, 1fr); gap: 16px; } }
.t-terra .grid-img figure { margin: 0; aspect-ratio: 1/1; overflow: hidden; border-radius: var(--lume-r-sm); position: relative; }
.t-terra .grid-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .6s; }
.t-terra .grid-img figure:hover img { transform: scale(1.07); }
.t-terra .grid-img figcaption { position: absolute; inset: auto 0 0 0; padding: 22px 12px 10px; font-size: 11px; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.6), transparent); }

/* ── Antes e depois ── */
.t-terra .ba { margin-top: 44px; display: grid; gap: 44px; }
.t-terra .ba-item { display: grid; gap: 24px; align-items: center; }
@media (min-width: 900px) { .t-terra .ba-item { grid-template-columns: 1.15fr .85fr; gap: 48px; } .t-terra .ba-item:nth-child(even) > *:first-child { order: 2; } }
.t-terra .ba-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.t-terra .ba-pair > div { position: relative; aspect-ratio: 3/4; overflow: hidden; border-radius: var(--lume-r-sm); }
.t-terra .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-terra .ba-pair span { position: absolute; left: 8px; top: 8px; font-size: 9px; letter-spacing: .2em; text-transform: uppercase; background: var(--lume-primary); color: var(--lume-on-primary); padding: 5px 11px; border-radius: var(--lume-r-sm); }
.t-terra .ba-item h3 { font-size: 27px; }

/* ── Depoimentos ── */
.t-terra .testi-grid { margin-top: 44px; display: grid; gap: 20px; }
@media (min-width: 768px) { .t-terra .testi-grid { grid-template-columns: repeat(3, 1fr); gap: 26px; } }
.t-terra .testi { background: var(--lume-surface); border: 1px solid var(--lume-line); border-radius: var(--lume-r-md); padding: 26px; display: flex; flex-direction: column; }
.t-terra .testi .stars { display: inline-flex; gap: 3px; color: var(--lume-secondary); }
.t-terra .testi .stars svg { height: 15px; width: 15px; }
.t-terra .testi p { margin-top: 14px; flex: 1; font-size: 15px; line-height: 1.8; color: var(--lume-fg-soft); font-style: italic; }
.t-terra .testi-who { margin-top: 18px; display: flex; align-items: center; gap: 12px; }
.t-terra .testi-who img, .t-terra .testi-avatar { height: 42px; width: 42px; border-radius: 999px; object-fit: cover; }
.t-terra .testi-avatar { display: grid; place-items: center; background: var(--lume-secondary-soft); color: var(--lume-primary-text); font-size: 13px; font-weight: 600; }
.t-terra .testi-who b { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; font-weight: 600; color: var(--lume-primary-text); }

/* ── FAQ ── */
.t-terra .faq { margin-top: 40px; }
.t-terra .faq details { border-bottom: 1px solid var(--lume-line-strong); }
.t-terra .faq summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 22px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; color: var(--lume-primary-text); }
.t-terra .faq summary::-webkit-details-marker { display: none; }
.t-terra .faq summary svg { height: 19px; width: 19px; flex-shrink: 0; color: var(--lume-secondary); transition: transform .25s; }
.t-terra .faq details[open] summary svg { transform: rotate(180deg); }
.t-terra .faq .answer { padding-bottom: 22px; font-size: 15px; color: var(--lume-fg-soft); }

/* ── Onde estou ── */
.t-terra .info-cols { margin-top: 40px; display: grid; gap: 26px; }
@media (min-width: 768px) { .t-terra .info-cols { grid-template-columns: repeat(3, 1fr); } }
.t-terra .info-col { text-align: center; padding: 26px 18px; background: var(--lume-surface); border-radius: var(--lume-r-md); }
.t-terra .info-col svg { height: 22px; width: 22px; color: var(--lume-secondary); margin: 0 auto; }
.t-terra .info-col dt { margin-top: 12px; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-terra .info-col dd { margin: 7px 0 0; font-size: 15px; }

/* ── Fecho ── */
.t-terra .cta { background: var(--lume-primary); color: var(--lume-on-primary); text-align: center; padding: clamp(64px, 11vw, 120px) 0; }
.t-terra .cta h2 { color: var(--lume-on-primary); }
.t-terra .cta h2 em { color: var(--lume-secondary); }
.t-terra .cta .kicker { color: var(--lume-on-primary-faint); }
.t-terra .cta .lead { color: var(--lume-on-primary-soft); }
.t-terra .cta .btn { margin-top: 32px; background: var(--lume-on-primary); border-color: var(--lume-on-primary); color: var(--lume-primary-text); }
.t-terra .cta .btn:hover { background: var(--lume-secondary); border-color: var(--lume-secondary); color: var(--lume-on-secondary); }

/* ── Rodapé ── */
.t-terra .foot { padding: 40px 0; border-top: 1px solid var(--lume-line); text-align: center; }
.t-terra .foot-links { margin-top: 18px; display: flex; justify-content: center; gap: 12px; }
.t-terra .foot-links a { height: 42px; width: 42px; border: 1px solid var(--lume-line-strong); border-radius: var(--lume-r-sm); display: grid; place-items: center; color: var(--lume-fg-soft); }
.t-terra .foot-links a:hover { border-color: var(--lume-secondary); color: var(--lume-secondary); }
.t-terra .foot-links svg { height: 18px; width: 18px; }
.t-terra .foot-legal { margin-top: 20px; font-size: 11px; color: var(--lume-fg-faint); }

.t-terra .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 9px; padding: 14px 22px; background: var(--lume-secondary); color: var(--lume-on-secondary); border: 0; font-family: inherit; font-size: 11px; letter-spacing: .12em; text-transform: uppercase; font-weight: 600; cursor: pointer; border-radius: var(--lume-r-sm); box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-terra .fab svg { height: 17px; width: 17px; }
`;

export default function Terracota({ config, services, sections, onBook, preview }: TemplateProps) {
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
      {kicker && <p className="kicker">{kicker}</p>}
      <h2 className="h2">{title}{highlight ? <> <em>{highlight}</em></> : null}</h2>
      {lead && <p className="lead">{lead}</p>}
    </Reveal>
  );

  const section = (id: SiteSectionId) => {
    switch (id) {
      case 'hero':
        return (
          <section id={SECTION_ANCHOR.hero} className={`hero${heroImage ? ' has-img' : ''}`}>
            {heroImage && (
              <>
                <div className="hero-bg"><SiteImage src={heroImage} alt={brandName} priority /></div>
                <div className="hero-veil" aria-hidden="true" />
              </>
            )}
            <div className="wrap hero-in">
              <Reveal>
                {(content.hero.eyebrow || identity.role) && (
                  <p className="kicker">{[identity.role, content.hero.eyebrow].filter(Boolean).join(' · ')}</p>
                )}
                <h1>{content.hero.headline}{content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}</h1>
                {content.hero.subheadline && <p className="lead" style={{ maxWidth: '58ch', marginLeft: 'auto', marginRight: 'auto' }}>{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button type="button" className={`btn${heroImage ? ' btn-onDark' : ''}`} onClick={() => onBook()}>
                    {content.hero.ctaPrimary}
                  </button>
                  {content.hero.ctaSecondary && sections.includes('services') && (
                    <a className={`btn ${heroImage ? 'btn-onDark' : 'btn-outline'}`} href={`#${SECTION_ANCHOR.services}`}>
                      {content.hero.ctaSecondary}
                    </a>
                  )}
                </div>
              </Reveal>
            </div>
          </section>
        );

      case 'stats':
        return (
          <section id={SECTION_ANCHOR.stats} className="sand">
            <Reveal className="wrap">
              <div className="stats">
                {content.stats.items.map(s => <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>)}
              </div>
            </Reveal>
          </section>
        );

      case 'about':
        return (
          <section id={SECTION_ANCHOR.about} className="sec">
            <div className="wrap split">
              <Reveal>
                {content.about.eyebrow && <p className="kicker">{content.about.eyebrow}</p>}
                <h2 className="h2">{content.about.title}{content.about.highlight ? <> <em>{content.about.highlight}</em></> : null}</h2>
                <div className="lead"><Paragraphs text={content.about.text} /></div>
                {content.about.cta && (
                  <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 28 }} onClick={() => onBook()}>
                    {content.about.cta}
                  </button>
                )}
              </Reveal>
              <Reveal delay={110}>
                <div className="split-img">
                  {aboutImage
                    ? <SiteImage src={aboutImage} alt={identity.professionalName || brandName} />
                    : <ImageFallback label="sua foto" />}
                </div>
              </Reveal>
            </div>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec sand">
            <div className="wrap">
              <Head kicker={content.services.eyebrow} title={content.services.title} highlight={content.services.highlight} lead={content.services.subtitle} />
              <div className="svc-list">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 4) * 60}>
                    <div className="svc-row">
                      <div>
                        <h3>{s.name}</h3>
                        {s.description && <p className="svc-desc">{s.description}</p>}
                      </div>
                      <div>
                        {content.services.showPrices && <span className="svc-price">{formatPrice(s.priceCents)}</span>}
                        {content.services.showDuration && <span className="svc-dur">{formatDuration(s.durationMinutes)}</span>}
                      </div>
                      <button type="button" className="btn" onClick={() => onBook(s.id)}>Agendar</button>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec">
            <div className="wrap">
              <Head kicker={content.gallery.eyebrow} title={content.gallery.title} highlight={content.gallery.highlight} />
              <div className="grid-img">
                {content.gallery.items.map((item, i) => (
                  <Reveal as="figure" key={item.id} delay={(i % 4) * 60}>
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
          <section id={SECTION_ANCHOR.beforeAfter} className="sec sand">
            <div className="wrap">
              <Head kicker={content.beforeAfter.eyebrow} title={content.beforeAfter.title} highlight={content.beforeAfter.highlight} />
              <div className="ba">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 80}>
                    <div className="ba-item">
                      <div className="ba-pair">
                        <div><SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} /><span>Antes</span></div>
                        <div><SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} /><span>Depois</span></div>
                      </div>
                      <div>
                        {item.title && <h3>{item.title}</h3>}
                        {item.description && <p className="lead">{item.description}</p>}
                      </div>
                    </div>
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

      case 'faq':
        return (
          <section id={SECTION_ANCHOR.faq} className="sec sand">
            <div className="wrap narrow">
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
          <section id={SECTION_ANCHOR.location} className="sec">
            <div className="wrap">
              <Head kicker={content.location.eyebrow} title={content.location.title} highlight={content.location.highlight} lead={content.location.note} />
              <Reveal>
                <dl className="info-cols">
                  {(identity.address || identity.city) && (
                    <div className="info-col">
                      <IconMapPin /><dt>Endereço</dt>
                      <dd>{maps
                        ? <a href={maps} target="_blank" rel="noopener noreferrer">{[identity.address, identity.city].filter(Boolean).join(' — ')}</a>
                        : [identity.address, identity.city].filter(Boolean).join(' — ')}</dd>
                    </div>
                  )}
                  {content.location.hours && <div className="info-col"><IconClock /><dt>Horário</dt><dd>{content.location.hours}</dd></div>}
                  {wa && (
                    <div className="info-col">
                      <IconWhatsApp /><dt>WhatsApp</dt>
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
          <section id={SECTION_ANCHOR.contact} className="cta">
            <Reveal className="wrap">
              {content.contact.eyebrow && <p className="kicker">{content.contact.eyebrow}</p>}
              <h2 className="h2">{content.contact.title}{content.contact.highlight ? <> <em>{content.contact.highlight}</em></> : null}</h2>
              {content.contact.text && <p className="lead" style={{ maxWidth: '54ch', marginLeft: 'auto', marginRight: 'auto' }}>{content.contact.text}</p>}
              <button type="button" className="btn" onClick={() => onBook()}>{content.contact.cta}</button>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-terra" style={themeToCssVars(config.theme)}>
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
