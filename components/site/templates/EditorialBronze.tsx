'use client';

/**
 * ============================================================================
 * TEMPLATE · Editorial Bronze
 * ============================================================================
 * Origem: repositório `page-5-portfolio` ("Estética Editorial").
 * O que veio de lá: títulos gigantes em Playfair com line-height abaixo de 1,
 * grelha assimétrica, rótulos micro em caixa alta precedidos por um traço,
 * fundo areia alternado e bronze como único acento. É o template mais autoral
 * — pensado para quem quer um site que não pareça com nenhum outro.
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
.t-bronze { background: var(--lume-bg); color: var(--lume-fg); font-family: 'Montserrat', ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.7; font-weight: 300; }
.t-bronze *, .t-bronze *::before, .t-bronze *::after { box-sizing: border-box; }
.t-bronze img { display: block; max-width: 100%; }
.t-bronze a { color: inherit; text-decoration: none; }
.t-bronze h1, .t-bronze h2, .t-bronze h3 { font-family: 'Playfair Display', Georgia, serif; font-weight: 400; margin: 0; }
.t-bronze p { margin: 0; }
.t-bronze section[id] { scroll-margin-top: 72px; }
.t-bronze [data-lume-placeholder] { background: var(--lume-surface-alt); display: grid; place-items: center; color: var(--lume-fg-faint); font-size: 11px; letter-spacing: .2em; text-transform: uppercase; }

.t-bronze .edge { width: 100%; max-width: 1400px; margin: 0 auto; padding: 0 6vw; }
.t-bronze .sec { padding: clamp(70px, 12vw, 150px) 0; }
.t-bronze .sand { background: var(--lume-surface-alt); }

.t-bronze .micro { display: block; font-size: 11px; letter-spacing: .32em; text-transform: uppercase; color: var(--lume-fg-soft); margin-bottom: 26px; font-weight: 400; }
.t-bronze .micro::before { content: ''; display: inline-block; width: 28px; height: 1px; background: var(--lume-primary); vertical-align: middle; margin-right: 14px; }
.t-bronze .giant { font-size: clamp(46px, 9vw, 116px); line-height: .92; letter-spacing: -.02em; }
.t-bronze .giant em { font-style: italic; color: var(--lume-primary-text); }
.t-bronze .big { font-size: clamp(34px, 6vw, 74px); line-height: .98; letter-spacing: -.015em; }
.t-bronze .big em { font-style: italic; color: var(--lume-primary-text); }
.t-bronze .body { margin-top: 22px; font-size: 16px; line-height: 1.9; color: var(--lume-fg-soft); max-width: 52ch; }

.t-bronze .btn { display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 52px; padding: 15px 0; font-size: 11px; letter-spacing: .28em; text-transform: uppercase; background: none; border: 0; border-bottom: 1px solid var(--lume-primary); color: var(--lume-primary-text); cursor: pointer; font-family: inherit; transition: gap .3s, color .3s, border-color .3s; }
.t-bronze .btn::after { content: '→'; font-size: 15px; }
.t-bronze .btn:hover { gap: 20px; }
.t-bronze .btn-solid { border: 1px solid var(--lume-primary); background: var(--lume-primary); color: var(--lume-on-primary); padding: 15px 34px; border-radius: var(--lume-r-sm); }
.t-bronze .btn-solid:hover { background: var(--lume-primary-hover); border-color: var(--lume-primary-hover); }
.t-bronze .btn-light { border-color: rgba(255,255,255,.7); color: #fff; }

/* ── Topo ── */
.t-bronze .nav { position: sticky; top: 0; z-index: 40; background: var(--lume-bg-blur); backdrop-filter: blur(10px); }
.t-bronze .nav-in { display: flex; align-items: center; justify-content: space-between; height: 72px; border-bottom: 1px solid var(--lume-line); }
.t-bronze .brand { font-family: 'Playfair Display', Georgia, serif; font-size: 21px; letter-spacing: .1em; text-transform: uppercase; display: flex; align-items: center; gap: 10px; }
.t-bronze .brand img { height: 34px; width: auto; object-fit: contain; }
.t-bronze .nav-links { display: none; gap: 36px; }
@media (min-width: 1024px) { .t-bronze .nav-links { display: flex; } }
.t-bronze .nav-links a { font-size: 10px; letter-spacing: .26em; text-transform: uppercase; color: var(--lume-fg-soft); }
.t-bronze .nav-links a:hover { color: var(--lume-primary-text); }
.t-bronze .burger { display: grid; place-items: center; height: 44px; width: 44px; background: none; border: 0; color: var(--lume-fg); cursor: pointer; }
@media (min-width: 1024px) { .t-bronze .burger { display: none; } }
.t-bronze .burger svg { height: 24px; width: 24px; }
.t-bronze .drawer-bg { position: fixed; inset: 0; background: rgba(30,28,26,.5); z-index: 60; }
.t-bronze .drawer { position: fixed; inset: 0 0 0 auto; width: 86%; max-width: 340px; background: var(--lume-bg); z-index: 61; padding: 20px 26px 34px; display: flex; flex-direction: column; }
.t-bronze .drawer-top { display: flex; align-items: center; justify-content: space-between; }
.t-bronze .drawer nav { margin-top: 44px; display: flex; flex-direction: column; gap: 2px; }
.t-bronze .drawer nav a { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; padding: 10px 0; }
.t-bronze .drawer .btn { margin-top: auto; align-self: flex-start; }

