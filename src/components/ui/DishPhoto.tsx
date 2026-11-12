import { Utensils } from "lucide-react";
import { cn } from "@/lib/cn";

type DishPhotoProps = {
  src: string | null;
  alt: string;
  className?: string;
  /** Tamaño en px del recuadro: reserva el espacio antes de que cargue la foto. */
  width: number;
  height: number;
  /** Foto visible al abrir la pantalla: se pide primero en vez de esperar al scroll. */
  priority?: boolean;
};

/** Foto del plato o un recuadro gris con icono si no tiene. */
export function DishPhoto({ src, alt, className, width, height, priority = false }: DishPhotoProps) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg bg-surface-muted text-subtle", className)}>
        <Utensils className="size-6" aria-hidden />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- fotos de Storage con tamaños variables
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      decoding="async"
      className={cn("rounded-lg object-cover", className)}
    />
  );
}
