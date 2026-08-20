import Logo from "./Logo";
import Sparkle from "./Sparkle";
import { SITE } from "@/lib/lp/site";

export default function Footer() {
  return (
    <footer className="border-t border-rose/50 bg-lp-cream">
      <div className="container-lume py-12">
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Logo className="w-28 h-auto -ml-3" />
            <p className="flex items-center gap-2 text-sm text-grafite/60">
              <Sparkle size={11} className="text-bordo/60" />
              {SITE.tagline}
            </p>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-sm font-medium text-grafite/70">
            <a
              href={SITE.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-bordo"
            >
              Instagram
            </a>
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-bordo"
            >
              WhatsApp
            </a>
            <a href={SITE.privacy} className="transition-colors hover:text-bordo">
              Política de Privacidade
            </a>
            <a href={SITE.terms} className="transition-colors hover:text-bordo">
              Termos de Serviço
            </a>
            <a href={SITE.login} className="transition-colors hover:text-bordo">
              Entrar
            </a>
          </nav>
        </div>

        <div className="mt-10 hairline" />

        <div className="mt-6 flex flex-col items-center justify-between gap-3 text-xs text-grafite/45 sm:flex-row">
          <p>
            © {new Date().getFullYear()} Lume. Todos os direitos reservados.
          </p>
          <p className="uppercase tracking-[0.2em]">
            Clareza • Estratégia • Resultados
          </p>
        </div>
      </div>
    </footer>
  );
}
