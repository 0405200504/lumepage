/**
 * ============================================================================
 * LUME · Peças compartilhadas pelos templates
 * ============================================================================
 * Formatação, ícones e a tag de imagem. Ficam aqui para que os 6 templates (e
 * os próximos) tenham o mesmo comportamento de performance e acessibilidade
 * sem copiar código.
 */

import React from 'react';
import type { SiteConfig, SiteSectionId } from '@/types/site';

// ============================================================================
// Formatação
// ============================================================================

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: (cents % 100 === 0) ? 0 : 2,
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Texto multi-parágrafo digitado no editor vira <p> — sem interpretar HTML. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  const blocks = (text || '').split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
  if (!blocks.length) return null;
  return (
    <>
      {blocks.map((p, i) => (
        <p key={i} className={className}>
          {p.split('\n').map((line, j, all) => (
            <React.Fragment key={j}>
              {line}
              {j < all.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      ))}
    </>
  );
}

// ============================================================================
// Links externos derivados da identidade
// ============================================================================

export function whatsappHref(config: SiteConfig): string | null {
  const digits = (config.identity.whatsapp || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  const withDdi = digits.startsWith('55') ? digits : `55${digits}`;
  const studio = config.identity.studioName || 'você';
  const msg = encodeURIComponent(`Olá! Vim pela sua página e gostaria de falar com ${studio}.`);
  return `https://wa.me/${withDdi}?text=${msg}`;
}

export function instagramHref(config: SiteConfig): string | null {
  const handle = (config.identity.instagram || '').replace(/^@/, '');
  return handle ? `https://instagram.com/${handle}` : null;
}

export function mapsHref(config: SiteConfig): string | null {
  const q = [config.identity.address, config.identity.city].filter(Boolean).join(', ');
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

// ============================================================================
// Imagem
// ============================================================================

interface SiteImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Só a imagem da capa: carrega imediato e com prioridade. O resto é lazy. */
  priority?: boolean;
  style?: React.CSSProperties;
}

/**
 * `<img>` cru de propósito: as URLs vêm do Storage do Supabase (host variável
 * por projeto), então o otimizador do Next exigiria configuração de domínio a
 * cada deploy. A otimização de verdade acontece no upload — o editor redimensiona
 * e converte para WebP antes de enviar — e aqui garantimos lazy + async decoding.
 */
export function SiteImage({ src, alt, className, priority, style }: SiteImageProps) {
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading={priority ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}

/** Espaço reservado quando a profissional ainda não subiu a foto daquele bloco. */
export function ImageFallback({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={className} aria-hidden="true" data-lume-placeholder>
      <span>{label || ''}</span>
    </div>
  );
}

// ============================================================================
// Ícones (inline, sem dependência externa — a página pública carrega leve)
// ============================================================================

type IconProps = { className?: string };
const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export const IconWhatsApp = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.38-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
    <path d="M12.04 2C6.6 2 2.17 6.43 2.17 11.88c0 1.94.55 3.75 1.5 5.29L2 22l4.96-1.6a9.83 9.83 0 0 0 5.08 1.4h.01c5.44 0 9.87-4.43 9.87-9.88C21.92 6.43 17.49 2 12.04 2zm0 17.83h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.1 1 1.02-3.02-.2-.31a8.16 8.16 0 0 1-1.25-4.36c0-4.52 3.68-8.2 8.21-8.2 2.19 0 4.25.86 5.8 2.41a8.15 8.15 0 0 1 2.4 5.8c0 4.52-3.68 8.2-8.2 8.2z" />
  </svg>
);

export const IconInstagram = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="3.6" />
    <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconMapPin = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconClock = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const IconPhone = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export const IconMail = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export const IconMenu = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const IconClose = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const IconChevron = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const IconArrow = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconSparkle = ({ className }: IconProps) => (
  <svg className={className} {...base}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.3l-1.8-5.7L4.5 10.8 10.2 9 12 3.5z" />
  </svg>
);

/** Estrelas de avaliação. `rating` 0 esconde o bloco inteiro. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  if (!rating || rating < 1) return null;
  const n = Math.max(1, Math.min(5, Math.round(rating)));
  return (
    <span className={className} role="img" aria-label={`${n} de 5 estrelas`}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="m12 2.6 2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95L12 2.6z" />
        </svg>
      ))}
    </span>
  );
}

/** Iniciais para o avatar do depoimento quando não há foto. */
export function initials(name: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

// ============================================================================
// Navegação interna
// ============================================================================


/** Âncora (#id) de cada seção — usada pelo menu do topo de todos os templates. */
export const SECTION_ANCHOR: Record<SiteSectionId, string> = {
  hero: 'topo',
  stats: 'numeros',
  about: 'sobre',
  services: 'servicos',
  gallery: 'trabalhos',
  beforeAfter: 'resultados',
  testimonials: 'depoimentos',
  faq: 'duvidas',
  location: 'onde-estou',
  contact: 'agendar',
};

/** Rótulo curto no menu. Seções sem rótulo não entram na navegação. */
const NAV_LABEL: Partial<Record<SiteSectionId, string>> = {
  services: 'Serviços',
  gallery: 'Trabalhos',
  beforeAfter: 'Resultados',
  about: 'Sobre',
  testimonials: 'Depoimentos',
  faq: 'Dúvidas',
  location: 'Onde estou',
  contact: 'Contato',
};

export interface NavLink { href: string; label: string }

/** Menu montado a partir das seções que realmente existem naquela página. */
export function buildNav(sections: SiteSectionId[]): NavLink[] {
  return sections
    .filter(id => !!NAV_LABEL[id])
    .map(id => ({ href: `#${SECTION_ANCHOR[id]}`, label: NAV_LABEL[id]! }))
    .slice(0, 6);
}
