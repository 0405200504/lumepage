"use client";

import { useState } from "react";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import Sparkle from "./Sparkle";
import Button from "./Button";
import { CTA_LINK, checkoutLink, type PlanoId } from "@/lib/lp/site";

type Plano = {
  id: PlanoId;
  nome: string;
  anual: number;
  mensal: number;
  economiaAno: number;
  para: string;
  recursos: string[];
  heranca?: string;
  destaque?: boolean;
  selo?: string;
};

const planos: Plano[] = [
  {
    id: "start",
    nome: "Start",
    anual: 39,
    mensal: 49,
    economiaAno: 120,
    para: "Pra quem quer parar de perder cliente no direct hoje.",
    recursos: [
      "Página pública de agendamento (seu link na bio)",
      "Horários gerados automaticamente",
      "Serviços ilimitados",
      "Lista de clientes",
      "Lembretes por WhatsApp",
      "Financeiro básico",
    ],
  },
  {
    id: "pro",
    nome: "Pro",
    anual: 79,
    mensal: 99,
    economiaAno: 240,
    para: "Pra quem já tem movimento e quer encher os horários vazios.",
    heranca: "Tudo do Start, mais:",
    recursos: [
      "Lista de espera (buraco na agenda vira agendamento)",
      "Bloqueios e folgas",
      "Módulo de Vendas",
      "Financeiro completo",
      "Disparos no WhatsApp (até 10 mensagens por dia)",
    ],
    destaque: true,
    selo: "Menos de R$ 2,70 por dia. Um café.",
  },
  {
    id: "premium",
    nome: "Premium",
    anual: 149,
    mensal: 179,
    economiaAno: 360,
    para: "Pra clínica que trata a base de clientes como ativo.",
    heranca: "Tudo do Pro, mais:",
    recursos: ["Disparos no WhatsApp ilimitados", "Suporte prioritário"],
  },
];

