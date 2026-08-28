'use client';

/**
 * ============================================================================
 * TEMPLATE · Gold Premium
 * ============================================================================
 * Origem: repositório `page-2-portf-lio` (lash lifting / brow lamination).
 * O que veio de lá: marfim + dourado + carvão, serifa leve em corpo grande,
 * capa de sangria com véu escuro, rótulos numerados, muito respiro entre
 * seções e a lista de preços com fio pontilhado.
 * O que NÃO veio: imagens, textos e o CSS de 1.300 linhas com conteúdo fixo.
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
.t-gold { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.75; }
.t-gold *, .t-gold *::before, .t-gold *::after { box-sizing: border-box; }
.t-gold img { display: block; max-width: 100%; }
.t-gold a { color: inherit; text-decoration: none; }
.t-gold h1, .t-gold h2, .t-gold h3 { font-family: 'Cormorant Garamond', Georgia, serif; font-weight: 300; line-height: 1.15; margin: 0; letter-spacing: .01em; }
.t-gold p { margin: 0; }
.t-gold section[id] { scroll-margin-top: 76px; }
.t-gold [data-lume-placeholder] { background: var(--lume-surface-alt); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }

.t-gold .wrap { width: 90%; max-width: 1200px; margin: 0 auto; }
.t-gold .narrow { width: 90%; max-width: 800px; margin: 0 auto; }
.t-gold .sec { padding: clamp(64px, 10vw, 128px) 0; }
.t-gold .band { background: var(--lume-surface); }
.t-gold .center { text-align: center; }

.t-gold .kicker { font-size: 10px; letter-spacing: .38em; text-transform: uppercase; color: var(--lume-primary-text); margin: 0 0 22px; font-weight: 500; }
.t-gold .h2 { font-size: clamp(34px, 6vw, 60px); }
.t-gold .h2 em { font-style: italic; color: var(--lume-primary-text); }
.t-gold .lead { margin-top: 20px; font-size: 17px; line-height: 1.85; color: var(--lume-fg-soft); font-weight: 300; }
.t-gold .rule { width: 44px; height: 1px; background: var(--lume-primary); margin: 26px 0; }
.t-gold .center .rule { margin-left: auto; margin-right: auto; }

.t-gold .btn { display: inline-flex; align-items: center; justify-content: center; gap: 10px; min-height: 50px; padding: 14px 34px; font-size: 11px; letter-spacing: .22em; text-transform: uppercase; font-weight: 500; border: 1px solid var(--lume-primary); background: var(--lume-primary); color: var(--lume-on-primary); cursor: pointer; border-radius: var(--lume-r-sm); font-family: inherit; transition: background .25s, color .25s, border-color .25s; }
.t-gold .btn:hover { background: var(--lume-primary-hover); border-color: var(--lume-primary-hover); }
.t-gold .btn-outline { background: transparent; color: var(--lume-primary-text); }
.t-gold .btn-outline:hover { background: var(--lume-primary); color: var(--lume-on-primary); }
.t-gold .btn-onDark { background: transparent; border-color: rgba(255,255,255,.5); color: #fff; }
.t-gold .btn-onDark:hover { background: #fff; border-color: #fff; color: var(--lume-fg); }
.t-gold .btn-block { width: 100%; }
@media (min-width: 640px) { .t-gold .btn-block { width: auto; } }

/* ── Topo ── */
.t-gold .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg); border-bottom: 1px solid var(--lume-line); }
.t-gold .nav-in { display: flex; align-items: center; justify-content: space-between; height: 68px; }
.t-gold .brand { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; letter-spacing: .16em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
.t-gold .brand img { height: 34px; width: auto; object-fit: contain; }
.t-gold .nav-links { display: none; gap: 34px; }
@media (min-width: 1024px) { .t-gold .nav-links { display: flex; } }
.t-gold .nav-links a { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: var(--lume-fg-soft); }
.t-gold .nav-links a:hover { color: var(--lume-primary-text); }
.t-gold .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-fg); cursor: pointer; }
@media (min-width: 1024px) { .t-gold .burger { display: none; } }
.t-gold .burger svg { height: 24px; width: 24px; }
.t-gold .drawer-bg { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 60; }
.t-gold .drawer { position: fixed; inset: 0 0 0 auto; width: 84%; max-width: 330px; background: var(--lume-bg); z-index: 61; padding: 20px 26px 34px; display: flex; flex-direction: column; }
.t-gold .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-gold .drawer nav { margin-top: 40px; display: flex; flex-direction: column; gap: 4px; }
.t-gold .drawer nav a { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 24px; padding: 12px 0; border-bottom: 1px solid var(--lume-line); }
.t-gold .drawer .btn { margin-top: auto; }

