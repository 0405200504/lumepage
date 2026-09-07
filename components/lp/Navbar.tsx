"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Logo from "./Logo";
import Button from "./Button";
import { SITE } from "@/lib/lp/site";
import { spring } from "@/lib/lp/motion";

/**
 * Cabeçalho como MATERIAL, e com direção.
 *
 * 1. É uma camada translúcida com desfoque e o conteúdo passa POR BAIXO — não
 *    uma tarja opaca que come uma tira fixa da tela.
 * 2. Sem borda de 1px. A separação aparece só quando existe conteúdo atrás
 *    dela, como um degradê curto (scroll edge), e some no topo da página.
 * 3. Ele acompanha a DIREÇÃO da rolagem: descendo, sai do caminho; subindo,
 *    volta na hora. O gesto de subir já significa "quero voltar", e a barra
 *    responde a essa intenção antes de o usuário pedir.
 *    Isso também é o que mantém a animação no compositor: sai e entra por
 *    `transform`, sem animar altura (que é layout, recalculado todo quadro).
 * 4. No celular ela NÃO gruda: 2,25rem de faixa + 4rem de barra comem 13% de
 *    uma tela pequena, e ali quem carrega a conversão é o CTA de baixo, no
 *    alcance do polegar. Material onde cabe, conteúdo onde não cabe.
 * 5. Orientação ("onde eu estou?"): a pílula do item ativo é UM elemento que
 *    se desloca entre os links com mola — não quatro fundos acendendo e
 *    apagando. Movimento contínuo lê como o mesmo objeto se movendo.
 */

const links = [
  // Rótulo diz o que TEM na seção. "A conta" não diz nada a quem chegou agora;
  // "Quanto custa" nomeia o conteúdo e cria expectativa correta.
  { label: "Quanto custa", href: "#a-conta", id: "a-conta" },
  { label: "Como funciona", href: "#como-funciona", id: "como-funciona" },
  { label: "Painel", href: "#painel", id: "painel" },
  { label: "Planos", href: "#planos", id: "planos" },
  { label: "Perguntas", href: "#faq", id: "faq" },
];

/** Abaixo disto a barra nunca se esconde — ainda estamos perto do topo. */
const ZONA_LIVRE = 160;
/** Ruído de rolagem menor que isto não conta como mudança de direção. */
const LIMIAR_DIRECAO = 6;

export default function Navbar() {
  const calmo = useReducedMotion();
  const [rolou, setRolou] = useState(false);
  const [oculto, setOculto] = useState(false);
  const [gruda, setGruda] = useState(false);
  const [ativa, setAtiva] = useState<string | null>(null);
  const ultimoY = useRef(0);

  // A barra só se esconde onde ela realmente gruda (desktop). No celular ela
  // rola junto com a página e tirá-la do fluxo deixaria um buraco.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 40rem)");
    const sync = () => setGruda(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    ultimoY.current = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const d = y - ultimoY.current;
      setRolou(y > 24);
      if (Math.abs(d) > LIMIAR_DIRECAO) {
        setOculto(y > ZONA_LIVRE && d > 0);
        ultimoY.current = y;
      }
    };
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

  const some = gruda && !calmo && oculto;

  return (
    <motion.header
      className="lp-chrome z-30 h-16"
      data-scrolled={rolou ? "true" : "false"}
      data-oculto={some ? "true" : "false"}
      initial={false}
      animate={{ y: some ? "-100%" : "0%" }}
      transition={spring.ui}
    >
      <nav className="container-lume flex h-full items-center justify-center sm:justify-between">
        <a
          href="#topo"
          aria-label="Lume — início"
          className="lp-nav-link flex items-center rounded-xl"
        >
          <Logo className="w-24 h-auto sm:w-28 sm:-ml-3" />
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
          <a
            href={SITE.login}
            className="lp-nav-link rounded-full px-2 py-1 text-sm font-medium"
          >
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
