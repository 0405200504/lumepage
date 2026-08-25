import SectionLabel from '@/components/lp/SectionLabel';
import Sparkle from '@/components/lp/Sparkle';
import PricingPlans from '@/components/lp/PricingPlans';
import { SairButton } from './SairButton';
import { lpFontVars } from '@/lib/lp/fonts';
import { WHATSAPP_LINK, type CheckoutIdentity } from '@/lib/lp/site';

/**
 * Paywall de trial vencido (ou de plano pago vencido).
 *
 * Cobre o painel inteiro: a conta continua intacta, mas só destrava assinando.
 * O miolo é a MESMA grade de planos da página de vendas (PricingPlans) dentro
 * da casca `.lp-page` — quem viu a página de vendas reconhece a tela, e preço,
 * texto e checkout nunca divergem entre os dois lugares.
 *
 * `identity` carimba os seis checkouts com quem está comprando (id, e-mail,
 * nome e telefone da conta logada) — é assim que o webhook da Hubla sabe qual
 * conta liberar, mesmo se ela pagar com outro e-mail.
 *
 * O `pt-0` anula o padding que a `.lp-page` reserva pra faixa fixa da LP, que
 * aqui não existe.
 */
export function PlanosOverlay({ identity }: { identity?: CheckoutIdentity | null }) {
  return (
    <div
      className={`lp-page fixed inset-0 z-[100] overflow-y-auto pt-0 select-none ${lpFontVars}`}
    >
      <div className="container-lume py-12 sm:py-16">
        <div className="flex justify-end">
          <SairButton />
        </div>

        <div className="mx-auto mt-6 max-w-2xl text-center">
          <SectionLabel>Seu teste grátis acabou</SectionLabel>
          <h1 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
            Assine e continue de onde parou.{' '}
            <span className="accent text-bordo">Sem fidelidade.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-grafite/70 sm:text-lg">
            Sua agenda, suas clientes e seu histórico continuam aqui, do jeito
            que você deixou. Escolha o plano e o acesso volta na hora.
          </p>
        </div>

        <PricingPlans animate={false} identity={identity} />

        {/* reforço + contato */}
        <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-bordo/15 bg-lp-cream px-7 py-9 text-center sm:px-12">
          <p className="text-base leading-relaxed text-grafite/75 sm:text-lg">
            <strong className="font-semibold text-grafite">
              Assinar não te prende.
            </strong>{' '}
            Não tem fidelidade nem multa: você cancela quando quiser e leva sua
            base de clientes junto. O pagamento é processado pela Hubla e o
            acesso é liberado assim que a compra é confirmada.
          </p>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 border-t border-rose/50 pt-7 sm:flex-row">
            <Sparkle size={16} className="shrink-0 text-bordo" />
            <p className="font-sora text-lg font-medium leading-snug text-grafite sm:text-xl">
              Ficou em dúvida sobre qual plano?{' '}
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="accent text-bordo underline underline-offset-4 hover:text-bordo-soft"
              >
                Fala com a gente no WhatsApp.
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
