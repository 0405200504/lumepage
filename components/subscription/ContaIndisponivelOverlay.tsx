import SectionLabel from '@/components/lp/SectionLabel';
import { SairButton } from './SairButton';
import { lpFontVars } from '@/lib/lp/fonts';
import { WHATSAPP_LINK } from '@/lib/lp/site';

/**
 * Conta pausada ou encerrada pelo admin (decisão operacional, não comercial).
 *
 * Não é o paywall: pagar na Hubla reativaria a assinatura, mas o `status`
 * operacional continuaria 'paused'/'cancelled' e ela seguiria bloqueada —
 * cobrar aqui seria cobrar por nada. O caminho é falar com o suporte.
 *
 * Mesma casca visual do paywall (PlanosOverlay) para a transição não estranhar.
 */
export function ContaIndisponivelOverlay({ reason }: { reason: 'paused' | 'cancelled' }) {
  const pausada = reason === 'paused';
  return (
    <div className={`lp-page fixed inset-0 z-[100] overflow-y-auto pt-0 select-none ${lpFontVars}`}>
      <div className="container-lume py-12 sm:py-16">
        <div className="flex justify-end">
          <SairButton />
        </div>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <SectionLabel>{pausada ? 'Conta pausada' : 'Conta encerrada'}</SectionLabel>
          <h1 className="mt-4 font-sora text-h1 font-semibold leading-tight text-grafite sm:text-display">
            {pausada ? 'Sua conta está pausada.' : 'Sua conta foi encerrada.'}
          </h1>
          <p className="mt-5 text-body leading-relaxed text-grafite/70 sm:text-h3">
            {pausada
              ? 'Sua agenda, suas clientes e seu histórico continuam guardados. Para voltar a usar o painel, fale com a gente.'
              : 'Seus dados ficam guardados por um tempo. Se quiser reativar a conta, fale com a gente.'}
          </p>
          <div className="mt-8 flex justify-center">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Falar com o suporte no WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
