import type { ChipTone } from "@/components/ui/Chip";

/** Estados de un ítem del pedido, en orden. Ver docs/04-flujo-de-estados.md */
export const ORDER_ITEM_STATUSES = [
  "recibido",
  "en_preparacion",
  "listo_para_entregar",
  "entregado",
  "cancelado",
] as const;

export type OrderItemStatus = (typeof ORDER_ITEM_STATUSES)[number];

/** Etiqueta y color de cada estado; la única fuente para que se vean igual en todas las vistas. */
export const ORDER_ITEM_STATUS_DISPLAY: Record<
  OrderItemStatus,
  { label: string; tone: ChipTone }
> = {
  recibido: { label: "Recibido", tone: "warning" },
  en_preparacion: { label: "En preparación", tone: "info" },
  listo_para_entregar: { label: "Listo para entregar", tone: "success" },
  entregado: { label: "Entregado", tone: "neutral" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

/** Estado de un pedido completo: el de su plato menos avanzado, sin contar cancelados. */
export function orderStatusOf(items: { status: string }[]): OrderItemStatus {
  const active = items.filter((i) => i.status !== "cancelado");
  if (active.length === 0) return "cancelado";
  return active.reduce<OrderItemStatus>((least, i) => {
    const s = i.status as OrderItemStatus;
    return ORDER_ITEM_STATUSES.indexOf(s) < ORDER_ITEM_STATUSES.indexOf(least) ? s : least;
  }, "entregado");
}
