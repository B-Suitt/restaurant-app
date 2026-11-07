import type { ChipTone } from "@/components/ui/Chip";

export type TableStatus = "libre" | "ocupada" | "llamando" | "pidiendo_cuenta";

/** Etiqueta y color de cada estado de mesa; iguales en todas las vistas (según Figma). */
export const TABLE_STATUS_DISPLAY: Record<TableStatus, { label: string; tone: ChipTone }> = {
  libre: { label: "Libre", tone: "success" },
  ocupada: { label: "Ocupada", tone: "info" },
  llamando: { label: "Llamando", tone: "warning" },
  pidiendo_cuenta: { label: "Pidiendo la cuenta", tone: "accent" },
};

/** Estado de una mesa según su sesión abierta y sus llamados pendientes. La cuenta pesa más que un llamado. */
export function tableStatus(
  session: { waiter_calls: { type: string; attended_at: string | null }[] } | null | undefined,
): TableStatus {
  if (!session) return "libre";
  const pending = session.waiter_calls.filter((c) => c.attended_at === null);
  if (pending.some((c) => c.type === "bill")) return "pidiendo_cuenta";
  if (pending.some((c) => c.type === "call")) return "llamando";
  return "ocupada";
}
