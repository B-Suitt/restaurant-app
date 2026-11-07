import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Bloque gris que pulsa mientras carga (sin animación si la persona pidió menos movimiento). */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("rounded-md bg-surface-muted motion-safe:animate-pulse", className)} aria-hidden />;
}

/** Envoltorio accesible: anuncia la carga una sola vez y oculta los bloques. */
function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Tarjetas de las vistas móviles (pedidos, despachos, avisos). */
export function CardsSkeleton({ count = 3, label = "Cargando…" }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-4.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-28 rounded-xs" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </Loading>
  );
}

/** Lista de platos con foto (carta del garzón). */
export function DishListSkeleton({ count = 4, label = "Cargando carta…" }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-3.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-21.5 shrink-0 rounded-lg" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** Grilla de mesas del garzón. */
export function TileGridSkeleton({ count = 8, label = "Cargando mesas…" }: { count?: number; label?: string }) {
  return (
    <Loading label={label} className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5">
          <Skeleton className="h-7 w-10" />
          <Skeleton className="h-6 w-20 rounded-xs" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      ))}
    </Loading>
  );
}

/** Tabla del administrador. */
export function TableSkeleton({ rows = 6, cols = 5, label = "Cargando…" }: { rows?: number; cols?: number; label?: string }) {
  return (
    <Loading label={label} className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex h-12 items-center gap-6 bg-surface-subtle px-5">
        {Array.from({ length: cols }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-border/60" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-17.5 items-center gap-6 border-t border-border px-5">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-40")} />
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** Formulario del administrador: tarjeta principal y columna lateral. */
export function FormSkeleton({ label = "Cargando…" }: { label?: string }) {
  return (
    <Loading label={label} className="grid grid-cols-[1fr_390px] items-start gap-6">
      <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-7">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 gap-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-24" />
      </div>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="aspect-[4/3] w-full" />
        <Skeleton className="h-12" />
      </div>
    </Loading>
  );
}

/** Fila de métricas del administrador. */
export function StatsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className={cn("grid gap-4", count === 4 ? "grid-cols-2 xl:grid-cols-4" : "grid-cols-3")} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      ))}
    </div>
  );
}
