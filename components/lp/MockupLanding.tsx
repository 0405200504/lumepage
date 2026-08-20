import Sparkle from "./Sparkle";

/**
 * Mockup da landing page de uma cliente fictícia (Studio Marília Costa),
 * renderizado dentro de um frame de celular. Tudo em CSS/SVG.
 */
export default function MockupLanding({ className = "" }: { className?: string }) {
  const servicos = [
    { nome: "Alongamento em gel", preco: "R$ 140" },
    { nome: "Esmaltação em gel", preco: "R$ 90" },
    { nome: "Blindagem", preco: "R$ 70" },
  ];

  return (
    <div
      className={`relative w-[270px] rounded-[2.4rem] border border-grafite/10 bg-grafite p-2.5 shadow-lp-glow ${className}`}
    >
      {/* notch */}
      <div className="absolute left-1/2 top-2.5 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-grafite" />
      <div className="overflow-hidden rounded-[2rem] bg-offwhite">
        {/* topo / capa */}
        <div className="relative bg-gradient-to-b from-bordo to-bordo-deep px-5 pb-7 pt-9 text-offwhite">
          <Sparkle size={14} className="absolute right-5 top-7 text-rose/70" />
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose/40 bg-offwhite/10 text-lg font-semibold">
            MC
          </div>
          <p className="mt-3 text-center font-sora text-base font-semibold">
            Studio Marília Costa
          </p>
          <p className="text-center text-[11px] text-rose">
            Nail Designer • São Paulo
          </p>
          <div className="mt-4 flex justify-center gap-1.5">
            {["Gel", "Fibra", "Spa dos pés"].map((t) => (
              <span
                key={t}
                className="rounded-full border border-rose/30 px-2.5 py-1 text-[9px] text-rose"
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* serviços */}
        <div className="px-4 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-areia">
            Serviços
          </p>
          <div className="space-y-2">
            {servicos.map((s) => (
              <div
                key={s.nome}
                className="flex items-center justify-between rounded-xl border border-rose/50 bg-lp-cream px-3 py-2.5"
              >
                <span className="text-[11px] font-medium text-grafite">
                  {s.nome}
                </span>
                <span className="text-[11px] font-semibold text-bordo">
                  {s.preco}
                </span>
              </div>
            ))}
          </div>

          {/* horários */}
          <p className="mb-2 mt-4 text-[10px] font-semibold uppercase tracking-wider text-areia">
            Horários de hoje
          </p>
          <div className="flex gap-1.5">
            {["09:00", "11:30", "14:00", "16:30"].map((h, i) => (
              <span
                key={h}
                className={`rounded-lg px-2 py-1.5 text-[10px] font-medium ${
                  i === 1
                    ? "bg-bordo text-offwhite"
                    : "border border-rose/60 text-grafite"
                }`}
              >
                {h}
              </span>
            ))}
          </div>

          <button className="mt-4 w-full rounded-full bg-bordo py-2.5 text-[11px] font-semibold text-offwhite">
            Agendar agora
          </button>
        </div>
      </div>
    </div>
  );
}
