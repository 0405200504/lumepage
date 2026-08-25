import React from 'react';
import { Lock, ArrowRight, Sparkles } from 'lucide-react';
import {
  CAPABILITY_LABEL, PLAN_LABEL, UPGRADE_CHECKOUT, requiredPlan, type Capability,
} from '@/lib/subscription/entitlements';
import { checkoutIdentityFor } from '@/lib/subscription/guard';
import { checkoutLink } from '@/lib/lp/site';

/**
 * Tela exibida no lugar de um módulo quando o plano da profissional não o inclui.
 * Bloqueio de rota (server-side): mesmo acessando pela URL, ela vê o convite ao
 * upgrade em vez do conteúdo.
 *
 * Com `professionalId`, o link do checkout leva o carimbo da conta (`sck`) — é
 * o que o webhook da Hubla usa pra liberar o plano certo pra pessoa certa.
 */
export async function UpgradeRequired({
  capability,
  professionalId,
}: {
  capability: Capability;
  professionalId?: string;
}) {
  const plan = requiredPlan(capability);
  const identity = professionalId ? await checkoutIdentityFor(professionalId) : null;
  const url = UPGRADE_CHECKOUT[plan] ? checkoutLink(plan, true, identity) : null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-md text-center card-elevated rounded-3xl p-8 sm:p-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-wine-700/10 text-wine-700">
          <Lock className="h-6 w-6" />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-soft-border bg-accent-soft px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-wine-700">
          <Sparkles className="h-3 w-3" /> Plano {PLAN_LABEL[plan]}
        </span>

        <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">{CAPABILITY_LABEL[capability]}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Este recurso faz parte do plano <strong className="font-bold text-ink">{PLAN_LABEL[plan]}</strong>.
          Faça upgrade para desbloquear e continuar crescendo com a Lume.
        </p>

        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="tap mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg"
            style={{ background: 'linear-gradient(135deg, #8c2438 0%, #500b18 100%)' }}
          >
            Fazer upgrade para {PLAN_LABEL[plan]} <ArrowRight className="h-4 w-4" />
          </a>
        )}
      </div>
    </div>
  );
}

export default UpgradeRequired;
