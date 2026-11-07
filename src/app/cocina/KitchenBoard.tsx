"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, ChefHat, LogOut, Timer } from "lucide-react";
import { BrandMark } from "@/components/layout/BrandMark";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { ShiftStart } from "@/components/layout/ShiftStart";
import { SignOutButton } from "@/components/layout/SignOutButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardsSkeleton } from "@/components/ui/Skeleton";
import { StatusChip } from "@/components/ui/StatusChip";
import { cn } from "@/lib/cn";
import { extrasText, statusTime, tableLabel } from "@/lib/order-format";
import { KITCHEN_TARGET_MINUTES } from "@/lib/restaurant";
import { errorMessage } from "@/lib/rpc-errors";
import { playChime } from "@/lib/shift-alerts";
import { createClient } from "@/lib/supabase/client";
import { formatAgo, formatClock, formatElapsed } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { useNow } from "@/lib/use-now";

const COLUMNS = ["recibido", "en_preparacion", "listo_para_entregar"] as const;
type KitchenStatus = (typeof COLUMNS)[number];

const NEXT_ACTION: Partial<Record<KitchenStatus, { status: KitchenStatus; label: string }>> = {
  recibido: { status: "en_preparacion", label: "Comenzar preparación" },
  en_preparacion: { status: "listo_para_entregar", label: "Marcar listo para entregar" },
};

/** Minutos en que un plato recién llegado se destaca como NUEVO. */
const NEW_MINUTES = 2;

async function loadItems() {
  const { data, error } = await createClient()
    .from("order_items")
    .select(
      `id, quantity, note, status,
       dishes(name),
       order_item_extras(price, dish_extras(name)),
       order_item_events(status, changed_at),
       orders!inner(number, created_at, table_sessions!inner(status, tables(number)))`,
    )
    .in("status", COLUMNS)
    .eq("orders.table_sessions.status", "open");
  if (error) throw error;
  return data.sort(
    (a, b) => a.orders.created_at.localeCompare(b.orders.created_at) || a.dishes.name.localeCompare(b.dishes.name, "es"),
  );
}

type Item = Awaited<ReturnType<typeof loadItems>>[number];
type Alert = { orderNumber: number; table: number; count: number; at: number };

const dateLabel = new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "2-digit", month: "short" });

// Frame "Cocina · Tablero en vivo"
export function KitchenBoard() {
  const now = useNow();
  const { data: items, live, reload } = useLiveData("kitchen", ["order_items"], loadItems);
  const [alert, setAlert] = useState<Alert | null>(null);

  // Detecta platos nuevos (no presentes en la carga anterior) para la alerta visual y sonora.
  const known = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!items) return;
    const fresh = known.current ? items.filter((i) => i.status === "recibido" && !known.current!.has(i.id)) : [];
    known.current = new Set(items.map((i) => i.id));
    if (fresh.length === 0) return;
    const latest = fresh.at(-1)!;
    setAlert({
      orderNumber: latest.orders.number,
      table: latest.orders.table_sessions.tables.number,
      count: fresh.filter((i) => i.orders.number === latest.orders.number).reduce((s, i) => s + i.quantity, 0),
      at: Date.now(),
    });
    playChime();
  }, [items]);

  const showAlert = alert && now > 0 && now - alert.at < 2 * 60_000;
  const active = items ?? [];

  return (
    <ShiftStart description="Activa la alerta sonora de pedidos nuevos y mantiene la pantalla encendida durante el servicio.">
      <div className="flex min-h-dvh flex-col bg-surface-muted">
        <header className="flex h-20 shrink-0 items-center justify-between gap-6 bg-surface px-7">
          <BrandMark />
          <div className="flex items-center gap-3.5">
            <h1 className="text-[22px] leading-[1.4]">Tablero de cocina</h1>
            <LiveIndicator live={live} />
          </div>
          <div className="flex items-center gap-6">
            <p className="text-md font-semibold first-letter:uppercase">
              {now > 0 && `${dateLabel.format(now).replace(",", "").replace(".", "")} · ${formatClock(new Date(now))}`}
            </p>
            <SignOutButton className="text-ink">
              <LogOut className="size-5" aria-hidden />
            </SignOutButton>
          </div>
        </header>

        <div
          role="status"
          className={cn(
            "flex h-14 shrink-0 items-center gap-3 bg-primary-soft px-7",
            !showAlert && "invisible",
          )}
        >
          <BellRing className="size-5 text-primary" aria-hidden />
          {showAlert && (
            <>
              <p className="flex-1 text-base">
                Nuevo pedido #{alert.orderNumber} · {tableLabel(alert.table)} · {alert.count}{" "}
                {alert.count === 1 ? "plato recibido" : "platos recibidos"}
              </p>
              <p className="text-sm text-primary">{now - alert.at < 60_000 ? "Ahora" : formatAgo(now - alert.at)}</p>
            </>
          )}
        </div>

        <main className="grid flex-1 grid-cols-3 gap-4.5 px-6 pt-5 pb-4">
          {COLUMNS.map((status) => {
            const columnItems = active.filter((i) => i.status === status);
            const count = columnItems.reduce((s, i) => s + i.quantity, 0);
            return (
              <section key={status} className="flex min-w-0 flex-col gap-3" aria-label={status}>
                <div className="flex h-10.5 items-center justify-between">
                  <StatusChip status={status} />
                  <p className="text-md font-bold">
                    {count} {count === 1 ? "plato" : "platos"}
                  </p>
                </div>
                {items === null && <CardsSkeleton count={2} label="Cargando pedidos…" />}
                {items &&
                  columnItems.length === 0 &&
                  (status === "recibido" ? (
                    <EmptyState icon={<ChefHat aria-hidden />} title="Sin pedidos por ahora">
                      Los pedidos nuevos aparecerán aquí con un aviso sonoro.
                    </EmptyState>
                  ) : (
                    <p className="rounded-lg border border-dashed border-border p-6 text-center text-md text-muted">
                      Sin platos
                    </p>
                  ))}
                {columnItems.map((item) => (
                  <KitchenCard key={item.id} item={item} now={now} onChange={reload} />
                ))}
              </section>
            );
          })}
        </main>

        <footer className="flex h-9 shrink-0 items-center justify-between gap-4 px-6.5 text-xs text-muted">
          <p>
            {active.length} platos activos · Objetivo: {KITCHEN_TARGET_MINUTES} min
          </p>
          <p>La entrega al comensal la confirma el garzón.</p>
        </footer>
      </div>
    </ShiftStart>
  );
}

