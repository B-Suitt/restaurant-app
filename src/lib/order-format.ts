import { formatPrice } from "@/lib/format-price";

type ExtraRow = { price: number; dish_extras: { name: string } };

/** "Extra cheddar +$1.000"; solo el nombre si es gratis. */
export function extraLabel(name: string, price: number) {
  return price > 0 ? `${name} +${formatPrice(price)}` : name;
}

/** Texto de cada adicional de un pedido. */
export function extrasText(extras: ExtraRow[]): string[] {
  return extras.map((e) => extraLabel(e.dish_extras.name, e.price));
}

/** "Mesa 08" */
export function tableLabel(number: number) {
  return `Mesa ${String(number).padStart(2, "0")}`;
}

/** Hora en que el ítem entró a un estado, según su historial. */
export function statusTime(events: { status: string; changed_at: string }[], status: string): string | null {
  return events.filter((e) => e.status === status).at(-1)?.changed_at ?? null;
}
