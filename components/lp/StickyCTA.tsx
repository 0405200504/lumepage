"use client";

import { useEffect, useState } from "react";
import { CTA_LINK } from "@/lib/lp/site";

/** CTA fixo no rodapé apenas no mobile — usa o CTA_LINK central de lib/site. */
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
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full flex-col items-center justify-center rounded-full bg-bordo py-2.5 text-sm font-semibold text-offwhite shadow-lp-glow"
      >
        <span className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.044a9.872 9.872 0 00.999.337z" />
          </svg>
          Testar 7 dias grátis
        </span>
        <span className="mt-0.5 text-[10px] font-medium text-offwhite/70">
          Sem cartão · Sem fidelidade
        </span>
      </a>
    </div>
  );
}
