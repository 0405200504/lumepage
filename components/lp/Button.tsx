import type { ReactNode } from "react";
import { CTA_LINK } from "@/lib/lp/site";

type ButtonProps = {
  children: ReactNode;
  /** Padrão: o cadastro. Aceita âncora (#), rota interna ou URL externa. */
  href?: string;
  variant?: "primary" | "ghost";
  className?: string;
};

export default function Button({
  children,
  href = CTA_LINK,
  variant = "primary",
  className = "",
}: ButtonProps) {
  const isExternal = href.startsWith("http");
  const classes = variant === "primary" ? "btn-primary" : "btn-ghost";

  return (
    <a
      href={href}
      className={`${classes} ${className}`}
      {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
