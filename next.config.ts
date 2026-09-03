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
  async headers() {
    return [
      {
        // Permite incorporar a página de agendamento (iframe/widget) em QUALQUER site
        source: "/agendar/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors *;" },
        ],
      },
      {
        // Filme de abertura do app no celular. O nome carrega a versão
        // (…-v1.mp4), então o arquivo é imutável: cachear para sempre é o que
        // faz a abertura ser instantânea da segunda vez em diante. Trocou a
        // animação? Suba -v2 e mude a referência em components/ui/AppSplash.
        source: "/splash-mobile-v1.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
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
