import type { NextConfig } from "next";

// build: 2026-06-17b
const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    // Cache de navegação do cliente: ao reabrir uma aba já visitada, o Next
    // reusa o conteúdo em memória em vez de buscar tudo de novo no servidor.
    // Resultado: trocar entre Agenda/Tarefas/etc. fica instantâneo na revisita.
    // (As telas atualizam o próprio estado após edições, então não há risco de
    //  mostrar dado velho depois de uma ação.)
    staleTimes: {
      dynamic: 180, // segundos que páginas dinâmicas ficam no cache do cliente
      static: 300,
    },
  },
  // "x-powered-by: Next.js" só ajuda quem está mapeando o alvo.
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Cabeçalhos de segurança em TODA resposta. A Vercel não manda HSTS
        // sozinha no domínio próprio.
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Nenhuma tela do app abre dentro de iframe de terceiros (clickjacking
        // do login/painel). A exceção é /agendar, logo abaixo, que é um widget.
        source: "/((?!agendar|embed\\.js).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
      {
        // Permite incorporar a página de agendamento (iframe/widget) em QUALQUER site
        source: "/agendar/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
      {
        // Script de embed acessível de qualquer domínio
        source: "/embed.js",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=300" },
        ],
      },
    ];
  },
};

export default nextConfig;
