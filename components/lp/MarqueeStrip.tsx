import Sparkle from "./Sparkle";

const phrases = [
  "Sua cliente não quer conversar. Ela quer agendar.",
  "Você não perde cliente por preço. Perde por demora.",
  "O link da sua bio não foi feito pra vender.",
  "Toda pergunta do direct já está respondida na página.",
  "Você não abriu esse negócio pra ser secretária de si mesma.",
];

export default function MarqueeStrip() {
  const items = [...phrases, ...phrases];
  return (
    <div className="overflow-hidden border-y border-rose/40 bg-lp-cream py-4">
      <div className="flex w-max animate-marquee gap-10">
        {items.map((p, i) => (
          <div key={i} className="flex items-center gap-10">
            <span className="whitespace-nowrap text-sm font-medium text-grafite/60">
              {p}
            </span>
            <Sparkle size={12} className="text-bordo/50" />
          </div>
        ))}
      </div>
    </div>
  );
}
