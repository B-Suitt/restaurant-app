import type { ChipTone } from "@/components/ui/Chip";
import { TABLE_IDLE_MINUTES } from "@/lib/restaurant";

export type TableStatus = "libre" | "por_confirmar" | "ocupada" | "llamando" | "pidiendo_cuenta";

/** Etiqueta y color de cada estado de mesa; iguales en todas las vistas (según Figma). */
export const TABLE_STATUS_DISPLAY: Record<TableStatus, { label: string; tone: ChipTone }> = {
  libre: { label: "Libre", tone: "success" },
  por_confirmar: { label: "Por confirmar", tone: "danger" },
  ocupada: { label: "Ocupada", tone: "info" },
  llamando: { label: "Llamando", tone: "warning" },
  pidiendo_cuenta: { label: "Pidiendo la cuenta", tone: "accent" },
};

/**
 * Estado de una mesa según su sesión abierta, sus pedidos y sus llamados pendientes.
 * La cuenta pesa más que un llamado. Escanear el QR crea la sesión, pero la mesa
 * sigue libre hasta el primer pedido o llamado.
 */
export function tableStatus(
  session:
    | { confirmed_at: string | null; waiter_calls: { type: string; attended_at: string | null }[]; orders: unknown[] }
    | null
    | undefined,
): TableStatus {
  if (!session) return "libre";
  const pending = session.waiter_calls.filter((c) => c.attended_at === null);
  if (pending.some((c) => c.type === "bill")) return "pidiendo_cuenta";
  if (pending.some((c) => c.type === "call")) return "llamando";
  if (session.orders.length === 0) return "libre";
  return session.confirmed_at ? "ocupada" : "por_confirmar";
}

/** Momento en que una mesa con pedidos pasa a estar sin actividad (sin pedidos ni llamados nuevos). */
export function idleSince(session: { orders: { created_at: string }[]; waiter_calls: { created_at: string }[] }) {
  if (session.orders.length === 0) return null;
  const last = Math.max(...[...session.orders, ...session.waiter_calls].map((e) => new Date(e.created_at).getTime()));
  return last + TABLE_IDLE_MINUTES * 60_000;
}

/** Desde cuándo corre el tiempo de cocina: un pedido en espera de confirmación aún no le ha llegado. */
export function kitchenStartTime(receivedAt: string, confirmedAt: string | null) {
  return Math.max(new Date(receivedAt).getTime(), confirmedAt ? new Date(confirmedAt).getTime() : 0);
}
