/**
 * Configuração central da página de vendas (LP oficial).
 * Troque o número e os links aqui — todos os CTAs usam estes valores.
 */

// Mensagem pré-preenchida do WhatsApp
const WHATSAPP_MESSAGE =
  "Oii! Quero testar o Lume 7 dias grátis e colocar minha página no ar.";

export const WHATSAPP_NUMBER = "5515997507988";

export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  WHATSAPP_MESSAGE
)}`;

/**
 * Destino único de todos os CTAs de conversão da página.
 * Hoje aponta para o WhatsApp. Quando o cadastro self-service estiver pronto,
 * troque só esta linha (ex.: "/acesso") e a página inteira passa a apontar pra lá.
 */
export const CTA_LINK = WHATSAPP_LINK;

/** Microcopy padrão abaixo de todo botão de conversão. */
export const CTA_MICROCOPY = "7 dias grátis · Sem cartão · Sem fidelidade";

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
};
