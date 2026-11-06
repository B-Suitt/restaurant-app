import { Chip } from "@/components/ui/Chip";
import { ORDER_ITEM_STATUS_DISPLAY, type OrderItemStatus } from "@/lib/order-status";

/** Chip del estado de un plato; mismo color y etiqueta en todas las vistas. */
export function StatusChip({ status, className }: { status: OrderItemStatus; className?: string }) {
  const { label, tone } = ORDER_ITEM_STATUS_DISPLAY[status];
  return (
    <Chip tone={tone} className={className}>
      {label}
    </Chip>
  );
}
