import { cn } from "@/lib/cn";

/**
 * "En vivo · actualizado ahora", "Conectando…" al abrir la vista,
 * o aviso de reconexión cuando se pierde Realtime.
 */
export function LiveIndicator({ live, className }: { live: boolean | null; className?: string }) {
  if (live === null) {
    return (
      <p role="status" className={cn("flex items-center gap-1.5 text-sm text-muted", className)}>
        <span className="size-1.75 shrink-0 rounded-full bg-subtle motion-safe:animate-pulse" aria-hidden />
        Conectando…
      </p>
    );
  }
  return (
    <p
      role="status"
      className={cn("flex items-center gap-1.5 text-sm", live ? "text-muted" : "text-primary", className)}
    >
      <span
        className={cn("size-1.75 shrink-0 rounded-full", live ? "bg-success-fg" : "bg-primary motion-safe:animate-pulse")}
        aria-hidden
      />
      {live ? "En vivo · actualizado ahora" : "Sin conexión · reconectando…"}
    </p>
  );
}
