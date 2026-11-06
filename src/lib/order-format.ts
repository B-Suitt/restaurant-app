import { formatPrice } from "@/lib/format-price";

type ExtraRow = { price: number; dish_extras: { name: string } };

/** "Extra cheddar +$1.000" por cada adicional. */
export function extrasText(extras: ExtraRow[]): string[] {
  return extras.map((e) => (e.price > 0 ? `${e.dish_extras.name} +${formatPrice(e.price)}` : e.dish_extras.name));
}

/** "Mesa 08" */
export function tableLabel(number: number) {
  return `Mesa ${String(number).padStart(2, "0")}`;
}

/** Hora en que el ítem entró a un estado, según su historial. */
export function statusTime(events: { status: string; changed_at: string }[], status: string): string | null {
  return events.filter((e) => e.status === status).at(-1)?.changed_at ?? null;
}
