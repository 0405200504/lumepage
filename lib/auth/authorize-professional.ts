import { headers } from 'next/headers';
import { authService } from './auth';
import { isAdminSession } from './require-admin';
import { dbService } from '@/lib/supabase/db';
import { accessBlockFor } from '@/lib/subscription/access-rules';

/**
 * A ação está sendo disparada de DENTRO do painel da profissional?
 *
 * Serve só para separar dois caminhos que o mesmo admin já tem: agir pelo /admin
 * (auditado, com nome próprio) ou agir pela aba de suporte. Não é fronteira de
 * autorização — quem não é admin nem dona da conta continua barrado pelas regras
 * abaixo, independente de qual seja o referer.
 */
async function fromProfessionalPanel(): Promise<boolean> {
  try {
    const referer = (await headers()).get('referer') ?? '';
    if (!referer) return true; // sem origem declarada, assume o caminho mais restrito
    const path = new URL(referer).pathname;
    return !path.startsWith('/admin');
  } catch {
    return true;
  }
}

/**
 * Quem pode agir sobre os dados de uma profissional.
 *
 * Esta checagem estava duplicada, palavra por palavra, em cinco arquivos de actions
 * (professional, crm, site, anamnesis, waitlist) — e duas cópias em booking.ts tinham
 * divergido, deixando qualquer gerente de salão agir sobre qualquer profissional da
 * plataforma. Agora é uma função só.
 *
 * Permitido:
 *  - Super Admin (sessão de escopo 'admin') — sobre qualquer conta;
 *  - a própria profissional;
 *  - gerente de salão, apenas sobre profissionais DO SEU salão.
 */
export async function authorizeProfessional(professionalId: string): Promise<boolean> {
  if (!professionalId) return false;

  const session = await authService.getCurrentUser('pro');

  /**
   * Sessão de suporte em modo LEITURA: nenhuma mutação passa NESTA conta enquanto o
   * admin estiver "só olhando". Vem antes do atalho de admin de propósito — é
   * justamente o admin que estamos segurando, para ele não mexer sem querer no dado
   * de uma cliente real.
   *
   * O recorte por origem existe porque o /admin edita a mesma conta por estas mesmas
   * actions (a aba Configurações do detalhe chama updateProfessionalAction). Sem ele,
   * abrir uma sessão de leitura travaria o próprio painel administrativo.
   */
  if (session?.impersonated_by && session.readonly && session.professional_id === professionalId) {
    if (await fromProfessionalPanel()) return false;
  }

  // Admin: lido do cookie de admin, independente de haver sessão de profissional aberta.
  if (await isAdminSession()) return true;

  if (!session) return false;
  if (session.professional_id === professionalId) return !(await accessBlocked(professionalId));

  if (session.is_salon_manager) {
    const prof = await dbService.getProfessionalById(professionalId);
    if (!prof || (prof.salon_id ?? null) !== (session.salon_id ?? null)) return false;
    return accessBlockFor(prof) === null;
  }

  return false;
}

/**
 * Conta com teste vencido, plano vencido, assinatura encerrada ou pausada pelo
 * admin não age no painel — só o admin (checado acima) pode. Sem isto o paywall
 * era só um pano na frente: bastava removê-lo no navegador e as actions
 * continuavam obedecendo. Fail-open em erro de leitura (como guard.ts).
 */
async function accessBlocked(professionalId: string): Promise<boolean> {
  try {
    const prof = await dbService.getProfessionalById(professionalId);
    return !!prof && accessBlockFor(prof) !== null;
  } catch {
    return false;
  }
}
