"use client";

import Link from "next/link";
import { useState } from "react";
import { Armchair } from "lucide-react";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { Chip } from "@/components/ui/Chip";
import { FilterTabs } from "@/components/ui/FilterTabs";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format-price";
import { sessionTotal } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { idleSince, TABLE_STATUS_DISPLAY, tableStatus } from "@/lib/table-status";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";
import { useProfileName } from "@/lib/use-profile";
import { WaiterHeader } from "./WaiterHeader";
import { WaiterNav } from "./WaiterNav";
import { EmptyState } from "@/components/ui/EmptyState";
import { TileGridSkeleton } from "@/components/ui/Skeleton";

async function loadTables() {
  const supabase = createClient();
  const [tables, sessions] = await Promise.all([
    supabase.from("tables").select("id, number, capacity, zone").eq("active", true).order("number"),
    supabase
      .from("table_sessions")
      .select(
        "id, table_id, confirmed_at, waiter_calls(type, attended_at, created_at), orders(created_at, order_items(quantity, unit_price, status, order_item_extras(price)))",
      )
      .eq("status", "open"),
  ]);
  if (tables.error || sessions.error) throw tables.error ?? sessions.error;
  const byTable = new Map(sessions.data.map((s) => [s.table_id, s]));
  return tables.data.map((table) => {
    const session = byTable.get(table.id);
    return {
      ...table,
      status: tableStatus(session),
      idleAt: session ? idleSince(session) : null,
      total: session ? sessionTotal(session.orders) : 0,
    };
  });
}

type TableRow = Awaited<ReturnType<typeof loadTables>>[number];

// Frame "Garzón · Mesas"
export function TablesGrid() {
  const name = useProfileName();
  const now = useNow(60_000);
  const [zone, setZone] = useState<string | null>(null);
  const { data: tables, live } = useLiveData(
    "waiter-tables",
    ["table_sessions", "waiter_calls", "orders", "order_items"],
    loadTables,
  );

  const zones = [...new Set(tables?.map((t) => t.zone))];
  const visible = tables?.filter((t) => !zone || t.zone === zone) ?? [];
  const occupied = tables?.filter((t) => t.status !== "libre").length ?? 0;
  const pending =
    tables?.filter((t) => t.status === "llamando" || t.status === "pidiendo_cuenta" || t.status === "por_confirmar").length ?? 0;

  return (
    <>
      <WaiterHeader
        title={name ? `Hola, ${name.split(" ")[0]}` : "Mesas"}
        subtitle={now ? `Turno en curso · ${formatClock(new Date(now))}` : "Turno en curso"}
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <LiveIndicator live={live} />

        <dl className="grid grid-cols-3 gap-3">
          <Stat value={occupied} label="Mesas ocupadas" />
          <Stat value={(tables?.length ?? 0) - occupied} label="Mesas libres" />
          <Stat value={pending} label="Por atender" highlight={pending > 0} />
        </dl>

        {zones.length > 1 && (
          <FilterTabs
            label="Zonas"
            value={zone}
            onChange={setZone}
            options={[{ value: null, label: "Todas" }, ...zones.map((z) => ({ value: z, label: z }))]}
          />
        )}

        {tables === null ? (
          <TileGridSkeleton />
        ) : tables.length === 0 ? (
          <EmptyState icon={<Armchair aria-hidden />} title="No hay mesas activas">
            El administrador puede agregar o activar mesas desde su panel.
          </EmptyState>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2.5">
              {visible.map((table) => (
                <TableCard key={table.id} table={table} now={now} />
              ))}
            </ul>
            {zone && (
              <p className="text-sm text-muted">
                Mostrando {visible.length} de {tables.length} mesas
              </p>
            )}
          </>
        )}
      </main>
      <WaiterNav active="mesas" />
    </>
  );
}

function Stat({ value, label, highlight = false }: { value: number; label: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("text-[29px] leading-[1.2] tabular-nums", highlight && "text-primary")}>
        {String(value).padStart(2, "0")}
      </dd>
    </div>
  );
}

function TableCard({ table, now }: { table: TableRow; now: number }) {
  const { label, tone } = TABLE_STATUS_DISPLAY[table.status];
  const idle = now > 0 && table.status === "ocupada" && table.idleAt !== null && table.idleAt <= now;
  const detail =
    table.status === "libre" ? `${table.capacity} lugares` : `${formatPrice(table.total)}${idle ? " · Sin actividad" : ""}`;

  return (
    <li>
      <Link
        href={`/garzon/mesas/${table.id}`}
        className="flex h-full flex-col gap-2.5 rounded-lg border border-border bg-surface p-3.5 transition-colors hover:border-ink"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[23px] leading-[1.2] tabular-nums">{String(table.number).padStart(2, "0")}</p>
          <Armchair className="size-4.5 text-muted" aria-hidden />
        </div>
        <Chip tone={tone}>{label}</Chip>
        <p className="text-xs text-muted">{detail}</p>
      </Link>
    </li>
  );
}
