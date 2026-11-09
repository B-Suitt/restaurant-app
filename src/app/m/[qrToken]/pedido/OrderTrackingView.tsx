"use client";

import Link from "next/link";
import { ReceiptText, Utensils } from "lucide-react";
import { AppHeader, HeaderIcon } from "@/components/layout/AppHeader";
import { LiveIndicator } from "@/components/layout/LiveIndicator";
import { OrderItemRow } from "@/components/orders/OrderItemRow";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusChip } from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format-price";
import { ORDER_ITEM_STATUSES } from "@/lib/order-status";
import { itemTotal, loadSessionOrders, type SessionOrder } from "@/lib/session-orders";
import { formatClock } from "@/lib/time-format";
import { useLiveData } from "@/lib/use-live-data";
import { ClientNav } from "../ClientNav";
import { WaiterCallActions } from "../WaiterCallActions";
import { tableLabel, useClientSession } from "../ClientSessionProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardsSkeleton } from "@/components/ui/Skeleton";

// Frame "Cliente · Seguimiento"
export function OrderTrackingView() {
  const { basePath, sessionId, tableNumber, guestCount } = useClientSession();
  const { data: orders, live, reload } = useLiveData(`client-${sessionId}`, ["orders", "order_items"], () =>
    loadSessionOrders(sessionId),
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
          <CardsSkeleton count={2} label="Cargando pedidos…" />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<ReceiptText aria-hidden />}
            title="Aún no hay pedidos"
            action={
              <Link href={`${basePath}/menu`} className={buttonClasses({ className: "px-6" })}>
                Ver menú
              </Link>
            }
          >
            Cuando envíes tu pedido, aquí verás cómo avanza cada plato.
          </EmptyState>
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
        <WaiterCallActions />
        <p className="text-center text-xs text-muted">El pago se realiza directamente en el restaurante.</p>
      </main>
      <ClientNav active="pedido" />
    </>
  );
}

function OrderCard({ order, tableNumber, onChange }: { order: SessionOrder; tableNumber: number; onChange: () => void }) {
  const { rpcError } = useClientSession();
  const active = order.order_items.filter((i) => i.status !== "cancelado");
  const count = active.reduce((sum, i) => sum + i.quantity, 0);
  const total = active.reduce((sum, i) => sum + itemTotal(i), 0);

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
          <OrderItemRow
            key={item.id}
            item={item}
            confirmText={`¿Cancelar ${item.dishes.name}?`}
            toMessage={rpcError}
            onChange={onChange}
          />
        ))}
      </ul>
    </Card>
  );
}
