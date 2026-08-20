"use client";

import { useEffect, useState } from "react";
import { CTA_LINK } from "@/lib/lp/site";

/** CTA fixo no rodapé apenas no mobile — leva pro cadastro. */
export default function StickyCTA() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-rose/50 bg-offwhite/95 p-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <a
        href={CTA_LINK}
        className="flex w-full flex-col items-center justify-center rounded-full bg-bordo py-2.5 text-sm font-semibold text-offwhite shadow-lp-glow"
      >
        <span>Testar 7 dias grátis</span>
        <span className="mt-0.5 text-[10px] font-medium text-offwhite/70">
          Sem cartão · Sem fidelidade
        </span>
      </a>
    </div>
  );
}