/* ── Capa assimétrica ── */
.t-bronze .hero { position: relative; padding: clamp(50px, 8vw, 90px) 0 clamp(60px, 10vw, 120px); }
.t-bronze .hero-grid { display: grid; gap: 40px; align-items: end; }
@media (min-width: 1024px) { .t-bronze .hero-grid { grid-template-columns: 1.15fr .85fr; gap: 6vw; } }
.t-bronze .hero-photo { position: relative; aspect-ratio: 3/4; overflow: hidden; }
.t-bronze .hero-photo img, .t-bronze .hero-photo > div { width: 100%; height: 100%; object-fit: cover; }
.t-bronze .hero-actions { margin-top: 34px; display: flex; flex-wrap: wrap; gap: 28px; align-items: center; }
.t-bronze .hero-num { position: absolute; right: 0; bottom: -14px; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(56px, 10vw, 128px); line-height: 1; color: var(--lume-primary); opacity: .16; pointer-events: none; }

/* ── Números ── */
.t-bronze .stats { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--lume-line-strong); }
.t-bronze .stats > div { padding: clamp(30px, 5vw, 56px) 0; }
.t-bronze .stats > div + div { border-left: 1px solid var(--lume-line); padding-left: 6%; }
.t-bronze .stats b { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(34px, 6vw, 66px); font-weight: 400; line-height: 1; }
.t-bronze .stats span { display: block; margin-top: 10px; font-size: 10px; letter-spacing: .26em; text-transform: uppercase; color: var(--lume-fg-faint); }

/* ── Sobre assimétrico ── */
.t-bronze .asym { display: grid; gap: 40px; }
@media (min-width: 1024px) { .t-bronze .asym { grid-template-columns: 5fr 6fr; gap: 6vw; align-items: center; } }
.t-bronze .asym-img { aspect-ratio: 4/5; overflow: hidden; }
.t-bronze .asym-img img, .t-bronze .asym-img > div { width: 100%; height: 100%; object-fit: cover; }
@media (min-width: 1024px) { .t-bronze .asym-offset { margin-top: -8vh; } }

