import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import MockupLanding from "./MockupLanding";

const pontos = [
  {
    ve: "Vê seu trabalho antes de qualquer coisa",
    logo: "decide com o olho",
  },
  {
    ve: "Vê o preço sem ter que pedir",
    logo: "não precisa criar coragem pra perguntar",
  },
  {
    ve: "Vê os horários livres",
    logo: "não negocia, escolhe",
  },
  {
    ve: "Confirma e recebe no WhatsApp",
    logo: "fica tranquila, não te chama pra confirmar",
  },
];

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="mt-1 shrink-0 text-bordo"
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function ClientJourney() {
  return (
    <section id="o-que-ela-ve" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="max-w-3xl">
            <SectionLabel>A experiência da cliente</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              É por isso que ela agenda em{" "}
              <span className="accent text-bordo">40 segundos.</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1fr_auto]">
          {/* pontos */}
          <div className="space-y-4">
            {pontos.map((p, i) => (
              <Reveal key={p.ve} delay={i * 0.08}>
                <div className="rounded-lp-3xl border border-rose/50 bg-offwhite p-6 sm:p-7">
                  <p className="font-sora text-base font-semibold text-grafite sm:text-lg">
                    {p.ve}
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-[15px] leading-relaxed text-bordo">
                    <Arrow />
                    <span className="font-medium">{p.logo}</span>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* mockup da página */}
          <Reveal delay={0.15}>
            <div className="relative flex justify-center">
              <div className="absolute -right-8 -top-8 h-56 w-56 rounded-full bg-rose/30 blur-3xl" />
              <div className="relative animate-float-slow">
                <MockupLanding />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14 rounded-lp-3xl border border-bordo/15 bg-offwhite px-7 py-8 text-center sm:px-12">
            <p className="mx-auto max-w-3xl font-sora text-xl font-medium leading-snug text-grafite sm:text-2xl">
              Toda pergunta que ela faria no direct já está respondida na
              página. É por isso que ela não te manda mensagem —{" "}
              <span className="accent text-bordo">ela marca.</span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
