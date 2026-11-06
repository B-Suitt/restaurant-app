import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/** Recuadro gris con icono de información, título y texto. */
export function InfoNote({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-3 rounded-md bg-surface-muted p-4", className)}>
      <Info className="size-4.5 shrink-0 text-ink" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-md text-ink">{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}
