/**
 * Configuração central da página de vendas (LP oficial).
 * Troque os links aqui — todos os CTAs usam estes valores.
 */

/**
 * Destino de TODO CTA de teste ("Testar 7 dias grátis").
 * O cadastro é self-service: a pessoa cria a conta e cai no painel.
 */
export const SIGNUP_LINK = "/register";

/** Alias histórico — os componentes usam este nome. */
export const CTA_LINK = SIGNUP_LINK;

/** Microcopy padrão abaixo de todo botão de teste. */
export const CTA_MICROCOPY = "7 dias grátis · Sem cartão · Sem fidelidade";

/** Texto da faixa fixa no topo da página. */
export const TRIAL_BANNER = "7 dias grátis · sem cartão";

export type PlanoId = "start" | "pro" | "premium";

/**
 * Checkout da Hubla por plano e periodicidade.
 *
 * A seção de planos NÃO é teste grátis: é compra direta, e o botão manda pro
 * checkout sem passar pelo cadastro.
 *
 * Os mesmos links do fluxo de upgrade dentro do painel — anuais em
 * lib/subscription/entitlements.ts, os seis em components/subscription/PlanosOverlay.tsx.
 */
export const CHECKOUT: Record<PlanoId, { mensal: string; anual: string }> = {
  start: {
    mensal: "https://pay.hub.la/W0OcCJoqELUskNPEhbdL",
    anual: "https://pay.hub.la/AgzZbpcOki2gtS9voVrq",
  },
  pro: {
    mensal: "https://pay.hub.la/Ijgtp0VTZ3QXmyCvAPKe",
    anual: "https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok",
  },
  premium: {
    mensal: "https://pay.hub.la/G1EIrESSFgnth0kXxCPC",
    anual: "https://pay.hub.la/rqw8NXaLwSvl111uEMRH",
  },
};

/** Link de compra do plano. */
export function checkoutLink(plano: PlanoId, anual: boolean): string {
  return CHECKOUT[plano][anual ? "anual" : "mensal"];
}

// Contato — o WhatsApp deixou de ser CTA de conversão e ficou só no rodapé.
const WHATSAPP_MESSAGE = "Oii! Tenho uma dúvida sobre a Lume.";
export const WHATSAPP_NUMBER = "5515997507988";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

export const SITE = {
  brand: "Lume",
  tagline: "sua agenda vendendo sozinha, direto da bio",
  instagram: "https://instagram.com/",
  whatsapp: WHATSAPP_LINK,
  /** Páginas legais do próprio app (exigidas na verificação do Google). */
  privacy: "/privacidade",
  terms: "/termos",
  /** Entrada de quem já é cliente. */
  login: "/login",
  signup: SIGNUP_LINK,
};
