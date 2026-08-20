import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import Sparkle from "./Sparkle";
import Button from "./Button";

/**
 * "A conta que ninguém faz" — seção de agitação.
 * Os números abaixo são estimativas conservadoras, sinalizadas como tal no texto.
 * Se você tiver dados reais de clientes, troque-os aqui (número verificável
 * converte mais do que número impressionante).
 */
const linhas = [
  {
    label: "Tempo no direct",
    conta: "20 conversas por semana × 7 minutos de idas e vindas",
    valor: "≈ 10 h",
    sufixo: "por mês digitando as mesmas respostas",
  },
  {
    label: "Vendas que esfriam",
    conta: "Das 20 conversas, 8 não fecham × ticket médio de R$ 120",
    valor: "R$ 960",
    sufixo: "por mês sumindo no visualizado",
  },
  {
    label: "No-show",
    conta: "2 faltas por mês, sem ninguém pra confirmar antes",
    valor: "R$ 240",
    sufixo: "de horário parado que já estava vendido",
  },
];

export default function CostSection() {
  return (
    <section id="a-conta" className="bg-lp-cream py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>A conta que ninguém faz</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Quanto custa{" "}
              <span className="accent text-bordo">responder no direct?</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-grafite/70 sm:text-lg">
              Faça a conta com números seus. Aqui vão números conservadores.
            </p>
          </div>
        </Reveal>

        <div className="mx-auto mt-12 max-w-3xl space-y-4">
          {linhas.map((l, i) => (
            <Reveal key={l.label} delay={i * 0.08}>
              <div className="flex flex-col gap-4 rounded-lp-3xl border border-rose/50 bg-offwhite p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="sm:max-w-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-bordo">
                    {l.label}
                  </p>
                  <p className="mt-2 text-[15px] leading-relaxed text-grafite/70">
                    {l.conta}
                  </p>
                </div>
                <div className="shrink-0 sm:text-right">
                  <p className="font-sora text-3xl font-semibold text-grafite">
                    {l.valor}
                  </p>
                  <p className="mt-1 max-w-[15rem] text-xs leading-relaxed text-grafite/55">
                    {l.sufixo}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* total */}
        <Reveal delay={0.15}>
          <div className="grain relative mx-auto mt-6 max-w-3xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-bordo to-bordo-deep px-7 py-10 text-center text-offwhite shadow-lp-glow sm:px-12">
            <Sparkle
              size={20}
              className="absolute right-8 top-8 text-rose/60 animate-sparkle-pulse"
            />
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose">
              O que o direct te cobra todo mês
            </p>
            <p className="mt-4 font-sora text-4xl font-semibold leading-none sm:text-5xl">
              ≈ R$ 1.200
            </p>
            <p className="mt-3 text-base text-offwhite/80">
              e 10 horas da sua vida.
            </p>

            <div className="mx-auto mt-8 max-w-sm rounded-2xl bg-offwhite/10 px-6 py-5">
              <p className="text-sm text-rose">O Lume custa</p>
              <p className="mt-1 font-sora text-2xl font-semibold">
                R$ 39 por mês
              </p>
              <p className="mt-1 text-xs text-offwhite/65">no plano anual</p>
            </div>

            <p className="mx-auto mt-8 max-w-lg font-sora text-lg font-medium leading-snug sm:text-xl">
              Um único agendamento recuperado paga o mês inteiro.{" "}
              <span className="accent text-rose">O resto é lucro.</span>
            </p>

            <div className="mt-8 flex justify-center">
              <Button className="bg-offwhite !text-bordo hover:bg-lp-cream">
                Testar 7 dias grátis
              </Button>
            </div>
            <p className="mt-3 text-xs text-offwhite/60">
              7 dias grátis · Sem cartão · Sem fidelidade
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-grafite/45">
            Estimativa ilustrativa com números conservadores, para você refazer
            a conta com os seus. O resultado varia conforme o seu volume de
            atendimentos e o seu ticket médio.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
