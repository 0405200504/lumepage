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
 * checkout sem passar pelo cadastro. Enquanto um link estiver `null`, aquele
 * botão cai no SIGNUP_LINK — a pessoa nunca fica com um botão morto, mas
 * também não chega na Hubla. Preencha para ligar a compra de verdade.
 *
 * Os dois links anuais já existiam no fluxo de upgrade dentro do painel
 * (lib/subscription/entitlements.ts) e foram reaproveitados aqui.
 */
export const CHECKOUT: Record<PlanoId, { mensal: string | null; anual: string | null }> = {
  start: {
    mensal: null, // TODO: link da Hubla — Start mensal
    anual: null, // TODO: link da Hubla — Start anual
  },
  pro: {
    mensal: null, // TODO: link da Hubla — Pro mensal
    anual: "https://pay.hub.la/kp8OZWVfP7tLSWpMx5ok",
  },
  premium: {
    mensal: null, // TODO: link da Hubla — Premium mensal
    anual: "https://pay.hub.la/rqw8NXaLwSvl111uEMRH",
  },
};

/** Link de compra do plano, com o cadastro como rede de segurança. */
export function checkoutLink(plano: PlanoId, anual: boolean): string {
  return CHECKOUT[plano][anual ? "anual" : "mensal"] ?? SIGNUP_LINK;
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
