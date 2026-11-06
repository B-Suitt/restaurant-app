import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ChipTone = "warning" | "info" | "success" | "neutral" | "danger";

const tones: Record<ChipTone, string> = {
  warning: "bg-warning-bg text-warning-fg",
  info: "bg-info-bg text-info-fg",
  success: "bg-success-bg text-success-fg",
  neutral: "bg-neutral-bg text-neutral-fg",
  danger: "bg-danger-bg text-danger-fg",
};

type ChipProps = { tone: ChipTone; children: ReactNode; className?: string };

/** Etiqueta de estado con punto indicador (Activo, Agotado, Llamando, etc.). */
export function Chip({ tone, children, className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.25 rounded-xs px-2.25 py-1.5 text-xs leading-[1.2] whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      <span className="size-1.25 shrink-0 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}
