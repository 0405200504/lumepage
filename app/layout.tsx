import type { Metadata, Viewport } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import PwaRegister from '@/components/PwaRegister';
import { fontVars } from '@/lib/fonts';
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
    // Inter (corpo e interface) + Hanken Grotesk (títulos) — lib/fonts.ts.
    // As variáveis ficam no <html> porque os tokens de fonte vivem no :root.
    <html lang="pt-BR" className={fontVars}>
      <body className="antialiased min-h-screen bg-bg">
        <ToastProvider>
          {children}
        </ToastProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