/* ── Serviços numerados ── */
.t-bronze .num-list { margin-top: clamp(40px, 6vw, 80px); border-top: 1px solid var(--lume-line-strong); }
.t-bronze .num-row { display: grid; gap: 10px; padding: clamp(26px, 4vw, 44px) 0; border-bottom: 1px solid var(--lume-line); }
@media (min-width: 900px) { .t-bronze .num-row { grid-template-columns: 72px 1fr auto; gap: 32px; align-items: baseline; } }
.t-bronze .num { font-family: 'Playfair Display', Georgia, serif; font-size: 15px; letter-spacing: .1em; color: var(--lume-primary-text); }
.t-bronze .num-row h3 { font-size: clamp(26px, 3.4vw, 42px); line-height: 1.05; }
.t-bronze .num-row .desc { margin-top: 10px; font-size: 15px; color: var(--lume-fg-soft); max-width: 58ch; }
.t-bronze .num-side { text-align: left; }
@media (min-width: 900px) { .t-bronze .num-side { text-align: right; } }
.t-bronze .num-price { display: block; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(22px, 2.6vw, 32px); }
.t-bronze .num-dur { display: block; margin-top: 4px; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-bronze .num-row .btn { margin-top: 12px; }

/* ── Galeria em faixa ── */
.t-bronze .strip { margin-top: clamp(40px, 6vw, 72px); display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; }
@media (min-width: 900px) { .t-bronze .strip { grid-template-columns: repeat(4, 1fr); gap: 8px; } }
.t-bronze .strip figure { margin: 0; position: relative; aspect-ratio: 4/5; overflow: hidden; }
.t-bronze .strip img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.92); transition: transform .8s cubic-bezier(.16,1,.3,1), filter .6s; }
.t-bronze .strip figure:hover img { transform: scale(1.07); filter: none; }
.t-bronze .strip figcaption { position: absolute; inset: auto 0 0 0; padding: 28px 12px 12px; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #fff; background: linear-gradient(to top, rgba(0,0,0,.65), transparent); }

/* ── Antes e depois ── */
.t-bronze .ba { margin-top: clamp(40px, 6vw, 72px); display: grid; gap: clamp(40px, 6vw, 72px); }
@media (min-width: 900px) { .t-bronze .ba { grid-template-columns: repeat(2, 1fr); } }
.t-bronze .ba-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
.t-bronze .ba-pair > div { position: relative; aspect-ratio: 3/4; overflow: hidden; }
.t-bronze .ba-pair img { width: 100%; height: 100%; object-fit: cover; }
.t-bronze .ba-pair span { position: absolute; left: 0; bottom: 0; font-size: 9px; letter-spacing: .26em; text-transform: uppercase; background: var(--lume-primary); color: var(--lume-on-primary); padding: 6px 12px; }
.t-bronze .ba h3 { margin-top: 22px; font-size: clamp(24px, 3vw, 34px); }

/* ── Depoimentos ── */
.t-bronze .quotes { margin-top: clamp(40px, 6vw, 72px); display: grid; gap: clamp(36px, 5vw, 60px); }
@media (min-width: 900px) { .t-bronze .quotes { grid-template-columns: repeat(2, 1fr); } }
.t-bronze .quote blockquote { margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(20px, 2.6vw, 30px); font-style: italic; line-height: 1.45; }
.t-bronze .quote .stars { display: inline-flex; gap: 3px; color: var(--lume-primary-text); margin-bottom: 16px; }
.t-bronze .quote .stars svg { height: 14px; width: 14px; }
.t-bronze .quote-who { margin-top: 22px; display: flex; align-items: center; gap: 14px; }
.t-bronze .quote-who img, .t-bronze .quote-avatar { height: 44px; width: 44px; border-radius: 999px; object-fit: cover; }
.t-bronze .quote-avatar { display: grid; place-items: center; background: var(--lume-primary-soft); color: var(--lume-primary-text); font-size: 13px; font-weight: 600; }
.t-bronze .quote-who b { font-size: 10px; letter-spacing: .26em; text-transform: uppercase; font-weight: 500; }

/* ── FAQ ── */
.t-bronze .faq { margin-top: clamp(36px, 5vw, 60px); border-top: 1px solid var(--lume-line-strong); }
.t-bronze .faq details { border-bottom: 1px solid var(--lume-line); }
.t-bronze .faq summary { list-style: none; cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: 26px 0; font-family: 'Playfair Display', Georgia, serif; font-size: clamp(19px, 2.2vw, 26px); }
.t-bronze .faq summary::-webkit-details-marker { display: none; }
.t-bronze .faq summary svg { height: 20px; width: 20px; flex-shrink: 0; color: var(--lume-primary-text); transition: transform .3s; }
.t-bronze .faq details[open] summary svg { transform: rotate(180deg); }
.t-bronze .faq .answer { padding-bottom: 26px; font-size: 15px; color: var(--lume-fg-soft); max-width: 68ch; }

/* ── Onde estou ── */
.t-bronze .info-cols { margin-top: clamp(36px, 5vw, 60px); display: grid; gap: 30px; }
@media (min-width: 768px) { .t-bronze .info-cols { grid-template-columns: repeat(3, 1fr); } }
.t-bronze .info-col svg { height: 20px; width: 20px; color: var(--lume-primary-text); }
.t-bronze .info-col dt { margin-top: 14px; font-size: 9px; letter-spacing: .3em; text-transform: uppercase; color: var(--lume-fg-faint); }
.t-bronze .info-col dd { margin: 8px 0 0; font-size: 16px; }

/* ── Fecho ── */
.t-bronze .cta { background: var(--lume-fg); color: #fff; padding: clamp(72px, 12vw, 150px) 0; }
.t-bronze .cta .micro { color: rgba(255,255,255,.72); }
.t-bronze .cta .micro::before { background: var(--lume-secondary); }
.t-bronze .cta .giant em { color: var(--lume-secondary); }
.t-bronze .cta .body { color: rgba(255,255,255,.78); }

/* ── Rodapé ── */
.t-bronze .foot { padding: 48px 0; border-top: 1px solid var(--lume-line); }
.t-bronze .foot-in { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }
@media (min-width: 768px) { .t-bronze .foot-in { flex-direction: row; align-items: center; justify-content: space-between; } }
.t-bronze .foot-links { display: flex; gap: 22px; }
.t-bronze .foot-links a { color: var(--lume-fg-soft); }
.t-bronze .foot-links a:hover { color: var(--lume-primary-text); }
.t-bronze .foot-links svg { height: 19px; width: 19px; }
.t-bronze .foot-legal { margin-top: 24px; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: var(--lume-fg-faint); }

.t-bronze .fab { position: fixed; right: 16px; bottom: 16px; z-index: 45; display: inline-flex; align-items: center; gap: 10px; padding: 15px 24px; background: var(--lume-primary); color: var(--lume-on-primary); border: 0; font-family: inherit; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; cursor: pointer; border-radius: var(--lume-r-sm); box-shadow: 0 14px 34px -12px var(--lume-shadow); }
.t-bronze .fab svg { height: 17px; width: 17px; }
`;

export default function EditorialBronze({ config, services, sections, onBook, preview }: TemplateProps) {
  const [menu, setMenu] = useState(false);
  const { identity, content } = config;
  const nav = buildNav(sections);
  const wa = whatsappHref(config);
  const ig = instagramHref(config);
  const maps = mapsHref(config);
  const brandName = identity.studioName || identity.professionalName || 'Meu estúdio';
  const heroImage = content.hero.imageUrl || identity.photoUrl;
  const aboutImage = content.about.imageUrl || identity.photoUrl;

  const section = (id: SiteSectionId) => {
    switch (id) {
      case 'hero':
        return (
          <section id={SECTION_ANCHOR.hero} className="hero">
            <div className="edge hero-grid">
              <Reveal>
                {(content.hero.eyebrow || identity.role) && (
                  <span className="micro">{[identity.role, content.hero.eyebrow].filter(Boolean).join(' — ')}</span>
                )}
                <h1 className="giant">
                  {content.hero.headline}
                  {content.hero.highlight ? <> <em>{content.hero.highlight}</em></> : null}
                </h1>
                {content.hero.subheadline && <p className="body">{content.hero.subheadline}</p>}
                <div className="hero-actions">
                  <button type="button" className="btn" onClick={() => onBook()}>{content.hero.ctaPrimary}</button>
                  {content.hero.ctaSecondary && sections.includes('gallery') && (
                    <a className="btn" href={`#${SECTION_ANCHOR.gallery}`}>{content.hero.ctaSecondary}</a>
                  )}
                </div>
              </Reveal>
              <Reveal delay={130}>
                <div className="hero-photo">
                  {heroImage
                    ? <SiteImage src={heroImage} alt={identity.professionalName || brandName} priority />
                    : <ImageFallback label="sua foto aqui" />}
                  <span className="hero-num" aria-hidden="true">01</span>
                </div>
              </Reveal>
            </div>
          </section>
        );

      case 'stats':
        return (
          <section id={SECTION_ANCHOR.stats}>
            <Reveal className="edge">
              <div className="stats">
                {content.stats.items.map(s => <div key={s.id}><b>{s.value}</b><span>{s.label}</span></div>)}
              </div>
            </Reveal>
          </section>
        );

      case 'about':
        return (
          <section id={SECTION_ANCHOR.about} className="sec sand">
            <div className="edge asym">
              <Reveal className="asym-offset">
                <div className="asym-img">
                  {aboutImage ? <SiteImage src={aboutImage} alt={identity.professionalName || brandName} /> : <ImageFallback label="sua foto" />}
                </div>
              </Reveal>
              <Reveal delay={110}>
                {content.about.eyebrow && <span className="micro">{content.about.eyebrow}</span>}
                <h2 className="big">{content.about.title}{content.about.highlight ? <> <em>{content.about.highlight}</em></> : null}</h2>
                <div className="body"><Paragraphs text={content.about.text} /></div>
                {content.about.cta && (
                  <button type="button" className="btn" style={{ marginTop: 30 }} onClick={() => onBook()}>{content.about.cta}</button>
                )}
              </Reveal>
            </div>
          </section>
        );

      case 'services':
        return (
          <section id={SECTION_ANCHOR.services} className="sec">
            <div className="edge">
              <Reveal>
                {content.services.eyebrow && <span className="micro">{content.services.eyebrow}</span>}
                <h2 className="big">{content.services.title}{content.services.highlight ? <> <em>{content.services.highlight}</em></> : null}</h2>
                {content.services.subtitle && <p className="body">{content.services.subtitle}</p>}
              </Reveal>
              <div className="num-list">
                {services.map((s, i) => (
                  <Reveal key={s.id} delay={(i % 4) * 60}>
                    <div className="num-row">
                      <span className="num">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{s.name}</h3>
                        {s.description && <p className="desc">{s.description}</p>}
                        <button type="button" className="btn" onClick={() => onBook(s.id)}>Agendar</button>
                      </div>
                      <div className="num-side">
                        {content.services.showPrices && <span className="num-price">{formatPrice(s.priceCents)}</span>}
                        {content.services.showDuration && <span className="num-dur">{formatDuration(s.durationMinutes)}</span>}
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'gallery':
        return (
          <section id={SECTION_ANCHOR.gallery} className="sec sand">
            <div className="edge">
              <Reveal>
                {content.gallery.eyebrow && <span className="micro">{content.gallery.eyebrow}</span>}
                <h2 className="big">{content.gallery.title}{content.gallery.highlight ? <> <em>{content.gallery.highlight}</em></> : null}</h2>
              </Reveal>
            </div>
            <div className="edge strip">
              {content.gallery.items.map((item, i) => (
                <Reveal as="figure" key={item.id} delay={(i % 4) * 60}>
                  <SiteImage src={item.url} alt={item.caption || `Trabalho de ${brandName}`} />
                  {item.caption && <figcaption>{item.caption}</figcaption>}
                </Reveal>
              ))}
            </div>
          </section>
        );

      case 'beforeAfter':
        return (
          <section id={SECTION_ANCHOR.beforeAfter} className="sec">
            <div className="edge">
              <Reveal>
                {content.beforeAfter.eyebrow && <span className="micro">{content.beforeAfter.eyebrow}</span>}
                <h2 className="big">{content.beforeAfter.title}{content.beforeAfter.highlight ? <> <em>{content.beforeAfter.highlight}</em></> : null}</h2>
              </Reveal>
              <div className="ba">
                {content.beforeAfter.items.map((item, i) => (
                  <Reveal key={item.id} delay={(i % 2) * 80}>
                    <div className="ba-pair">
                      <div><SiteImage src={item.beforeUrl} alt={`Antes — ${item.title || brandName}`} /><span>Antes</span></div>
                      <div><SiteImage src={item.afterUrl} alt={`Depois — ${item.title || brandName}`} /><span>Depois</span></div>
                    </div>
                    {item.title && <h3>{item.title}</h3>}
                    {item.description && <p className="body">{item.description}</p>}
                  </Reveal>
                ))}
              </div>
            </div>
          </section>
        );

      case 'testimonials':
        return (
          <section id={SECTION_ANCHOR.testimonials} className="sec sand">
            <div className="edge">
              <Reveal>
                {content.testimonials.eyebrow && <span className="micro">{content.testimonials.eyebrow}</span>}
                <h2 className="big">{content.testimonials.title}{content.testimonials.highlight ? <> <em>{content.testimonials.highlight}</em></> : null}</h2>
              </Reveal>
              <div className="quotes">
                {content.testimonials.items.map((t, i) => (
                  <Reveal key={t.id} delay={(i % 2) * 90}>
                    <div className="quote">
                      <Stars rating={t.rating} className="stars" />
                      <blockquote>&ldquo;{t.text}&rdquo;</blockquote>
                      {t.name && (
                        <div className="quote-who">
                          {t.photoUrl ? <SiteImage src={t.photoUrl} alt={t.name} /> : <span className="quote-avatar">{initials(t.name)}</span>}
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
            <div className="edge">
              <Reveal>
                {content.faq.eyebrow && <span className="micro">{content.faq.eyebrow}</span>}
                <h2 className="big">{content.faq.title}{content.faq.highlight ? <> <em>{content.faq.highlight}</em></> : null}</h2>
              </Reveal>
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
          <section id={SECTION_ANCHOR.location} className="sec sand">
            <div className="edge">
              <Reveal>
                {content.location.eyebrow && <span className="micro">{content.location.eyebrow}</span>}
                <h2 className="big">{content.location.title}{content.location.highlight ? <> <em>{content.location.highlight}</em></> : null}</h2>
                {content.location.note && <p className="body">{content.location.note}</p>}
              </Reveal>
              <Reveal delay={90}>
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
            <Reveal className="edge">
              {content.contact.eyebrow && <span className="micro">{content.contact.eyebrow}</span>}
              <h2 className="giant">{content.contact.title}{content.contact.highlight ? <> <em>{content.contact.highlight}</em></> : null}</h2>
              {content.contact.text && <p className="body">{content.contact.text}</p>}
              <button type="button" className="btn btn-light" style={{ marginTop: 34 }} onClick={() => onBook()}>
                {content.contact.cta}
              </button>
            </Reveal>
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="t-bronze" style={themeToCssVars(config.theme)}>
      <style dangerouslySetInnerHTML={{ __html: CSS + REVEAL_CSS }} />

      <header className="nav">
        <div className="edge">
          <div className="nav-in">
            <a className="brand" href={`#${SECTION_ANCHOR.hero}`}>
              {identity.logoUrl ? <SiteImage src={identity.logoUrl} alt={brandName} priority /> : brandName}
            </a>
            <nav className="nav-links" aria-label="Navegação principal">
              {nav.map(l => <a key={l.href} href={l.href}>{l.label}</a>)}
            </nav>
            <button type="button" className="burger" aria-label="Abrir menu" onClick={() => setMenu(true)}><IconMenu /></button>
          </div>
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
        <div className="edge">
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
