import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import MockupDashboard from "./MockupDashboard";

const recursos = [
  {
    titulo: "Dashboard",
    desc: "Quanto entrou no mês, quantos atendimentos, quem vem hoje. Numa tela.",
  },
  {
    titulo: "Agenda",
    desc: "Seu dia inteiro na palma da mão, sem caderno e sem conflito de horário.",
  },
  {
    titulo: "Base de clientes",
    desc: "Histórico, contato e preferências de cada uma. Você lembra do que ela fez mesmo depois de 4 meses.",
  },
  {
    titulo: "Financeiro",
    desc: "O que entrou, o que saiu, o que sobrou. Sem planilha.",
  },
  {
    titulo: "Lembretes por WhatsApp",
    desc: "A cliente é avisada antes. Falta menos.",
  },
  {
    titulo: "Lista de espera",
    desc: "Abriu um buraco na agenda? O sistema já sabe quem quer aquele horário.",
  },
  {
    titulo: "Bloqueios e folgas",
    desc: "Você marca que não atende e ninguém consegue agendar ali. Seu descanso vira regra do sistema.",
  },
  {
    titulo: "Módulo de vendas",
    desc: "Produtos e pacotes vendidos e registrados junto com o atendimento.",
  },
  {
    titulo: "Disparos no WhatsApp",
    desc: "Chama de volta quem sumiu, avisa da promoção, enche o horário vazio de quarta-feira.",
  },
];

export default function DashboardSection() {
  return (
    <section id="painel" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="max-w-3xl">
            <SectionLabel>Não para aí</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Enquanto ela agenda, você ganha um{" "}
              <span className="accent text-bordo">
                sistema de gestão inteiro.
              </span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-grafite/70 sm:text-lg">
              A página é a porta da frente. Atrás dela tem uma clínica
              organizada.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-3 sm:grid-cols-2">
            {recursos.map((r, i) => (
              <Reveal key={r.titulo} delay={i * 0.05}>
                <div className="h-full rounded-2xl border border-rose/50 bg-lp-cream px-5 py-4">
                  <p className="font-sora text-sm font-semibold text-grafite">
                    {r.titulo}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-grafite/60">
                    {r.desc}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <div className="relative flex justify-center">
              <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-rose/30 blur-3xl" />
              <div className="relative animate-float-slow">
                <MockupDashboard />
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="mt-14 rounded-lp-3xl bg-grafite px-7 py-10 text-center sm:px-12">
            <p className="mx-auto max-w-3xl font-sora text-xl font-medium leading-snug text-offwhite sm:text-2xl">
              Você abriu esse negócio pra fazer o que ama. Não pra ser{" "}
              <span className="accent text-rose">
                secretária, contadora e recepcionista de si mesma.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
