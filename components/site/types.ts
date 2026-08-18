/**
 * ============================================================================
 * LUME · Contrato que TODO template recebe
 * ============================================================================
 * Um template é uma função pura de apresentação: recebe estes dados e desenha.
 * Nenhum template busca dado, conhece banco, conhece sessão ou tem conteúdo de
 * cliente escrito no código. É isso que permite 5.000 profissionais rodarem no
 * mesmo componente.
 */

import type { SiteConfig, SiteSectionId } from '@/types/site';

/**
 * Serviço como a página pública o enxerga — recorte MÍNIMO do `services` da
 * Lume. Repare no que NÃO está aqui: `cost_cents` (custo interno), `is_active`,
 * `client_visible`, ids de tenant. O que o servidor não manda, ninguém acha no
 * HTML da página.
 */
export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  durationMinutes: number;
  imageUrl: string | null;
}

export interface TemplateProps {
  config: SiteConfig;
  /** Vem de `services` da Lume em tempo real: mudou o preço, mudou aqui. */
  services: PublicService[];
  /** Já resolvido: ordem + ligadas + com conteúdo + suportadas pelo template. */
  sections: SiteSectionId[];
  /** Abre o agendamento REAL da Lume (mesmo motor de /agendar/<slug>). */
  onBook: (serviceId?: string) => void;
  /** true dentro do editor: desativa navegação que atrapalharia o preview. */
  preview?: boolean;
}

export type TemplateComponent = (props: TemplateProps) => React.ReactElement;
