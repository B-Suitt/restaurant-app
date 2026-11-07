"use client";

import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { RESTAURANT_NAME } from "@/lib/restaurant";
import { createClient } from "@/lib/supabase/client";
import { useLiveData } from "@/lib/use-live-data";
import { useProfileName } from "@/lib/use-profile";

type Crumb = { label: string; href?: string };

/** Barra superior del administrador: ruta de navegación, estado en vivo y usuario. */
export function AdminTopBar({ crumbs, live }: { crumbs: Crumb[]; live?: boolean | null }) {
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
        <PendingBell />
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

/** Mesas que llaman o piden la cuenta ahora (llamados sin atender de sesiones abiertas). */
async function loadPendingTables() {
  const { data, error } = await createClient()
    .from("waiter_calls")
    .select("session_id, table_sessions!inner(status)")
    .is("attended_at", null)
    .eq("table_sessions.status", "open");
  if (error) throw error;
  return new Set(data.map((c) => c.session_id)).size;
}

/** Campana con el número de mesas que esperan atención; lleva al panel general. */
function PendingBell() {
  const { data: count } = useLiveData("admin-bell", ["waiter_calls", "table_sessions"], loadPendingTables);
  const label = count
    ? `${count} ${count === 1 ? "mesa espera" : "mesas esperan"} atención`
    : "Sin solicitudes pendientes";
  return (
    <Link href="/admin" aria-label={label} title={label} className="relative text-ink hover:text-primary">
      <Bell className="size-5" aria-hidden />
      {!!count && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-2xs leading-none text-white tabular-nums">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
