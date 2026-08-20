import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const linhas = [
  { label: "Link da bio", hoje: "Manda pro WhatsApp", lume: "Vitrine que fecha agendamento" },
  { label: "Preço", hoje: "Você digita a tabela toda vez", lume: "Está na página, visível" },
  { label: "Horários", hoje: "“Deixa eu ver e te falo”", lume: "Ela escolhe o que está livre" },
  { label: "Agenda", hoje: "Caderno + print + memória", lume: "Uma agenda só, no celular" },
  { label: "Confirmação", hoje: "Você lembra (ou esquece)", lume: "Automática no WhatsApp" },
  { label: "No-show", hoje: "Prejuízo silencioso", lume: "Lembrete antes reduz falta" },
  { label: "Cliente antiga", hoje: "Some e não volta", lume: "Disparo traz ela de volta" },
  { label: "Faturamento", hoje: "“Acho que foi um mês bom”", lume: "Número exato no dashboard" },
  { label: "Seu domingo", hoje: "Respondendo direct", lume: "Seu" },
];

function Cross() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function Check() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Comparison() {
  return (
    <section id="antes-depois" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>A diferença na prática</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              A mesma semana,{" "}
              <span className="accent text-bordo">com e sem Lume.</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-12 max-w-4xl overflow-hidden rounded-[2rem] border border-rose/50 bg-offwhite shadow-lp-soft">
            {/* cabeçalho — só no desktop */}
            <div className="hidden grid-cols-[0.8fr_1fr_1fr] gap-px border-b border-rose/50 bg-rose/40 sm:grid">
              <div className="bg-offwhite px-6 py-4" />
              <div className="bg-offwhite px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-grafite/50">
                  Hoje
                </p>
              </div>
              <div className="bg-bordo px-6 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose">
                  Com o Lume
                </p>
              </div>
            </div>

            <div className="divide-y divide-rose/40 sm:divide-y-0">
              {linhas.map((l) => (
                <div
                  key={l.label}
                  className="px-6 py-5 sm:grid sm:grid-cols-[0.8fr_1fr_1fr] sm:items-stretch sm:gap-px sm:bg-rose/40 sm:px-0 sm:py-0"
                >
                  <div className="sm:flex sm:items-center sm:bg-offwhite sm:px-6 sm:py-4">
                    <p className="font-sora text-xs font-semibold uppercase tracking-[0.18em] text-bordo sm:text-[13px] sm:normal-case sm:tracking-normal sm:text-grafite">
                      {l.label}
                    </p>
                  </div>

                  <div className="mt-3 flex items-start gap-2.5 sm:mt-0 sm:items-center sm:bg-offwhite sm:px-6 sm:py-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-grafite/10 text-grafite/50 sm:mt-0">
                      <Cross />
                    </span>
                    <span className="text-[15px] text-grafite/60">{l.hoje}</span>
                  </div>

                  <div className="mt-2 flex items-start gap-2.5 sm:mt-0 sm:items-center sm:bg-bordo sm:px-6 sm:py-4">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bordo text-offwhite sm:mt-0 sm:bg-offwhite/15">
                      <Check />
                    </span>
                    <span className="text-[15px] font-medium text-grafite sm:font-normal sm:text-offwhite/90">
                      {l.lume}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
