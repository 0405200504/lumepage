import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import Sparkle from "./Sparkle";
import PricingPlans from "./PricingPlans";
import { CTA_LINK } from "@/lib/lp/site";

/**
 * Seção de planos da página de vendas.
 * A grade em si (toggle + cartões) mora em PricingPlans, compartilhada com o
 * paywall de trial vencido — aqui ficam só a moldura e o texto de venda.
 */
export default function Pricing() {
  return (
    <section id="planos" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Planos e preços</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Assine e comece hoje.{" "}
              <span className="accent text-bordo">Sem fidelidade.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-grafite/70 sm:text-lg">
              Aqui você contrata o plano de uma vez, direto no checkout. Se
              prefere experimentar antes,{" "}
              <a
                href={CTA_LINK}
                className="font-semibold text-bordo underline underline-offset-4 hover:text-bordo-soft"
              >
                use os 7 dias grátis
              </a>{" "}
              — esses não pedem cartão.
            </p>
          </div>
        </Reveal>

        <PricingPlans />

        {/* reforço + ancoragem */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-bordo/15 bg-lp-cream px-7 py-9 text-center sm:px-12">
            <p className="text-base leading-relaxed text-grafite/75 sm:text-lg">
              <strong className="font-semibold text-grafite">
                Assinar não te prende.
              </strong>{" "}
              Não tem fidelidade nem multa: você cancela quando quiser e leva sua
              base de clientes junto. E se preferir ver funcionando antes de
              pagar, o teste de 7 dias existe pra isso — acesso completo, no seu
              dia real, sem cartão.
            </p>

            <div className="mt-7 flex items-center justify-center gap-3 border-t border-rose/50 pt-7">
              <Sparkle size={16} className="shrink-0 text-bordo" />
              <p className="font-sora text-lg font-medium leading-snug text-grafite sm:text-xl">
                Uma cliente por mês paga a Lume.{" "}
                <span className="accent text-bordo">
                  A segunda em diante é sua.
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
