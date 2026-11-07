"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, ChartNoAxesCombined, History, Layers, QrCode, Users, Utensils, type LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { cn } from "@/lib/cn";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { useProfileName } from "@/lib/use-profile";

const NAV: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Panel general", href: "/admin", icon: ChartNoAxesCombined },
  { label: "Mesas y QR", href: "/admin/mesas", icon: QrCode },
  { label: "Menú", href: "/admin/menu", icon: Utensils },
  { label: "Categorías", href: "/admin/categorias", icon: Layers },
  { label: "Usuarios y roles", href: "/admin/usuarios", icon: Users },
  { label: "Historial de pedidos", href: "/admin/historial", icon: History },
];

/** Menú lateral del administrador (Figma: 232 px). */
export function AdminSidebar() {
  const pathname = usePathname();
  const name = useProfileName();

  return (
    // Alto de la ventana y scroll propio: en pantallas bajas el final ("Cerrar sesión") no puede quedar cortado.
    <aside className="sticky top-0 flex h-dvh w-58 shrink-0 flex-col gap-6 overflow-y-auto overscroll-contain border-r border-border bg-surface px-4.5 py-7 print:hidden">
      <BrandMark />
      <nav className="flex flex-col gap-2" aria-label="Administración">
        <p className="px-0 pb-1 text-2xs uppercase text-muted">Administración</p>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-12 items-center gap-2.5 rounded-md px-3 text-base transition-colors",
                active ? "bg-primary-soft text-primary" : "text-ink/80 hover:bg-surface-muted",
              )}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1.5 rounded-md bg-surface-muted p-3.5">
        <p className="text-base">{RESTAURANT_NAME}</p>
        <p className="text-sm text-muted">Un local · Servicio en curso</p>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-5">
        <p className="text-base">{name ?? " "}</p>
        <p className="text-sm text-muted">Administración</p>
        <SignOutButton className="flex w-fit items-center gap-1 text-sm text-muted hover:text-ink">
          Cerrar sesión <ArrowUpRight className="size-3.5" aria-hidden />
        </SignOutButton>
      </div>
    </aside>
  );
}
