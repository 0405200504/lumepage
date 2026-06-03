import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/Toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lume Agenda - Sistema de Agendamentos Premium',
  description: 'A plataforma de agendamento ideal para profissionais da estética que buscam excelência e design elegante.',
  keywords: 'agendamento, estética, salão de beleza, clínica, profissional da beleza, lume, agendar',
  icons: {
    icon: '/favicon.ico',
  }
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
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;850;900&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased min-h-screen bg-cream">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
