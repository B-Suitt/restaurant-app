import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string; // sin href: aún no disponible
  active?: boolean;
};

/** Navegación inferior de las vistas móviles. */
export function BottomNav({ items }: { items: NavItem[] }) {
  return (
    <nav className="sticky bottom-0 z-10 flex h-17.5 shrink-0 items-center justify-between border-t border-border bg-surface px-5 pb-2">
      {items.map(({ label, icon: Icon, href, active }) => {
        const content = (
          <>
            <Icon className="size-5.25" aria-hidden />
            <span className={cn("text-2xs", active ? "font-bold" : "font-medium")}>{label}</span>
          </>
        );
        const className = cn(
          "flex w-24 flex-col items-center gap-1",
          active ? "text-primary" : "text-muted",
          !href && "opacity-40",
        );
        return href ? (
          <Link key={label} href={href} className={className} aria-current={active ? "page" : undefined}>
            {content}
          </Link>
        ) : (
          <span key={label} className={className} aria-disabled>
            {content}
          </span>
        );
      })}
    </nav>
  );
}
