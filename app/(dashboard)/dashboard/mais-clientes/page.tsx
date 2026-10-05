import React from 'react';
import { headers } from 'next/headers';
import { requireProfessional } from '@/lib/auth/session';
import { lerPrograma, lerConfiguracoes } from '@/lib/mais-clientes/store';
import { resumoNegocio } from '@/lib/mais-clientes/negocio';
import { montarRoteiroX1 } from '@/lib/mais-clientes/x1';
import { Vitrine } from '@/components/mais-clientes/Vitrine';
import { Jornada } from '@/components/mais-clientes/Jornada';

/**
 * ============================================================================
 * PAINEL · Quero mais clientes
 * ============================================================================
 * Bloqueada: vitrine da assessoria + agendar a call com a equipe.
 * Liberada (pelo admin, depois do pagamento): a jornada em quatro etapas.
 */

export const metadata = {
  title: 'Quero mais clientes | Lume',
  description: 'A equipe Lume estrutura seu Instagram, seu Google, seus anúncios e seu WhatsApp para encher a sua agenda.',
};

async function appUrl(): Promise<string> {
  const doEnv = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '');
  if (doEnv) return doEnv;
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    if (host) return `${h.get('x-forwarded-proto') || 'https'}://${host}`;
  } catch { /* fora de request */ }
  return '';
}

export default async function QueroMaisClientesPage() {
  const session = await requireProfessional();
  const professionalId = session.professional_id!;
  const [{ programa }, config, base] = await Promise.all([
    lerPrograma(professionalId),
    lerConfiguracoes().catch(() => ({ linkCall: '', whatsappSuporte: '', metaBusinessId: '', googleEmail: '' })),
    appUrl(),
  ]);

  const zap = config.whatsappSuporte.replace(/\D/g, '');
  const zapSuporte = zap ? `https://wa.me/${zap.startsWith('55') ? zap : `55${zap}`}` : '';
  if (programa.status !== 'liberado') {
    const linkCall = config.linkCall
      || (zapSuporte ? `${zapSuporte}?text=${encodeURIComponent('Oi! Quero agendar a call do "Quero mais clientes".')}` : '');
    return <Vitrine linkCall={linkCall} />;
  }

  const negocio = await resumoNegocio(professionalId, base);
  const roteiro = montarRoteiroX1({ nome: negocio.nome, linkAgendamento: negocio.linkAgendamento, ofertas: programa.plan?.ofertas ?? [] });
  return <Jornada professionalId={professionalId} inicial={programa} negocio={negocio} roteiroInicial={roteiro}
    acesso={{ metaBusinessId: config.metaBusinessId, googleEmail: config.googleEmail, zapSuporte }} />;
}
