import Button from "./Button";
import Sparkle from "./Sparkle";
import Reveal from "./Reveal";

export default function FinalCTA() {
  return (
    <section className="bg-offwhite pb-20 pt-4 sm:pb-28">
      <div className="container-lume">
        <Reveal>
          <div className="grain relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-bordo to-bordo-deep px-7 py-16 text-center text-offwhite shadow-lp-glow sm:px-14 sm:py-20">
            {/* decorações */}
            <Sparkle size={26} className="absolute left-10 top-12 text-rose/50 animate-sparkle-pulse" />
            <Sparkle size={18} className="absolute bottom-14 right-14 text-rose/40" />
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-offwhite/10 blur-3xl" />

            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-rose">
              Pronta para começar
            </p>
            <h2 className="mx-auto mt-5 max-w-3xl font-sora text-3xl font-semibold leading-tight sm:text-[2.6rem]">
              Amanhã de manhã, uma cliente vai clicar{" "}
              <span className="accent text-rose">no link da sua bio.</span>
            </h2>

            <div className="mx-auto mt-7 max-w-xl space-y-4 text-base leading-relaxed text-offwhite/80 sm:text-lg">
              <p className="font-medium text-offwhite">
                A única pergunta é o que vai acontecer depois.
              </p>
              <p>
                Ou ela cai no seu direct, espera você ter uma mão livre, pergunta
                o preço, pensa, esfria e some.
              </p>
              <p>
                Ou ela vê seu trabalho, vê o preço, escolhe o horário de sábado
                às 14h e recebe a confirmação no WhatsApp — enquanto você está
                atendendo outra pessoa, sem saber de nada.
              </p>
              <p className="font-medium text-offwhite">
                Leva 10 minutos pra mudar isso. E os 7 primeiros dias são por
                nossa conta.
              </p>
            </div>

            <div className="mt-9 flex justify-center">
              <Button className="bg-offwhite !text-bordo hover:bg-lp-cream">
                Criar minha página grátis
              </Button>
            </div>

            <p className="mt-4 text-sm text-offwhite/65">
              7 dias grátis · Sem cartão · Sem fidelidade · No ar hoje
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
