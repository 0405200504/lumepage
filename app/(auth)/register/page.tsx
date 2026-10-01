import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { verifyOrphanSignupToken, orphanStateForSignup } from '@/lib/subscription/orphans';
import { resolvePlan, type PlanType } from '@/lib/subscription/entitlements';

export const dynamic = 'force-dynamic';

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

/**
 * Cadastro.
 *
 *   /register                                → teste grátis de 7 dias
 *   /register?plano=start                    → veio do pós-compra da Hubla: texto de plano pago
 *   /register?email=…&plano=…&c=<assinatura> → veio do e-mail de compra órfã
 *
 * Só o link assinado consulta a compra no banco: sem a assinatura, a tela não
 * pode virar um jeito de descobrir quem comprou digitando e-mails na URL.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const email = one(sp.email).trim().toLowerCase().slice(0, 254);
  const rawPlan = one(sp.plano).toLowerCase();
  const planHint: PlanType | null = rawPlan === 'start' || rawPlan === 'pro' || rawPlan === 'premium' ? rawPlan : null;

  let purchase: { state: 'pending' | 'claimed'; plan: PlanType | null } | null = null;
  if (email && verifyOrphanSignupToken(email, one(sp.c))) {
    const found = await orphanStateForSignup(email);
    if (found.state !== 'none') {
      purchase = { state: found.state, plan: found.plan ? resolvePlan(found.plan) : planHint };
    }
  }

  return <RegisterForm initialEmail={email} purchase={purchase} planHint={planHint} />;
}
