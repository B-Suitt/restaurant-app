"use client";

import { StatusChip } from "@/components/ui/StatusChip";
import { formatPrice } from "@/lib/format-price";
import { extrasText } from "@/lib/order-format";
import type { OrderItemStatus } from "@/lib/order-status";
import type { SessionOrderItem } from "@/lib/session-orders";
import { createClient } from "@/lib/supabase/client";
import { useRowAction } from "@/lib/use-row-action";

type OrderItemRowProps = {
  item: SessionOrderItem;
  confirmText: string;
  /** Muestra "$X c/u" cuando hay más de una unidad. */
  showUnitPrice?: boolean;
  toMessage?: (error: { message?: string }) => string;
  onChange: () => void;
};

/** Plato de un pedido con su estado; se puede cancelar mientras está en Recibido. */
export function OrderItemRow({ item, confirmText, showUnitPrice = false, toMessage, onChange }: OrderItemRowProps) {
  const { busy, error, run } = useRowAction(onChange, toMessage);
  const details = [
    ...extrasText(item.order_item_extras),
    item.note,
    showUnitPrice && item.quantity > 1 ? `${formatPrice(item.unit_price)} c/u` : "",
  ].filter(Boolean);

  function cancel() {
    if (!window.confirm(confirmText)) return;
    run(() => createClient().rpc("set_item_status", { p_item_id: item.id, p_status: "cancelado" }));
  }

  return (
    <li className="flex flex-col gap-2.25 border-b border-border pb-4">
      <p className={item.status === "cancelado" ? "text-base text-muted line-through" : "text-base"}>
        {item.quantity} × {item.dishes.name}
      </p>
      {details.length > 0 && <p className="text-sm text-muted">{details.join(" · ")}</p>}
      <div className="flex items-center justify-between gap-3">
        <StatusChip status={item.status as OrderItemStatus} />
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
