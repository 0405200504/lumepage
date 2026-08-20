import Sparkle from "./Sparkle";

/**
 * Mockup do painel de controle da profissional.
 * Cards arredondados, gráfico simples, lista de agendamentos e resumo financeiro.
 */
export default function MockupDashboard({
  className = "",
}: {
  className?: string;
}) {
  const agendamentos = [
    { hora: "09:00", cliente: "Ana Beatriz", servico: "Alongamento gel" },
    { hora: "11:30", cliente: "Carla M.", servico: "Blindagem" },
    { hora: "14:00", cliente: "Júlia Reis", servico: "Esmaltação" },
  ];

  // alturas do gráfico (em %)
  const barras = [45, 62, 50, 78, 66, 90, 72];

  return (
    <div
      className={`w-full max-w-md rounded-lp-3xl border border-rose/60 bg-offwhite p-4 shadow-lp-card ${className}`}
    >
      {/* header do painel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-bordo text-[11px] font-semibold text-offwhite">
            MC
          </span>
          <div>
            <p className="font-sora text-[13px] font-semibold leading-tight text-grafite">
              Painel Lume
            </p>
            <p className="text-[10px] text-areia">Segunda, 8 de junho</p>
          </div>
        </div>
        <Sparkle size={14} className="text-bordo/40" />
      </div>

      {/* cards de resumo */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { label: "Hoje", value: "7", sub: "agendamentos" },
          { label: "Semana", value: "32", sub: "clientes" },
          { label: "Receita", value: "R$ 4,2k", sub: "estimada" },
        ].map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-rose/50 bg-lp-cream px-2.5 py-2.5"
          >
            <p className="text-[9px] uppercase tracking-wide text-areia">
              {c.label}
            </p>
            <p className="font-sora text-base font-semibold text-bordo">
              {c.value}
            </p>
            <p className="text-[9px] text-grafite/60">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {/* gráfico */}
        <div className="col-span-3 rounded-2xl border border-rose/50 bg-lp-cream p-3">
          <p className="text-[10px] font-semibold text-grafite">
            Agendamentos na semana
          </p>
          <div className="mt-3 flex h-16 items-end gap-1.5">
            {barras.map((h, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t-md ${
                  i === 5 ? "bg-bordo" : "bg-rose"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>

        {/* próximos */}
        <div className="col-span-2 rounded-2xl border border-rose/50 bg-lp-cream p-3">
          <p className="text-[10px] font-semibold text-grafite">Tarefas</p>
          <ul className="mt-2 space-y-1.5">
            {["Confirmar Ana", "Repor estoque", "Postar antes/depois"].map(
              (t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full border border-bordo/50" />
                  <span className="text-[9px] text-grafite/80">{t}</span>
                </li>
              )
            )}
          </ul>
        </div>
      </div>

      {/* lista de agendamentos */}
      <div className="mt-3 rounded-2xl border border-rose/50 bg-lp-cream p-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-grafite">
            Próximos agendamentos
          </p>
          <span className="text-[9px] text-bordo">ver todos</span>
        </div>
        <div className="mt-2 space-y-2">
          {agendamentos.map((a) => (
            <div key={a.hora} className="flex items-center gap-2.5">
              <span className="rounded-lg bg-bordo/10 px-2 py-1 text-[10px] font-semibold text-bordo">
                {a.hora}
              </span>
              <div className="flex-1">
                <p className="text-[11px] font-medium leading-tight text-grafite">
                  {a.cliente}
                </p>
                <p className="text-[9px] text-areia">{a.servico}</p>
              </div>
              <span className="h-2 w-2 rounded-full bg-bordo" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
