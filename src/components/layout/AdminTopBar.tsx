"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { useProfileName } from "@/lib/use-profile";

type Crumb = { label: string; href?: string };

/** Barra superior del administrador: ruta de navegación, estado en vivo y usuario. */
export function AdminTopBar({ crumbs, live }: { crumbs: Crumb[]; live?: boolean }) {
  const name = useProfileName();
  const initials = name
    ?.split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <header className="sticky top-0 z-10 flex h-19 shrink-0 items-center justify-between gap-4 print:hidden border-b border-border bg-surface px-9">
      <nav aria-label="Ruta" className="flex items-center gap-2 text-base text-muted">
        {[{ label: RESTAURANT_NAME, href: "/admin" }, ...crumbs].map((crumb, i, all) => (
          <Fragment key={i}>
            {i > 0 && <span aria-hidden>/</span>}
            {crumb.href && i < all.length - 1 ? (
              <Link href={crumb.href} className="hover:text-ink">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current={i === all.length - 1 ? "page" : undefined}>{crumb.label}</span>
            )}
          </Fragment>
        ))}
      </nav>
      <div className="flex items-center gap-5">
        {live !== undefined && <LiveIndicator live={live} />}
        <Bell className="size-5 text-ink" aria-hidden />
        <span
          className="flex size-8 items-center justify-center rounded-full bg-ink text-xs text-white"
          aria-label={name ?? undefined}
        >
          {initials}
        </span>
      </div>
    </header>
  );
}

/** Título y bajada de cada página del administrador. */
export function AdminPageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl">{title}</h1>
        {subtitle && <p className="text-lg text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
