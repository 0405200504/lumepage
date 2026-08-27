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
        {/* UMA família em todo o painel: Plus Jakarta Sans.
            Antes eram três (Manrope no corpo, Instrument Sans nos títulos e
            no dinheiro, JetBrains Mono nos dados) e o resultado era uma tela
            em que nome de cliente, horário e valor tinham esqueletos
            tipográficos diferentes — a queixa de "as fontes não combinam".
            Hierarquia agora se faz com peso (400→800), tamanho e cor.
            Os pesos vão até 800 porque o número grande do faturamento é o
            assunto da tela e precisa de um degrau acima do título. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,500&display=swap"
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
