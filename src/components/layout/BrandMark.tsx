import Image from "next/image";
import { APP_NAME } from "@/lib/restaurant";
import { cn } from "@/lib/cn";

/** Emblema rojo + nombre del producto. */
export function BrandMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.25", className)}>
      <Image src="/emblema.png" alt="" width={30} height={30} className="size-7.5" />
      <span className={cn("text-lg tracking-[-0.6px]", inverted ? "text-white" : "text-ink")}>{APP_NAME}</span>
    </div>
  );
}