/* ── Capa ── */
.t-gold .hero { position: relative; min-height: 88vh; display: grid; place-items: center; text-align: center; overflow: hidden; padding: 90px 0; }
.t-gold .hero-bg { position: absolute; inset: 0; }
.t-gold .hero-bg img, .t-gold .hero-bg > div { width: 100%; height: 100%; object-fit: cover; }
.t-gold .hero-veil { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,.55)); }
.t-gold .hero-in { position: relative; z-index: 2; }
.t-gold .hero.has-img, .t-gold .hero.has-img .kicker, .t-gold .hero.has-img .lead { color: #fff; }
.t-gold .hero.has-img .kicker { color: rgba(255,255,255,.85); }
.t-gold .hero.has-img .lead { color: rgba(255,255,255,.88); }
.t-gold .hero h1 { font-size: clamp(40px, 10vw, 82px); font-weight: 300; }
.t-gold .hero h1 em { font-style: italic; }
.t-gold .hero .lead { max-width: 56ch; margin-left: auto; margin-right: auto; }
.t-gold .hero-actions { margin-top: 38px; display: flex; flex-direction: column; gap: 12px; align-items: center; }
@media (min-width: 640px) { .t-gold .hero-actions { flex-direction: row; justify-content: center; } }

/* ── Números ── */
.t-gold .stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--lume-line); border-bottom: 1px solid var(--lume-line); }
.t-gold .stats > div { padding: 34px 12px; text-align: center; }
.t-gold .stats > div + div { border-left: 1px solid var(--lume-line); }
.t-gold .stats b { display: block; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(30px, 6vw, 48px); font-weight: 300; color: var(--lume-primary-text); }
.t-gold .stats span { display: block; margin-top: 6px; font-size: 9px; letter-spacing: .28em; text-transform: uppercase; color: var(--lume-fg-faint); }

/* ── Serviços (lista de preços com fio pontilhado) ── */
.t-gold .price-list { margin-top: 48px; }
.t-gold .price-row { display: grid; gap: 6px; padding: 26px 0; border-bottom: 1px solid var(--lume-line); }
@media (min-width: 768px) { .t-gold .price-row { grid-template-columns: 1fr auto auto; align-items: baseline; gap: 20px; } }
.t-gold .price-name { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; position: relative; }
@media (min-width: 768px) { .t-gold .price-name::after { content: ''; position: absolute; left: 0; right: 0; bottom: 7px; border-bottom: 1px dotted var(--lume-line-strong); z-index: 0; } .t-gold .price-name span { position: relative; z-index: 1; background: var(--lume-bg); padding-right: 12px; } }
.t-gold .band .price-name span { background: var(--lume-surface); }
.t-gold .price-desc { grid-column: 1 / -1; font-size: 15px; color: var(--lume-fg-soft); font-weight: 300; max-width: 62ch; }
.t-gold .price-val { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 26px; color: var(--lume-primary-text); white-space: nowrap; }
.t-gold .price-dur { font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--lume-fg-faint); white-space: nowrap; }
.t-gold .price-row .btn { margin-top: 8px; min-height: 42px; padding: 10px 22px; }
@media (min-width: 768px) { .t-gold .price-row .btn { margin-top: 0; grid-column: 1 / -1; justify-self: start; } }

/* ── Galeria ── */
.t-gold .grid-img { margin-top: 48px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
@media (min-width: 768px) { .t-gold .grid-img { grid-template-columns: repeat(3, 1fr); gap: 14px; } }
.t-gold .grid-img figure { margin: 0; position: relative; aspect-ratio: 3/4; overflow: hidden; }
.t-gold .grid-img img { width: 100%; height: 100%; object-fit: cover; transition: transform .7s cubic-bezier(.4,0,.2,1); }
.t-gold .grid-img figure:hover img { transform: scale(1.06); }
.t-gold .grid-img figcaption { position: absolute; inset: auto 0 0 0; padding: 26px 14px 12px; font-size: 11px; letter-spacing: .1em; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.62), transparent); }

