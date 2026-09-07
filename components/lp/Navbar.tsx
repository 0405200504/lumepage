"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Logo from "./Logo";
import Button from "./Button";
import { SITE } from "@/lib/lp/site";
import { spring } from "@/lib/lp/motion";

/**
 * Cabeçalho como MATERIAL, não como faixa opaca.
 *
 * Três decisões vindas do jeito Apple de tratar chrome flutuante:
 *
 * 1. É uma camada translúcida com desfoque e o conteúdo passa POR BAIXO —
 *    não uma tarja opaca que come uma tira fixa da tela. Por isso a barra
 *    encolhe ao rolar em vez de sumir: continua acessível sem pesar.
 * 2. Sem borda de 1px. A separação aparece só quando existe conteúdo atrás
 *    dela, como um degradê curto (scroll edge), e some no topo da página.
 * 3. No celular ela NÃO gruda: 2,25rem de faixa + 4rem de barra comem 13%
 *    de uma tela pequena, e ali quem carrega a conversão é o CTA de baixo,
 *    no alcance do polegar. Material onde cabe, conteúdo onde não cabe.
 * 4. Orientação ("onde eu estou?"): a pílula do item ativo é UM elemento que
 *    se desloca entre os links com mola — não quatro fundos acendendo e
 *    apagando. Movimento contínuo lê como o mesmo objeto se movendo.
 */

const links = [
  { label: "A conta", href: "#a-conta", id: "a-conta" },
  { label: "Como funciona", href: "#como-funciona", id: "como-funciona" },
  { label: "Painel", href: "#painel", id: "painel" },
  { label: "Planos", href: "#planos", id: "planos" },
  { label: "Perguntas", href: "#faq", id: "faq" },
];

export default function Navbar() {
  const calmo = useReducedMotion();
  const [rolou, setRolou] = useState(false);
  const [ativa, setAtiva] = useState<string | null>(null);

  // Encolher a barra: 24px de rolagem já indica intenção de ler o conteúdo.
  useEffect(() => {
    const onScroll = () => setRolou(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Seção ativa = a que ocupa a faixa central da viewport. A margem negativa
  // grande em cima e embaixo recorta essa faixa; sem ela, duas seções ficam
  // "visíveis" ao mesmo tempo e a pílula pisca entre elas.
  useEffect(() => {
    const alvos = links
      .map((l) => document.getElementById(l.id))
      .filter((el): el is HTMLElement => el !== null);
    if (alvos.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visivel = entries.find((e) => e.isIntersecting);
        if (visivel) setAtiva(visivel.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    alvos.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <motion.header
      className="lp-chrome z-30 h-16"
      data-scrolled={rolou ? "true" : "false"}
      animate={calmo ? undefined : { height: rolou ? 54 : 64 }}
      initial={false}
      transition={spring.ui}
      style={calmo ? { height: 64 } : undefined}
    >
      <nav className="container-lume flex h-full items-center justify-center sm:justify-between">
        <a href="#topo" aria-label="Lume — início" className="flex items-center">
          <motion.span
            className="block"
            animate={calmo ? undefined : { scale: rolou ? 0.88 : 1 }}
            initial={false}
            transition={spring.ui}
            style={{ transformOrigin: "left center" }}
          >
            <Logo className="w-24 h-auto sm:w-28 sm:-ml-3" />
          </motion.span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const atual = ativa === l.id;
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={atual ? "location" : undefined}
                className="lp-nav-link relative rounded-full px-3.5 py-2 text-sm font-medium"
              >
                {atual && (
                  <motion.span
                    layoutId={calmo ? undefined : "lp-nav-pill"}
                    className="lp-nav-pill absolute inset-0 rounded-full"
                    transition={spring.ui}
                  />
                )}
                <span className="relative">{l.label}</span>
              </a>
            );
          })}
        </div>

        <div className="hidden items-center gap-5 sm:flex">
          <a href={SITE.login} className="lp-nav-link text-sm font-medium">
            Entrar
          </a>
          <Button className="px-5 py-2.5 text-[0.8125rem]">
            Testar 7 dias grátis
          </Button>
        </div>
      </nav>
    </motion.header>
  );
}
