import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import PwaRegister from '@/components/PwaRegister';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lume — Agenda & CRM para Estética',
  description: 'Agenda, agendamentos e controle financeiro 360 para profissionais da estética. Elegante, simples e no celular.',
  keywords: 'agendamento, estética, salão de beleza, clínica, CRM, financeiro, lume, agendar',
  applicationName: 'Lume',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lume',
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  verification: {
    google: 'JfFJ7P7yrmYhivbsXtX6CZVnXApR6pOpBcyAtdxYIXw',
  },
};

export const viewport: Viewport = {
  themeColor: '#6B1525', // = --wine-700 (marca)
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Manrope = corpo/UI. Instrument Sans = títulos e DINHEIRO (dígito de
            largura fixa e desenho mais firme no valor grande do faturamento).
            JetBrains Mono = DADO: horário, duração, data, ID, delta, cabeçalho
            de tabela, rótulo de eixo e o micro-label de contexto do header.
            Só 400/500 da mono — mono em negrito perde o desenho técnico. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Instrument+Sans:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen bg-bg">
        <ToastProvider>
          {children}
        </ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
