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
    icone: "cadeado",
    titulo: "7 dias grátis, sem cartão",
    desc: "Não pedimos número de cartão pra você testar. Se sumir no sétimo dia, não acontece nada.",
  },
  {
    icone: "porta",
    titulo: "Sem fidelidade",
    desc: "Cancela quando quiser, sem multa, sem ligação de retenção, sem “fale com o consultor”.",
  },
  {
    icone: "caixa",
    titulo: "Seus dados são seus",
    desc: "Sua base de clientes é sua. Sai quando quiser levando ela junto.",
  },
];

function SeloIcon({ name }: { name: string }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    // cadeado aberto: testar não custa nada
    case "cadeado":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2" />
          <path d="M8 11V7.5A4 4 0 0116 7" />
          <path d="M12 15v2" />
        </svg>
      );
    // porta com saída: cancela quando quiser
    case "porta":
      return (
        <svg {...common}>
          <path d="M14 3H6a1 1 0 00-1 1v16a1 1 0 001 1h8" />
          <path d="M18 12H10M15 9l3 3-3 3" />
        </svg>
      );
    // caixa: leva os dados embora
    default:
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
          <path d="M3 8l9 5 9-5M12 13v8" />
        </svg>
      );
  }
}

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
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-bordo/20 bg-lp-cream text-bordo">
                  <SeloIcon name={s.icone} />
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
