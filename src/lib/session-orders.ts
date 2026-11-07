import { createClient } from "@/lib/supabase/client";

/** Pedidos de una sesión con sus ítems y adicionales (más recientes primero). */
export async function loadSessionOrders(sessionId: string) {
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

export type SessionOrder = Awaited<ReturnType<typeof loadSessionOrders>>[number];
export type SessionOrderItem = SessionOrder["order_items"][number];

type PricedItem = { quantity: number; unit_price: number; status: string; order_item_extras: { price: number }[] };

/** Valor de un ítem con sus adicionales. */
export function itemTotal(item: PricedItem) {
  return (item.unit_price + item.order_item_extras.reduce((sum, e) => sum + e.price, 0)) * item.quantity;
}

/** Consumo de la sesión: suma todas las rondas sin los ítems cancelados. */
export function sessionTotal(orders: { order_items: PricedItem[] }[]) {
  return orders
    .flatMap((o) => o.order_items)
    .filter((i) => i.status !== "cancelado")
    .reduce((sum, i) => sum + itemTotal(i), 0);
}

/** IVA (19 %) contenido en un precio que ya lo incluye. */
export function includedVat(total: number) {
  return Math.round((total * 19) / 119);
}
