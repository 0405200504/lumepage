import Sparkle from "./Sparkle";
import { CTA_LINK, TRIAL_BANNER } from "@/lib/lp/site";

/**
 * Faixa fixa no topo — é a única coisa que acompanha a rolagem.
 * O cabeçalho com a logo rola junto com a página, então esta faixa é o lembrete
 * permanente de que dá pra testar sem pagar. A altura (2.25rem) é compensada
 * pelo padding-top de `.lp-page` em globals.css.
 */
export default function TopBanner() {
  return (
    <a
      href={CTA_LINK}
      className="fixed inset-x-0 top-0 z-50 flex h-9 items-center justify-center gap-2 bg-bordo px-4 text-center text-[13px] font-semibold text-offwhite transition-colors hover:bg-bordo-soft"
    >
      <Sparkle size={11} className="shrink-0 text-rose" />
      {TRIAL_BANNER}
    </a>
  );
}
