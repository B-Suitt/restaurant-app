import { Utensils } from "lucide-react";
import { APP_NAME } from "@/lib/restaurant";
import { cn } from "@/lib/cn";

/** Emblema rojo + nombre del producto. */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.25", className)}>
      <span className="flex size-7.5 items-center justify-center rounded-sm bg-primary text-white">
        <Utensils className="size-4.5" aria-hidden />
      </span>
      <span className={cn("text-lg tracking-[-0.6px]", inverted ? "text-white" : "text-ink")}>{APP_NAME}</span>
    </div>
  );
}
