import { Utensils } from "lucide-react";
import { cn } from "@/lib/cn";

/** Foto del plato o un recuadro gris con icono si no tiene. */
export function DishPhoto({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={cn("flex items-center justify-center rounded-lg bg-surface-muted text-subtle", className)}>
        <Utensils className="size-6" aria-hidden />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element -- fotos de Storage con tamaños variables
  return <img src={src} alt={alt} className={cn("rounded-lg object-cover", className)} />;
}
