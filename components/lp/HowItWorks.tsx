import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import Sparkle from "./Sparkle";
import Button from "./Button";

const passos = [
  {
    n: "1",
    titulo: "Você monta sua página",
    desc: "Sobe suas fotos, escreve seus serviços, define preços e os dias que atende. É preencher formulário, não é “criar site”.",
  },
  {
    n: "2",
    titulo: "Você troca o link da bio",
    desc: "Copia o link da Lume, cola na bio do Instagram. Pronto: seu perfil virou um lugar onde se compra, não onde se pergunta.",
  },
  {
    n: "3",
    titulo: "Você atende. A Lume vende.",
    desc: "A cliente entra, escolhe, agenda e recebe confirmação. Você recebe o aviso e vê tudo organizado no painel.",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="max-w-3xl">
            <SectionLabel>Simples de começar</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Do zero ao primeiro agendamento em{" "}
              <span className="accent text-bordo">10 minutos.</span>
            </h2>
          </div>
        </Reveal>

        <div className="relative mt-14">
          {/* linha horizontal conectando os passos (desktop) */}
          <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-rose via-bordo/40 to-rose lg:block" />

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {passos.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.1}>
                <div className="relative">
                  <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-bordo/20 bg-offwhite font-sora text-xl font-semibold text-bordo shadow-lp-soft">
                    {p.n}
                  </div>
                  <h3 className="mt-5 font-sora text-lg font-semibold text-grafite">
                    {p.titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-grafite/65">
                    {p.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal delay={0.15}>
          <div className="mt-14 flex items-center justify-center gap-3 rounded-lp-3xl border border-bordo/15 bg-offwhite px-7 py-7 text-center">
            <Sparkle size={16} className="hidden shrink-0 text-bordo sm:block" />
            <p className="font-sora text-base font-medium text-grafite sm:text-lg">
              Sem instalar nada. Sem saber de tecnologia. Sem contratar ninguém.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-8 flex flex-col items-center">
            <Button>Quero minha agenda no ar</Button>
            <p className="mt-3 text-xs text-grafite/50">
              7 dias grátis · Sem cartão · Sem fidelidade
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
