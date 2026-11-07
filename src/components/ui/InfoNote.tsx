import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Icono de información, título y texto.
 * `plain`: sin fondo (notas al pie de las vistas de administrador).
 */
export function InfoNote({
  title,
  children,
  className,
  plain = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  plain?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3", plain ? "px-4" : "rounded-md bg-surface-muted p-4", className)}>
      <Info className="size-4.5 shrink-0 text-ink" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="text-md text-ink">{title}</p>
        <p className="text-sm text-muted">{children}</p>
      </div>
    </div>
  );
}
