import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type CardTone = "default" | "highlight" | "alert";

const tones: Record<CardTone, string> = {
  default: "border border-border",
  highlight: "border-2 border-ink", // p. ej. pedido nuevo en cocina
  alert: "border-2 border-primary", // p. ej. pedido atrasado
};

type CardProps = HTMLAttributes<HTMLDivElement> & { tone?: CardTone };

export function Card({ tone = "default", className, ...props }: CardProps) {
  return (
    <div className={cn("rounded-lg bg-surface p-4", tones[tone], className)} {...props} />
  );
}