/* ── Antes e depois ── */
.t-gold .ba { margin-top: 48px; display: grid; gap: 40px; }
@media (min-width: 900px) { .t-gold .ba { grid-template-columns: repeat(2, 1fr); gap: 48px; } }
.t-gold .ba-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.t-gold .ba-pair > div { position: relative; aspect-ratio: 3/4; overflow: hidden; }
.t-gold .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-gold .ba-pair span { position: absolute; left: 0; top: 0; font-size: 9px; letter-spacing: .24em; text-transform: uppercase; background: var(--lume-primary); color: var(--lume-on-primary); padding: 6px 12px; }
.t-gold .ba h3 { margin-top: 20px; font-size: 24px; }
.t-gold .ba p { margin-top: 6px; font-size: 15px; color: var(--lume-fg-soft); font-weight: 300; }

/* ── Depoimentos ── */
.t-gold .quotes { margin-top: 52px; display: grid; gap: 40px; }
@media (min-width: 900px) { .t-gold .quotes { grid-template-columns: repeat(2, 1fr); gap: 52px; } }
.t-gold .quote { text-align: center; padding: 0 8px; }
.t-gold .quote .stars { display: inline-flex; gap: 3px; color: var(--lume-primary-text); }
.t-gold .quote .stars svg { height: 14px; width: 14px; }
.t-gold .quote blockquote { margin: 18px 0 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(19px, 2.4vw, 24px); font-style: italic; font-weight: 300; line-height: 1.6; }
.t-gold .quote-who { margin-top: 20px; display: inline-flex; align-items: center; gap: 12px; }
.t-gold .quote-who img, .t-gold .quote-avatar { height: 42px; width: 42px; border-radius: 999px; object-fit: cover; }
.t-gold .quote-avatar { display: grid; place-items: center; background: var(--lume-primary-soft); color: var(--lume-primary-text); font-size: 13px; font-weight: 600; }
.t-gold .quote-who b { font-size: 10px; letter-spacing: .24em; text-transform: uppercase; font-weight: 500; }

/* ── Sobre ── */
.t-gold .split { display: grid; gap: 40px; align-items: center; }
@media (min-width: 900px) { .t-gold .split { grid-template-columns: 1fr 1fr; gap: 72px; } }
.t-gold .split-img { aspect-ratio: 4/5; overflow: hidden; }
.t-gold .split-img img, .t-gold .split-img > div { width: 100%; height: 100%; object-fit: cover; }

/* ── FAQ ── */
.t-gold .faq { margin-top: 44px; }
.t-gold .faq details { border-bottom: 1px solid var(--lume-line); }
.t-gold .faq summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 24px 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: 21px; }
.t-gold .faq summary::-webkit-details-marker { display: none; }
.t-gold .faq summary svg { height: 18px; width: 18px; flex-shrink: 0; color: var(--lume-primary-text); transition: transform .25s; }
.t-gold .faq details[open] summary svg { transform: rotate(180deg); }
.t-gold .faq .answer { padding-bottom: 24px; font-size: 15px; font-weight: 300; color: var(--lume-fg-soft); }