function KitchenCard({ item, now, onChange }: { item: Item; now: number; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = item.status as KitchenStatus;
  const arrived = new Date(item.orders.created_at).getTime();
  const elapsed = now - arrived;
  const isNew = status === "recibido" && elapsed < NEW_MINUTES * 60_000;
  const isLate = status !== "listo_para_entregar" && elapsed > KITCHEN_TARGET_MINUTES * 60_000;
  const readyAt = statusTime(item.order_item_events, "listo_para_entregar");
  const extras = extrasText(item.order_item_extras);
  const action = NEXT_ACTION[status];

  async function advance() {
    if (!action) return;
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("set_item_status", {
      p_item_id: item.id,
      p_status: action.status,
    });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <Card tone={isLate ? "alert" : isNew ? "highlight" : "default"} className="flex flex-col gap-2 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[23px] leading-[1.4]">{tableLabel(item.orders.table_sessions.tables.number)}</p>
        <span
          className={cn(
            "flex items-center gap-1.25 rounded-xs p-1.75 text-sm font-bold tabular-nums",
            isLate ? "bg-primary-soft text-primary" : "bg-surface-muted text-muted",
          )}
          aria-label={`Tiempo desde la llegada: ${formatElapsed(elapsed)}`}
        >
          <Timer className="size-4" aria-hidden />
          {formatElapsed(elapsed)}
        </span>
      </div>
      <p className="text-xs text-muted">
        #{item.orders.number} · Llegada {formatClock(item.orders.created_at)}
        {isNew && " · NUEVO"}
      </p>
      <p className="text-[17px] leading-[1.4]">
        {item.quantity} × {item.dishes.name}
      </p>
      <p className="text-sm text-muted">
        {[extras.length ? extras.join(" · ") : "Sin adicionales", readyAt && `Listo ${formatClock(readyAt)}`]
          .filter(Boolean)
          .join(" · ")}
      </p>
      <p
        className={cn(
          "rounded-xs p-2.25 text-sm",
          item.note ? "bg-warning-bg font-semibold text-ink" : "bg-surface-subtle text-ink",
        )}
      >
        {item.note || "Sin notas"}
      </p>
      {isLate && <p className="text-xs text-primary">Atrasado · Supera el objetivo de {KITCHEN_TARGET_MINUTES} min</p>}
      {error && <p className="text-xs text-primary">{error}</p>}
      {action ? (
        <Button onClick={advance} loading={busy}>
          {action.label}
        </Button>
      ) : (
        <p className="flex h-11.25 items-center justify-center rounded-sm bg-success-bg text-sm text-success-fg">
          Esperando retiro del garzón
        </p>
      )}
    </Card>
  );
}
