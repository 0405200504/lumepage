import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const dores = [
  {
    n: "01",
    titulo: "Você virou atendente do seu próprio negócio.",
    text: "Responde as mesmas 4 perguntas 30 vezes por semana: quanto é, tem horário, onde fica, aceita pix.",
  },
  {
    n: "02",
    titulo: "Sua agenda mora em três lugares.",
    text: "Caderno, print de conversa e memória. E uma hora dá conflito na frente da cliente.",
  },
  {
    n: "03",
    titulo: "Você desconta o preço porque teve trabalho pra fechar.",
    text: "Depois de 20 mensagens, dizer “não” pro desconto fica difícil.",
  },
  {
    n: "04",
    titulo: "O no-show come seu dia.",
    text: "Ninguém confirmou nada. Ela esqueceu. Você ficou 1h30 parada e perdeu o dinheiro.",
  },
  {
    n: "05",
    titulo: "Você não sabe quanto ganhou esse mês.",
    text: "Sabe que trabalhou muito. O número exato, não.",
  },
  {
    n: "06",
    titulo: "A cliente que veio uma vez nunca mais voltou.",
    text: "E você não tem nem o telefone dela organizado pra chamar.",
  },
];

export default function PainSection() {
  return (
    <section id="dor" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="max-w-3xl">
            <SectionLabel>O problema do direct</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Você já perdeu essa cliente hoje.{" "}
              <span className="accent text-bordo">Só não sabe ainda.</span>
            </h2>

            <div className="mt-6 space-y-4 text-base leading-relaxed text-grafite/70 sm:text-lg">
              <p>
                Ela viu seu antes e depois. Ela salvou. Ela clicou no link da
                sua bio.
              </p>
              <p className="font-medium text-grafite">E caiu no seu WhatsApp.</p>
              <p>
                Aí começa: <em>“oi, tudo bem?”</em>. Você responde 40 minutos
                depois, porque estava com a mão dentro do olho de outra cliente.
                Ela pergunta o preço. Você manda a tabela. Ela pergunta se tem
                sábado. Você abre a agenda, confere, responde. Ela some.
              </p>
              <p>
                Duas semanas depois ela aparece no Instagram de outra
                profissional. Não porque a outra é melhor. Porque a outra
                respondeu primeiro — ou porque a outra nem precisou responder.
              </p>
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {dores.map((d, i) => (
            <Reveal key={d.n} delay={i * 0.06}>
              <div className="group flex h-full gap-4 rounded-lp-3xl border border-rose/50 bg-lp-cream p-6 transition-ui duration-300 hover:border-bordo/40 hover:shadow-lp-card sm:p-7">
                <span className="font-cormorant text-3xl italic text-bordo/70">
                  {d.n}
                </span>
                <div>
                  <p className="font-sora text-base font-semibold leading-snug text-grafite">
                    {d.titulo}
                  </p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-grafite/65">
                    {d.text}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-12 rounded-lp-3xl bg-grafite px-7 py-10 text-center sm:px-12 sm:py-12">
            <p className="mx-auto max-w-3xl font-sora text-xl font-medium leading-snug text-offwhite sm:text-2xl">
              Nada disso é falta de esforço seu. É que você está usando um link{" "}
              <span className="accent text-rose">
                que não foi feito pra vender.
              </span>
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
