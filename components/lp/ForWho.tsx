import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const paraVoce = [
  "Você atende com hora marcada e agenda pelo Instagram ou WhatsApp",
  "Você é lash designer, esteticista, designer de sobrancelhas, manicure, micropigmentadora, massoterapeuta — ou tem uma clínica pequena",
  "Você já perdeu cliente por demorar pra responder",
  "Você quer parar de misturar caderno, print e memória",
];

const naoEhParaVoce = [
  "Você atende só por ordem de chegada, sem horário marcado",
  "Você não quer que a cliente veja seu preço antes de falar com você",
  "Você prefere negociar cada atendimento no 1x1",
];

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Cross() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function ForWho() {
  return (
    <section id="para-quem" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Para quem é</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              A Lume é{" "}
              <span className="accent text-bordo">pra você se…</span>
            </h2>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Reveal>
            <div className="h-full rounded-lp-3xl border border-bordo/15 bg-offwhite p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bordo">
                Feita para você
              </p>
              <ul className="mt-6 grid gap-3.5">
                {paraVoce.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bordo text-offwhite">
                      <Check />
                    </span>
                    <span className="text-[15px] text-grafite/80">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="h-full rounded-lp-3xl border border-grafite/10 bg-grafite/[0.04] p-7 sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-grafite/50">
                Não é para você se…
              </p>
              <ul className="mt-6 space-y-3.5">
                {naoEhParaVoce.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-grafite/10 text-grafite/50">
                      <Cross />
                    </span>
                    <span className="text-[15px] text-grafite/65">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
