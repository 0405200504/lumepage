import type { Metadata, Viewport } from 'next';
import { redirect } from 'next/navigation';
import dynamic from 'next/dynamic';
import Script from 'next/script';
import { authService } from '@/lib/auth/auth';
import { lpFontVars } from '@/lib/lp/fonts';

import TopBanner from '@/components/lp/TopBanner';
import Navbar from '@/components/lp/Navbar';
import Hero from '@/components/lp/Hero';
import StickyCTA from '@/components/lp/StickyCTA';
import Footer from '@/components/lp/Footer';

// Seções abaixo da dobra entram em chunks separados — o que importa pro
// First Contentful Paint é o Hero.
const MarqueeStrip = dynamic(() => import('@/components/lp/MarqueeStrip'));
const PainSection = dynamic(() => import('@/components/lp/PainSection'));
const CostSection = dynamic(() => import('@/components/lp/CostSection'));
const TurningPoint = dynamic(() => import('@/components/lp/TurningPoint'));
const HowItWorks = dynamic(() => import('@/components/lp/HowItWorks'));
const ClientJourney = dynamic(() => import('@/components/lp/ClientJourney'));
const DashboardSection = dynamic(() => import('@/components/lp/DashboardSection'));
const Comparison = dynamic(() => import('@/components/lp/Comparison'));
const Testimonials = dynamic(() => import('@/components/lp/Testimonials'));
const ForWho = dynamic(() => import('@/components/lp/ForWho'));
const Pricing = dynamic(() => import('@/components/lp/Pricing'));
const Guarantee = dynamic(() => import('@/components/lp/Guarantee'));
const FAQ = dynamic(() => import('@/components/lp/FAQ'));
const FinalCTA = dynamic(() => import('@/components/lp/FinalCTA'));

export const metadata: Metadata = {
  title: 'Lume — Sua cliente não quer conversar. Ela quer agendar.',
  description:
    'A Lume transforma o link da sua bio numa página com seus serviços, preços e horários — e deixa a cliente agendar sozinha, sem passar pelo seu direct. 7 dias grátis, sem cartão.',
  keywords: [
    'agendamento online estética',
    'link da bio com agendamento',
    'agenda para lash designer',
    'sistema para manicure',
    'software para esteticista',
    'agendamento pelo Instagram',
    'lembrete de agendamento WhatsApp',
  ],
  openGraph: {
    title: 'Lume — Sua cliente não quer conversar. Ela quer agendar.',
    description:
      'Sua vitrine, sua agenda e seu WhatsApp no mesmo link. A cliente agenda sozinha em 40 segundos. 7 dias grátis, sem cartão.',
    type: 'website',
    locale: 'pt_BR',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#7B102B',
  width: 'device-width',
  initialScale: 1,
};

export default async function HomePage() {
  // Admin tem precedência: com as duas sessões abertas (admin + conta teste),
  // a raiz leva ao painel administrativo.
  const admin = await authService.getCurrentUser('admin');
  if (admin) redirect('/admin');

  const session = await authService.getCurrentUser('pro');
  if (session) redirect('/dashboard');

  return (
    <div
      className={`lp-page flex min-h-screen flex-col ${lpFontVars}`}
    >
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1700853197905257');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: 'none' }}
          src="https://www.facebook.com/tr?id=1700853197905257&ev=PageView&noscript=1"
          alt=""
        />
      </noscript>

      <TopBanner />
      <Navbar />
      <main className="flex-1">
        {/* 1. Hero */}
        <Hero />
        {/* 2. Faixa de frases */}
        <MarqueeStrip />
        {/* 3. A dor */}
        <PainSection />
        {/* 4. A conta que ninguém faz */}
        <CostSection />
        {/* 5. A virada — 3 pilares */}
        <TurningPoint />
        {/* 6. Como funciona — 3 passos */}
        <HowItWorks />
        {/* 7. O que a sua cliente vê */}
        <ClientJourney />
        {/* 8. O painel — gestão 360 */}
        <DashboardSection />
        {/* 9. Antes e depois */}
        <Comparison />
        {/* 10. Depoimentos */}
        <Testimonials />
        {/* 11. Para quem é / não é */}
        <ForWho />
        {/* 12. Planos */}
        <Pricing />
        {/* 13. Garantia */}
        <Guarantee />
        {/* 14. FAQ */}
        <FAQ />
        {/* 15. Fechamento */}
        <FinalCTA />
      </main>
      {/* 16. Rodapé */}
      <Footer />
      <StickyCTA />
    </div>
  );
}
