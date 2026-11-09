"use client";

import { useEffect, useRef } from "react";
import { playChime } from "@/lib/shift-alerts";
import { createClient } from "@/lib/supabase/client";
import { useLiveData } from "@/lib/use-live-data";

/** Identificadores de lo que espera al garzón: platos listos, llamados sin atender y mesas por confirmar. */
async function loadPendingIds() {
  const supabase = createClient();
  const [ready, calls, unconfirmed] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, orders!inner(table_sessions!inner(status))")
      .eq("status", "listo_para_entregar")
      .eq("orders.table_sessions.status", "open"),
    supabase.from("waiter_calls").select("id").is("attended_at", null),
    supabase.from("table_sessions").select("id, orders!inner(id)").eq("status", "open").is("confirmed_at", null),
  ]);
  if (ready.error || calls.error || unconfirmed.error) throw ready.error ?? calls.error ?? unconfirmed.error;
  return [
    ...ready.data.map((i) => `item-${i.id}`),
    ...calls.data.map((c) => `call-${c.id}`),
    ...unconfirmed.data.map((s) => `session-${s.id}`),
  ];
}

/** Suena en cualquier pantalla del garzón cuando aparece un plato listo, un llamado o una mesa por confirmar. */
export function WaiterAlerts() {
  const { data: ids } = useLiveData("waiter-chime", ["order_items", "waiter_calls", "orders", "table_sessions"], loadPendingIds);
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!ids) return;
    const hasNew = known.current !== null && ids.some((id) => !known.current!.has(id));
    known.current = new Set(ids);
    if (hasNew) playChime();
  }, [ids]);

  return null;
}
