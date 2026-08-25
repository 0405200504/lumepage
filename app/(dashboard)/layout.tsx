import React from 'react';
import { requireProfessional } from '@/lib/auth/session';
import { dbService } from '@/lib/supabase/db';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ActingBanner } from '@/components/salon/ActingBanner';
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner';
import { AdminNotices } from '@/components/dashboard/AdminNotices';
import { AIAgentChat } from '@/components/ai/AIAgentChat';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { PlanosOverlay } from '@/components/subscription/PlanosOverlay';
import { ForcePasswordChange } from '@/components/auth/ForcePasswordChange';
import { mustChangePassword } from '@/lib/auth/must-change-password';
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

  if (session.professional_id) {
    try {
      const [prof, paused] = await Promise.all([
        dbService.getProfessionalById(session.professional_id),
        dbService.getPausedConversations(session.professional_id).catch(() => []),
      ]);
      if (prof) {
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

  return (
    <div
      className="flex min-h-screen bg-cream"
      style={{
        backgroundImage:
          'radial-gradient(60% 50% at 100% 0%, rgba(140,36,56,0.04) 0%, transparent 60%), radial-gradient(50% 40% at 0% 100%, rgba(80,11,24,0.035) 0%, transparent 55%)',
        backgroundAttachment: 'fixed',
      }}
    >
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

        <main className="flex-1 p-4 sm:p-6 pb-28 lg:pb-6 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      <AIAgentChat />

      {/* Tour de boas-vindas — só aparece no primeiro contato da profissional
          (controlado por localStorage no próprio componente). */}
      <OnboardingTour
        firstName={session.name?.split(' ')[0]}
        slug={slug}
        professionalId={session.professional_id ?? undefined}
      />
    </div>
  );
}
