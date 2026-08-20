"use client";

import { useEffect, useState } from "react";
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

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-rose/50 bg-offwhite/85 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
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
