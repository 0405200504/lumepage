import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

/**
 * ATENÇÃO antes de publicar: confira se cada promessa abaixo bate com a
 * política real de cancelamento e de exportação de dados do produto.
 * Promessa que a operação não cumpre gera reembolso e reclamação — e queima
 * marca em nicho pequeno, onde todo mundo se conhece.
 */
const selos = [
  {
    icone: "🔓",
    titulo: "7 dias grátis, sem cartão",
    desc: "Não pedimos número de cartão pra você testar. Se sumir no sétimo dia, não acontece nada.",
  },
  {
    icone: "🚪",
    titulo: "Sem fidelidade",
    desc: "Cancela quando quiser, sem multa, sem ligação de retenção, sem “fale com o consultor”.",
  },
  {
    icone: "📦",
    titulo: "Seus dados são seus",
    desc: "Sua base de clientes é sua. Sai quando quiser levando ela junto.",
  },
];

export default function Guarantee() {
  return (
    <section id="garantia" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Reversão de risco</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Você não está arriscando nada.{" "}
              <span className="accent text-bordo">Literalmente nada.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          {selos.map((s, i) => (
            <Reveal key={s.titulo} delay={i * 0.1}>
              <div className="flex h-full flex-col items-center rounded-lp-3xl border border-rose/50 bg-offwhite p-7 text-center sm:p-8">
                <span className="text-3xl" aria-hidden="true">
                  {s.icone}
                </span>
                <h3 className="mt-4 font-sora text-base font-semibold text-grafite">
                  {s.titulo}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-grafite/65">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
