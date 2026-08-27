"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const faqs = [
  {
    q: "Vou ter que aprender a mexer em mais um sistema?",
    a: "Você preenche seus serviços e seus horários uma vez. Depois disso, o sistema trabalha e você só olha a agenda. Quem monta a página costuma levar cerca de 10 minutos. Se travar, a gente te ajuda a montar.",
  },
  {
    q: "E se minha cliente não souber usar?",
    a: "Ela usa iFood, Uber e Shopee. A página tem três telas: escolher serviço, escolher horário, confirmar. É mais simples que pedir comida.",
  },
  {
    q: "Eu gosto de falar com minha cliente antes.",
    a: "Continue falando. A Lume tira do seu direct só o que é burocracia — preço, horário e confirmação. Sobra tempo pra conversa que interessa: a que cria vínculo e faz ela voltar.",
  },
  {
    q: "Minha agenda é bagunçada, meus horários mudam toda hora.",
    a: "Por isso existe bloqueio e folga. Você fecha o dia ou o horário que não vai atender e ninguém consegue marcar ali. Sua exceção vira regra do sistema.",
  },
  {
    q: "Já tenho um linktree.",
    a: "O linktree mostra links. A Lume fecha agendamento. Um manda a cliente embora pra outro app, a outra resolve ali mesmo.",
  },
  {
    q: "E se eu quiser sair depois?",
    a: "Sai. Sem multa e sem fidelidade. E leva sua base de clientes.",
  },
  {
    q: "Preciso colocar cartão pra testar?",
    a: "Não. Você cria a conta, usa 7 dias com tudo liberado e só decide depois.",
  },

  /* ------------------------------------------------------------------
   * TODO — 2 objeções do documento de copy que dependem de informação
   * que só você tem sobre o produto. Preencha a resposta e descomente:
   *
   * {
   *   q: "Funciona pra clínica com mais de uma profissional?",
   *   a: "[Responder conforme o produto suporta hoje. Se suportar, é
   *       argumento forte pro Premium. Se ainda não suportar, diga que
   *       está no roteiro e NÃO prometa data.]",
   * },
   * {
   *   q: "Como funcionam os disparos no WhatsApp?",
   *   a: "[Explicar em uma frase simples, sem termo técnico: se é pelo
   *       número da profissional, o que precisa conectar e quais são os
   *       limites por plano.]",
   * },
   * ------------------------------------------------------------------ */
];

function Item({
  q,
  a,
  open,
  onClick,
}: {
  q: string;
  a: string;
  open: boolean;
  onClick: () => void;
}) {
  return (
    <div className="border-b border-rose/50">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
        aria-expanded={open}
      >
        <span className="font-sora text-base font-medium text-grafite sm:text-lg">
          {q}
        </span>
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-ui duration-300 ${
            open
              ? "rotate-45 border-bordo bg-bordo text-offwhite"
              : "border-grafite/20 text-grafite"
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-5 pr-12 text-[15px] leading-relaxed text-grafite/70">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="bg-offwhite py-20 sm:py-28">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Perguntas frequentes</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Ainda com um{" "}
              <span className="accent text-bordo">“sim, mas…”?</span>
            </h2>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-rose/50 bg-lp-cream px-6 py-2 shadow-lp-soft sm:px-9">
            {faqs.map((f, i) => (
              <Item
                key={f.q}
                q={f.q}
                a={f.a}
                open={openIndex === i}
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              />
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
