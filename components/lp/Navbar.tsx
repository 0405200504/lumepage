import Logo from "./Logo";
import Button from "./Button";
import { SITE } from "@/lib/lp/site";

const links = [
  { label: "A conta", href: "#a-conta" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Painel", href: "#painel" },
  { label: "Planos", href: "#planos" },
  { label: "Perguntas", href: "#faq" },
];

/**
 * Cabeçalho comum, que rola junto com a página. Quem fica fixo no topo é a
 * faixa do teste grátis (TopBanner) — dois elementos grudados na tela roubavam
 * altura demais no celular.
 */
export default function Navbar() {
  return (
    <header className="relative z-30 border-b border-rose/40 bg-offwhite">
      <nav className="container-lume flex h-16 items-center justify-center sm:justify-between">
        <a href="#topo" aria-label="Lume — início" className="flex items-center">
          <Logo className="w-24 h-auto sm:w-28 sm:-ml-3" />
        </a>

        <div className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-grafite/70 transition-colors hover:text-bordo"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-5 sm:flex">
          <a
            href={SITE.login}
            className="text-sm font-medium text-grafite/70 transition-colors hover:text-bordo"
          >
            Entrar
          </a>
          <Button className="px-5 py-2.5">Testar 7 dias grátis</Button>
        </div>
      </nav>
    </header>
  );
}
