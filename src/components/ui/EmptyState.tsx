import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  /** Icono de Lucide; se muestra en un recuadro rojo suave, como en los modales. */
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  /** Botón o enlace opcional ("Ver menú", "Agregar mesa"…). */
  action?: ReactNode;
  className?: string;
};

/** Estado vacío (no está en Figma): mismo lenguaje que los modales y las notas. */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary [&_svg]:size-6">
        {icon}
      </span>
      <p className="text-lg font-bold">{title}</p>
      {children && <p className="max-w-80 text-sm text-muted">{children}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
