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
};

export const viewport: Viewport = {
  themeColor: '#500b18',
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
        <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-cream">
        <ToastProvider>
          {children}
        </ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
