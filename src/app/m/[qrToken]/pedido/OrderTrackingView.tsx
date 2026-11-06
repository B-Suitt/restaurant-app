"use client";

import Link from "next/link";
import { useState } from "react";
import { Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format-price";
import { ORDER_ITEM_STATUSES, type OrderItemStatus } from "@/lib/order-status";
import { errorMessage } from "@/lib/rpc-errors";
import { createClient } from "@/lib/supabase/client";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { ClientNav } from "../ClientNav";
import { tableLabel, useClientSession } from "../ClientSessionProvider";

async function loadOrders(sessionId: string) {
  const { data, error } = await createClient()
    .from("orders")
    .select(
      "id, number, created_at, order_items(id, quantity, note, unit_price, status, dishes(name), order_item_extras(price, dish_extras(name)))",
    )
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // Orden estable dentro de cada pedido (la base devuelve primero las filas sin cambios).
  for (const order of data) order.order_items.sort((a, b) => a.dishes.name.localeCompare(b.dishes.name, "es"));
  return data;
}

type Order = Awaited<ReturnType<typeof loadOrders>>[number];

// Frame "Cliente · Seguimiento"
export function OrderTrackingView() {
  const { basePath, sessionId, tableNumber, guestCount } = useClientSession();
  const { data: orders, live, reload } = useLiveData(`client-${sessionId}`, ["orders", "order_items"], () =>
    loadOrders(sessionId),
  );

  return (
    <>
      <AppHeader
        title="Pedidos de la mesa"
        subtitle={[tableLabel(tableNumber), guestCount && `${guestCount} personas`].filter(Boolean).join(" · ")}
        backHref={`${basePath}/menu`}
        action={
          <HeaderIcon>
            <Utensils aria-hidden />
          </HeaderIcon>
        }
      />
      <main className="flex flex-1 flex-col gap-4.5 p-5">
        <LiveIndicator live={live} />
        <h2 className="text-[27px] leading-[1.4]">Tu pedido, paso a paso.</h2>
        <p className="text-base text-muted">Aquí verás el estado de cada plato de la mesa.</p>

        {orders === null ? (
          <p className="py-6 text-center text-base text-muted">Cargando pedidos…</p>
        ) : orders.length === 0 ? (
          <Card className="flex flex-col gap-2 text-center">
            <p className="text-lg font-bold">Aún no hay pedidos</p>
            <p className="text-sm text-muted">Cuando envíes tu pedido, aquí verás cómo avanza cada plato.</p>
          </Card>
        ) : (
          orders.map((order) => <OrderCard key={order.id} order={order} tableNumber={tableNumber} onChange={reload} />)
        )}

        <div className="flex flex-col gap-2.25">
          <p className="text-sm">Así avanza tu pedido</p>
          <div className="flex flex-wrap gap-1.5">
            {ORDER_ITEM_STATUSES.filter((s) => s !== "cancelado").map((s) => (
              <StatusChip key={s} status={s} />
            ))}
          </div>
        </div>

        <Link href={`${basePath}/menu`} className={buttonClasses({ variant: "secondary" })}>
          Agregar algo más
        </Link>
        <p className="text-center text-xs text-muted">El pago se realiza directamente en el restaurante.</p>
      </main>
      <ClientNav active="pedido" />
    </>
  );
}

function OrderCard({ order, tableNumber, onChange }: { order: Order; tableNumber: number; onChange: () => void }) {
  const active = order.order_items.filter((i) => i.status !== "cancelado");
  const count = active.reduce((sum, i) => sum + i.quantity, 0);
  const total = active.reduce(
    (sum, i) => sum + (i.unit_price + i.order_item_extras.reduce((s, e) => s + e.price, 0)) * i.quantity,
    0,
  );

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-bold">Pedido #{order.number}</p>
        <p className="text-sm text-muted">{formatClock(order.created_at)} · Hoy</p>
      </div>
      <p className="text-sm text-muted">
        {tableLabel(tableNumber)} ·{" "}
        {count === 0 ? "Pedido cancelado" : `${count} ${count === 1 ? "producto" : "productos"} · ${formatPrice(total)}`}
      </p>
      <ul className="flex flex-col gap-4">
        {order.order_items.map((item) => (
          <OrderItemRow key={item.id} item={item} onChange={onChange} />
        ))}
      </ul>
    </Card>
  );
}

function OrderItemRow({ item, onChange }: { item: Order["order_items"][number]; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const details = [
    ...item.order_item_extras.map((e) => (e.price > 0 ? `${e.dish_extras.name} +${formatPrice(e.price)}` : e.dish_extras.name)),
    item.note,
  ].filter(Boolean);

  async function cancel() {
    if (!window.confirm(`¿Cancelar ${item.dishes.name}?`)) return;
    setBusy(true);
    const { error: rpcError } = await createClient().rpc("set_item_status", { p_item_id: item.id, p_status: "cancelado" });
    setBusy(false);
    setError(rpcError ? errorMessage(rpcError) : null);
    onChange();
  }

  return (
    <li className="flex flex-col gap-2.25 border-b border-border pb-4">
      <p className={item.status === "cancelado" ? "text-base text-muted line-through" : "text-base"}>
        {item.quantity} × {item.dishes.name}
      </p>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <div className="flex items-center justify-between gap-3">
        <StatusChip status={item.status as OrderItemStatus} />
        {/* Solo se puede cancelar mientras el plato está en Recibido. */}
        {item.status === "recibido" && (
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="cursor-pointer text-sm text-primary hover:underline disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
      {error && <p className="text-sm text-primary">{error}</p>}
    </li>
  );
}
