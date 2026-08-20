"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const testimonials = [
  { id: 1, src: "/depoimentos/1.png" },
  { id: 2, src: "/depoimentos/2.png" },
  { id: 3, src: "/depoimentos/3.png" },
  { id: 4, src: "/depoimentos/4.png" },
  { id: 5, src: "/depoimentos/5.png" },
  { id: 6, src: "/depoimentos/6.png" },
];

export default function Testimonials() {
  const [activeStory, setActiveStory] = useState<string | null>(null);

  return (
    <section className="bg-lp-cream py-20 sm:py-28 overflow-hidden">
      <div className="container-lume">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <SectionLabel>Depoimentos</SectionLabel>
            <h2 className="mt-4 font-sora text-3xl font-semibold leading-tight text-grafite sm:text-4xl">
              Quem trocou o direct{" "}
              <span className="accent text-bordo">pelo link.</span>
            </h2>
            <p className="mt-5 text-grafite/70">
              Deslize para ver o que mudou na rotina de quem parou de responder preço e horário no direct. Clique nas imagens para ampliar.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 -mx-5 px-5 sm:-mx-8 sm:px-8">
          <Reveal delay={0.1}>
            <div className="flex w-full snap-x snap-mandatory gap-5 overflow-x-auto pb-8 pt-4 no-scrollbar">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setActiveStory(t.src)}
                  className="relative w-[280px] shrink-0 snap-center sm:w-[320px] shadow-lp-card rounded-2xl overflow-hidden transition-transform duration-300 hover:-translate-y-1 cursor-pointer"
                >
                  <Image
                    src={t.src}
                    alt={`Depoimento ${t.id}`}
                    width={337}
                    height={600}
                    className="h-auto w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveStory(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 sm:p-8 backdrop-blur-sm"
          >
            <button
              onClick={() => setActiveStory(null)}
              className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 sm:right-8 sm:top-8"
              aria-label="Fechar"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative h-[85vh] w-full max-w-[500px] overflow-hidden rounded-2xl bg-black"
            >
              <Image
                src={activeStory}
                alt="Story ampliado"
                fill
                className="object-contain"
                priority
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
