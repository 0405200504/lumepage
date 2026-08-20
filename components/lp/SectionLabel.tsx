import Sparkle from "./Sparkle";

type SectionLabelProps = {
  children: React.ReactNode;
  tone?: "bordo" | "offwhite";
};

/** Rótulo de seção com sparkle — usado acima dos títulos. */
export default function SectionLabel({
  children,
  tone = "bordo",
}: SectionLabelProps) {
  const color = tone === "bordo" ? "text-bordo" : "text-rose";
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] ${color}`}
    >
      <Sparkle size={13} className="animate-sparkle-pulse" />
      {children}
    </span>
  );
}
