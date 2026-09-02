import React from 'react';
import { redirect } from 'next/navigation';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { TabBar } from '@/components/layout/TabBar';
import { RouteTransition } from '@/components/layout/RouteTransition';
import { ActingBanner } from '@/components/salon/ActingBanner';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { AdminNotices } from '@/components/dashboard/AdminNotices';
import { AIAgentChat } from '@/components/ai/AIAgentChat';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { PlanosOverlay } from '@/components/subscription/PlanosOverlay';
import { ForcePasswordChange } from '@/components/auth/ForcePasswordChange';
import { AppSplash } from '@/components/ui/AppSplash';
import { mustChangePassword } from '@/lib/auth/must-change-password';
import { professionalPrecisaOnboarding } from '@/lib/auth/onboarding';
import { planEnforced, isLegacyAccount } from '@/lib/subscription/entitlements';
import type { CheckoutIdentity } from '@/lib/lp/site';

/**
 * Casca persistente do app (PWA).
 * Renderiza barra de navegação, header e chat UMA vez. Ao trocar de aba,
 * só o conteúdo (children) é substituído — a navegação não remonta, o que dá
 * a sensação de aplicativo nativo e elimina o "pisca/delay" a cada toque.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireProfessional();

  // Senha temporária definida pelo suporte: destrava só depois que ela escolher a dela.
  const forcePasswordChange = await mustChangePassword(session);

  let brandName = '';
  let slug = '';
  let pendingConversations = 0;
  let isTrialExpired = false;
  let subscriptionPlan: string | null = null;
  let subscriptionStatus: string | null = null;
  let enforcePlan = false;
  // Carimbo do checkout: faz o pagamento na Hubla voltar pra ESTA conta.
  let checkoutIdentity: CheckoutIdentity | null = null;
  let precisaBoasVindas = false;

  if (session.professional_id) {
    try {
      const [prof, paused] = await Promise.all([
        dbService.getProfessionalById(session.professional_id),
        dbService.getPausedConversations(session.professional_id).catch(() => []),
      ]);
      if (prof) {
        // Conta criada com o Google que ainda não passou pelas boas-vindas.
        // O redirect acontece FORA do try: redirect() funciona lançando, e o
        // catch aqui embaixo engoliria o desvio.
        precisaBoasVindas = professionalPrecisaOnboarding(prof);

        brandName = prof.brand_name;
        slug = prof.slug;
        subscriptionPlan = prof.subscription_plan ?? null;
        subscriptionStatus = prof.subscription_status ?? null;
        checkoutIdentity = {
          professionalId: prof.id,
          email: prof.email,
          name: prof.name || prof.brand_name,
          phone: prof.whatsapp,
        };

        const legacy = isLegacyAccount(prof.created_at);
        // Contas legadas nunca são bloqueadas/limitadas por plano.
        enforcePlan = planEnforced({ createdAt: prof.created_at, status: prof.subscription_status });

        // Verificação de Trial Expirado (só conta nova)
        if (!legacy && prof.subscription_status === 'trialing' && prof.trial_ends_at) {
          if (new Date() > new Date(prof.trial_ends_at)) {
            isTrialExpired = true;
          }
        }

        // Plano pago vencido (vencimento definido pelo admin) → paywall (só conta nova ativa)
        if (!legacy && prof.subscription_status === 'active' && prof.subscription_ends_at) {
          if (new Date() > new Date(prof.subscription_ends_at)) {
            isTrialExpired = true;
          }
        }
      }
      pendingConversations = paused.length;
    } catch (e) {
      console.error('Erro ao buscar profissional no layout:', e);
    }
  }

  // Sem negócio e sem WhatsApp o painel não tem o que mostrar — completa antes.
  if (precisaBoasVindas) redirect('/bem-vinda');

  return (
    <div className="flex min-h-screen bg-bg">
      {/* Cortina de abertura: só na primeira entrada de cada sessão, e some
          sozinha por CSS. Fica ANTES de tudo porque precisa estar no HTML do
          primeiro paint — inclusive por cima do paywall e da troca de senha,
          que são o que a profissional vê logo depois dela. */}
      <AppSplash />

      {isTrialExpired && <PlanosOverlay identity={checkoutIdentity} />}
      {forcePasswordChange && <ForcePasswordChange />}

      <Sidebar
        role="professional"
        name={session.name}
        brandName={brandName || session.name}
        slug={slug}
        plan={subscriptionPlan}
        enforcePlan={enforcePlan}
        pendingConversations={pendingConversations}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Admin "entrando como": faixa fixa, impossível de ignorar. */}
        {session.impersonated_by && (
          <ImpersonationBanner
            brandName={brandName || session.name}
            adminEmail={session.impersonated_by}
            readOnly={session.readonly !== false}
            expiresAt={session.exp}
          />
        )}
        {session.is_salon_manager && <ActingBanner brandName={brandName || 'profissional'} />}
        <Header
          userName={session.name}
          userEmail={session.email}
          role="professional"
        />

        {/* Avisos publicados pelo admin em /admin/broadcast */}
        <AdminNotices professionalId={session.professional_id ?? ''} subscriptionStatus={subscriptionStatus} />

        {/* A rolagem é da JANELA, não de um contêiner interno: é o que faz a
            topbar colapsar e a barra do navegador sumir no celular. */}
        {/* pb-28 no celular reserva a altura do dock flutuante + a margem
            que ele descola da borda. */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 lg:px-8 pt-1 pb-28 lg:pb-12">
          <RouteTransition>{children}</RouteTransition>
        </main>
      </div>

      {/* Barra de abas do celular. O `pb-24` do <main> já reservava o espaço
          que ela ocupa — antes, para o FAB solto. */}
      <TabBar />

      <AIAgentChat />

      {/* Tour de boas-vindas — só no primeiro contato da profissional (o
          controle é por localStorage, dentro do componente).

          NÃO monta enquanto houver um bloqueio na frente: com o paywall ou a
          troca de senha obrigatória abertos, o tour navegaria por baixo de uma
          tela que ela não consegue fechar. */}
      {!isTrialExpired && !forcePasswordChange && (
        <OnboardingTour
          firstName={session.name?.split(' ')[0]}
          professionalId={session.professional_id ?? undefined}
        />
      )}
    </div>
  );
}