/* ── Onde estou ── */
.t-gold .info-cols { margin-top: 48px; display: grid; gap: 30px; }
@media (min-width: 768px) { .t-gold .info-cols { grid-template-columns: repeat(3, 1fr); } }
.t-gold .info-col { text-align: center; }
.t-gold .info-col svg { height: 22px; width: 22px; color: var(--lume-primary-text); margin: 0 auto; }
.t-gold .info-col dt { margin-top: 14px; font-size: 9px; letter-spacing: .28em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-gold .info-col dd { margin: 8px 0 0; font-size: 15px; font-weight: 300; }

/* ── Contato final ── */
.t-gold .cta { position: relative; padding: clamp(72px, 12vw, 140px) 0; text-align: center; background: var(--lume-fg); color: #fff; overflow: hidden; }
.t-gold .cta .kicker { color: var(--lume-secondary); }
.t-gold .cta h2 { color: #fff; }
.t-gold .cta h2 em { color: var(--lume-secondary); }
.t-gold .cta .lead { color: rgba(255,255,255,.8); max-width: 52ch; margin-left: auto; margin-right: auto; }
.t-gold .cta .btn { margin-top: 36px; background: #fff; border-color: #fff; color: var(--lume-fg); }
.t-gold .cta .btn:hover { background: var(--lume-secondary); border-color: var(--lume-secondary); color: var(--lume-on-secondary); }

/* ── Rodapé ── */
.t-gold .foot { padding: 44px 0; border-top: 1px solid var(--lume-line); text-align: center; }
.t-gold .foot .brand { justify-content: center; }
.t-gold .foot-links { margin-top: 20px; display: flex; justify-content: center; gap: 14px; }
.t-gold .foot-links a { height: 42px; width: 42px; border: 1px solid var(--lume-line-strong); display: grid; place-items: center; color: var(--lume-fg-soft); }
.t-gold .foot-links a:hover { border-color: var(--lume-primary); color: var(--lume-primary-text); }
.t-gold .foot-links svg { height: 18px; width: 18px; }
.t-gold .foot-legal { margin-top: 22px; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; color: var(--lume-fg-faint); }

.t-gold .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 9px; padding: 14px 22px; background: var(--lume-primary); color: var(--lume-on-primary); border: 0; font-family: inherit; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; font-weight: 600; cursor: pointer; border-radius: var(--lume-r-sm); box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-gold .fab svg { height: 17px; width: 17px; }
`;

export default function GoldPremium({ config, services, sections, onBook, preview }: TemplateProps) {
  const [menu, setMenu] = useState(false);
  const { identity, content } = config;
  const nav = buildNav(sections);
  const wa = whatsappHref(config);
  const ig = instagramHref(config);
  const maps = mapsHref(config);
  const brandName = identity.studioName || identity.professionalName || 'Meu estúdio';
  const heroImage = content.hero.imageUrl || identity.photoUrl;
  const aboutImage = content.about.imageUrl || identity.photoUrl;

  const Head = ({ kicker, title, highlight, lead, center = true }: {
    kicker: string; title: string; highlight: string; lead?: string; center?: boolean;
  }) => (
    <Reveal className={center ? 'center' : undefined}>
      {kicker && <p className="kicker">{kicker}</p>}
      <h2 className="h2">{title}{highlight ? <> <em>{highlight}</em></> : null}</h2>
      <div className="rule" />
      {lead && <p className="lead" style={center ? { marginLeft: 'auto', marginRight: 'auto', maxWidth: '56ch' } : undefined}>{lead}</p>}
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
                <h1>
                  {content.hero.headline}
                  {content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}
                </h1>
                {content.hero.subheadline && <p className="lead">{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button
                    type="button"
                    className={`btn${heroImage ? ' btn-onDark' : ''}`}
                    onClick={() => onBook()}
                  >
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
          <section id={SECTION_ANCHOR.stats}>
            <Reveal className="wrap">
              <div className="stats">
                {content.stats.items.map(s => (
                  <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>
                ))}
              </div>
            </Reveal>
          </section>
        );

      case 'about':
        return (
          <section id={SECTION_ANCHOR.about} className="sec band">
            <div className="wrap split">
              <Reveal>
                <div className="split-img">
                  {aboutImage
                    ? <SiteImage src={aboutImage} alt={identity.professionalName || brandName} />
                    : <ImageFallback label="sua foto" />}
                </div>
              </Reveal>
              <Reveal delay={110}>
                {content.about.eyebrow && <p className="kicker">{content.about.eyebrow}</p>}
                <h2 className="h2">{content.about.title}{content.about.highlight ? <> <em>{content.about.highlight}</em></> : null}</h2>
                <div className="rule" />
                <div className="lead"><Paragraphs text={content.about.text} /></div>
                {content.about.cta && (
                  <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 30 }} onClick={() => onBook()}>
                    {content.about.cta}
                  </button>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec">
            <div className="wrap">
              <Head
                kicker={content.services.eyebrow}
                title={content.services.title}
                highlight={content.services.highlight}
                lead={content.services.subtitle}
              />
              <div className="price-list">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 4) * 60}>
                    <div className="price-row">
                      <h3 className="price-name"><span>{s.name}</span></h3>
                      {content.services.showPrices && <span className="price-val">{formatPrice(s.priceCents)}</span>}
                      {content.services.showDuration && <span className="price-dur">{formatDuration(s.durationMinutes)}</span>}
                      {s.description && <p className="price-desc">{s.description}</p>}
                      <button type="button" className="btn btn-outline" onClick={() => onBook(s.id)}>Agendar</button>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec band">
            <div className="wrap">
              <Head kicker={content.gallery.eyebrow} title={content.gallery.title} highlight={content.gallery.highlight} />
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
              <Head kicker={content.beforeAfter.eyebrow} title={content.beforeAfter.title} highlight={content.beforeAfter.highlight} />
              <div className="ba">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 90}>
                    <div className="ba-pair">
                      <div><SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} /><span>Antes</span></div>
                      <div><SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} /><span>Depois</span></div>
                    </div>
                    {item.title && <h3>{item.title}</h3>}
                    {item.description && <p>{item.description}</p>}
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section id={SECTION_ANCHOR.testimonials} className="sec band">
            <div className="wrap">
              <Head kicker={content.testimonials.eyebrow} title={content.testimonials.title} highlight={content.testimonials.highlight} />
              <div className="quotes">
                {content.testimonials.items.map((t, i) => (
                  <Reveal key={t.id} delay={(i % 2) * 90}>
                    <div className="quote">
                      <Stars rating={t.rating} className="stars" />
                      <blockquote>&ldquo;{t.text}&rdquo;</blockquote>
                      {t.name && (
                        <div className="quote-who">
                          {t.photoUrl
                            ? <SiteImage src={t.photoUrl} alt={t.name} />
                            : <span className="quote-avatar">{initials(t.name)}</span>}
                          <b>{t.name}</b>
                        </div>
                      )}
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'faq':
        return (
          <section id={SECTION_ANCHOR.faq} className="sec">
            <div className="narrow">
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
          <section id={SECTION_ANCHOR.location} className="sec band">
            <div className="wrap">
              <Head
                kicker={content.location.eyebrow}
                title={content.location.title}
                highlight={content.location.highlight}
                lead={content.location.note}
              />
              <Reveal>
                <dl className="info-cols">
                  {(identity.address || identity.city) && (
                    <div className="info-col">
                      <IconMapPin />
                      <dt>Endereço</dt>
                      <dd>{maps
                        ? <a href={maps} target="_blank" rel="noopener noreferrer">{[identity.address, identity.city].filter(Boolean).join(' — ')}</a>
                        : [identity.address, identity.city].filter(Boolean).join(' — ')}</dd>
                    </div>
                  )}
                  {content.location.hours && (
                    <div className="info-col"><IconClock /><dt>Horário</dt><dd>{content.location.hours}</dd></div>
                  )}
                  {wa && (
                    <div className="info-col">
                      <IconWhatsApp />
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
          <section id={SECTION_ANCHOR.contact} className="cta">
            <Reveal className="wrap">
              {content.contact.eyebrow && <p className="kicker">{content.contact.eyebrow}</p>}
              <h2 className="h2">{content.contact.title}{content.contact.highlight ? <> <em>{content.contact.highlight}</em></> : null}</h2>
              {content.contact.text && <p className="lead">{content.contact.text}</p>}
              <button type="button" className="btn" onClick={() => onBook()}>{content.contact.cta}</button>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-gold" style={themeToCssVars(config.theme)}>
      <style dangerouslySetInnerHTML={{ __html: CSS + REVEAL_CSS }} />

      <header className="nav">
        <div className="wrap nav-in">
          <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>
            {identity.logoUrl ? <SiteImage src={identity.logoUrl} alt={brandName} priority /> : brandName}
          </a>
          <nav className="nav-links" aria-label="Navegação principal">
            {nav.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
          </nav>
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
          <div className="brand" style={{ justifyContent: 'center', display: 'flex' }}>{brandName}</div>
          <div className="foot-links">
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><IconInstagram /></a>}
            {wa && <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><IconWhatsApp /></a>}
            {maps && <a href={maps} target="_blank" rel="noopener noreferrer" aria-label="Como chegar"><IconMapPin /></a>}
          </div>
          <p className="foot-legal">
            {content.footer.note || `© ${new Date().getFullYear()} ${brandName}`}
          </p>
        </div>
      </footer>

      {!preview && (
        <button type="button" className="fab" onClick={() => onBook()}><IconWhatsApp /> Agendar</button>
      )}
    </div>
  );
}
