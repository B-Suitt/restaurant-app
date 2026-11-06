import { cn } from "@/lib/cn";

/** "En vivo · actualizado ahora" o aviso de reconexión cuando se pierde Realtime. */
export function LiveIndicator({ live, className }: { live: boolean; className?: string }) {
  return (
    <p
      role="status"
      className={cn("flex items-center gap-1.5 text-sm", live ? "text-muted" : "text-primary", className)}
    >
      <span
        className={cn("size-1.75 shrink-0 rounded-full", live ? "bg-success-fg" : "animate-pulse bg-primary")}
        aria-hidden
      />
      {live ? "En vivo · actualizado ahora" : "Sin conexión · reconectando…"}
    </p>
  );
}
