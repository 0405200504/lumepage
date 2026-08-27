import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const pilares = [
  {
    n: "1",
    titulo: "Vitrine que vende",
    desc: "Foto, descrição, duração e preço de cada serviço. A cliente lê tudo antes de perguntar. As dúvidas que travavam a venda morrem antes de nascer.",
    icon: "vitrine",
  },
  {
    n: "2",
    titulo: "Agenda que fecha sozinha",
    desc: "Só aparecem os horários que você realmente tem. Ela escolhe, confirma e pronto — entrou na sua agenda. Sem conflito, sem “deixa eu conferir aqui”.",
    icon: "agenda",
  },
  {
    n: "3",
    titulo: "WhatsApp que trabalha por você",
    desc: "Confirmação na hora, lembrete antes do atendimento e mensagens automáticas pra trazer cliente de volta. Tudo no número dela, no app que ela abre 40 vezes por dia.",
    icon: "whatsapp",
  },
];

function PillarIcon({ name }: { name: string }) {
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
    case "vitrine":
      return (
        <svg {...common}>
          <rect x="3" y="7" width="18" height="14" rx="2" />
          <path d="M3 7l2-4h14l2 4M8 12h8M8 16h5" />
        </svg>
      );
    case "agenda":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" />
          <path d="M9.5 15.5l1.8 1.8 3.5-3.6" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <path d="M21 11.5a8.5 8.5 0 01-12.6 7.4L3 20.5l1.7-5.2A8.5 8.5 0 1121 11.5z" />
          <path d="M8.8 9.2c.4 2.6 3.4 5.6 6 6" />
        </svg>
      );
  }
}

export default function TurningPoint() {
  return (
    <section id="a-solucao" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="max-w-4xl">
            <SectionLabel>A solução</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Um link. A cliente escolhe o serviço, escolhe o horário e recebe a
              confirmação no WhatsApp.{" "}
              <span className="accent text-bordo">Você não digita nada.</span>
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-grafite/70 sm:text-lg">
              Não é mais um “link com botõezinhos”. É a sua vitrine, sua agenda e
              seu WhatsApp funcionando juntos — enquanto você atende, dorme ou
              está no cinema.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {pilares.map((p, i) => (
            <Reveal key={p.n} delay={i * 0.1}>
              <div className="flex h-full flex-col rounded-lp-3xl border border-rose/50 bg-lp-cream p-7 transition-ui duration-300 hover:border-bordo/40 hover:shadow-lp-card sm:p-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-bordo/20 bg-offwhite text-bordo shadow-lp-soft">
                  <PillarIcon name={p.icon} />
                </div>
                <h3 className="mt-5 font-sora text-lg font-semibold text-grafite">
                  {p.titulo}
                </h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-grafite/65">
                  {p.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