function Check({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
        light ? "bg-offwhite/15 text-offwhite" : "bg-bordo text-offwhite"
      }`}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 12.5l4.5 4.5L19 7"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export default function Pricing() {
  const [anual, setAnual] = useState(true);

  return (
    <section id="planos" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Planos e preços</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Assine e comece hoje.{" "}
              <span className="accent text-bordo">Sem fidelidade.</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-grafite/70 sm:text-lg">
              Aqui você contrata o plano de uma vez, direto no checkout. Se
              prefere experimentar antes,{" "}
              <a
                href={CTA_LINK}
                className="font-semibold text-bordo underline underline-offset-4 hover:text-bordo-soft"
              >
                use os 7 dias grátis
              </a>{" "}
              — esses não pedem cartão.
            </p>
          </div>
        </Reveal>

        {/* toggle mensal / anual */}
        <Reveal delay={0.05}>
          <div className="mt-10 flex justify-center">
            <div
              role="group"
              aria-label="Escolha a periodicidade do plano"
              className="inline-flex items-center gap-1 rounded-full border border-rose/60 bg-lp-cream p-1"
            >
              <button
                type="button"
                onClick={() => setAnual(false)}
                aria-pressed={!anual}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  !anual
                    ? "bg-bordo text-offwhite shadow-lp-soft"
                    : "text-grafite/60 hover:text-bordo"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => setAnual(true)}
                aria-pressed={anual}
                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all duration-300 ${
                  anual
                    ? "bg-bordo text-offwhite shadow-lp-soft"
                    : "text-grafite/60 hover:text-bordo"
                }`}
              >
                Anual
                <span className={anual ? "text-rose" : "text-bordo"}>
                  {" "}
                  — economize até 2 meses
                </span>
              </button>
            </div>
          </div>
        </Reveal>

        {/* cards */}
        <div className="mt-12 grid items-stretch gap-5 lg:grid-cols-3">
          {planos.map((p, i) => {
            const preco = anual ? p.anual : p.mensal;
            const dark = p.destaque;

            return (
              <Reveal key={p.nome} delay={i * 0.1}>
                <div
                  className={`grain relative flex h-full flex-col overflow-hidden rounded-[2rem] p-7 sm:p-8 ${
                    dark
                      ? "bg-gradient-to-br from-bordo to-bordo-deep text-offwhite shadow-lp-glow lg:-mt-4 lg:pb-12"
                      : "border border-rose/50 bg-lp-cream"
                  }`}
                >
                  {dark && (
                    <span className="absolute right-6 top-7 inline-flex items-center gap-1.5 rounded-full bg-offwhite/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-rose">
                      <Sparkle size={11} />
                      Mais escolhido
                    </span>
                  )}

                  <p
                    className={`font-sora text-xs font-semibold uppercase tracking-[0.25em] ${
                      dark ? "text-rose" : "text-bordo"
                    }`}
                  >
                    {p.nome}
                  </p>

                  <div className="mt-5 flex items-end gap-1.5">
                    <span
                      className={`font-sora text-[2.75rem] font-semibold leading-none ${
                        dark ? "text-offwhite" : "text-grafite"
                      }`}
                    >
                      R$ {preco}
                    </span>
                    <span
                      className={`pb-1.5 text-sm ${
                        dark ? "text-offwhite/70" : "text-grafite/55"
                      }`}
                    >
                      /mês
                    </span>
                  </div>

                  <p
                    className={`mt-2 text-xs leading-relaxed ${
                      dark ? "text-offwhite/65" : "text-grafite/55"
                    }`}
                  >
                    {anual ? (
                      <>
                        no plano anual · R$ {p.mensal} no mensal · economia de R${" "}
                        {p.economiaAno} por ano
                      </>
                    ) : (
                      <>
                        no plano mensal · R$ {p.anual} no anual · economize R${" "}
                        {p.economiaAno} por ano
                      </>
                    )}
                  </p>

                  <p
                    className={`mt-5 border-t pt-5 font-sora text-[15px] font-medium leading-snug ${
                      dark
                        ? "border-offwhite/15 text-offwhite"
                        : "border-rose/50 text-grafite"
                    }`}
                  >
                    {p.para}
                  </p>

                  <ul className="mt-6 flex-1 space-y-3">
                    {p.heranca && (
                      <li
                        className={`text-[13px] font-semibold uppercase tracking-[0.12em] ${
                          dark ? "text-rose" : "text-bordo"
                        }`}
                      >
                        {p.heranca}
                      </li>
                    )}
                    {p.recursos.map((r) => (
                      <li key={r} className="flex items-start gap-2.5">
                        <Check light={dark} />
                        <span
                          className={`text-[15px] leading-relaxed ${
                            dark ? "text-offwhite/90" : "text-grafite/75"
                          }`}
                        >
                          {r}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8">
                    <Button
                      href={checkoutLink(p.id, anual)}
                      className={`w-full ${
                        dark ? "bg-offwhite !text-bordo hover:bg-lp-cream" : ""
                      }`}
                    >
                      Assinar o {p.nome}
                    </Button>
                    <p
                      className={`mt-3 text-center text-xs ${
                        dark ? "text-offwhite/60" : "text-grafite/50"
                      }`}
                    >
                      {anual ? "Cobrança anual" : "Cobrança mensal"} · Cancela
                      quando quiser
                    </p>
                  </div>

                  {p.selo && (
                    <p className="mt-4 text-center text-xs font-medium text-rose">
                      {p.selo}
                    </p>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* reforço + ancoragem */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-bordo/15 bg-lp-cream px-7 py-9 text-center sm:px-12">
            <p className="text-base leading-relaxed text-grafite/75 sm:text-lg">
              <strong className="font-semibold text-grafite">
                Assinar não te prende.
              </strong>{" "}
              Não tem fidelidade nem multa: você cancela quando quiser e leva sua
              base de clientes junto. E se preferir ver funcionando antes de
              pagar, o teste de 7 dias existe pra isso — acesso completo, no seu
              dia real, sem cartão.
            </p>

            <div className="mt-7 flex items-center justify-center gap-3 border-t border-rose/50 pt-7">
              <Sparkle size={16} className="shrink-0 text-bordo" />
              <p className="font-sora text-lg font-medium leading-snug text-grafite sm:text-xl">
                Uma cliente por mês paga a Lume.{" "}
                <span className="accent text-bordo">
                  A segunda em diante é sua.
                </span>
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
