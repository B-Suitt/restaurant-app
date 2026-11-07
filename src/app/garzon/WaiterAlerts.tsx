"use client";

import { useEffect, useRef } from "react";
import { playChime } from "@/lib/shift-alerts";
import { createClient } from "@/lib/supabase/client";
import { useLiveData } from "@/lib/use-live-data";

/** Identificadores de lo que espera al garzón: platos listos y llamados sin atender. */
async function loadPendingIds() {
  const supabase = createClient();
  const [ready, calls] = await Promise.all([
    supabase
      .from("order_items")
      .select("id, orders!inner(table_sessions!inner(status))")
      .eq("status", "listo_para_entregar")
      .eq("orders.table_sessions.status", "open"),
    supabase.from("waiter_calls").select("id").is("attended_at", null),
  ]);
  if (ready.error || calls.error) throw ready.error ?? calls.error;
  return [...ready.data.map((i) => `item-${i.id}`), ...calls.data.map((c) => `call-${c.id}`)];
}

/** Suena en cualquier pantalla del garzón cuando aparece un plato listo o un llamado nuevo. */
export function WaiterAlerts() {
  const { data: ids } = useLiveData("waiter-chime", ["order_items", "waiter_calls"], loadPendingIds);
  const known = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!ids) return;
    const hasNew = known.current !== null && ids.some((id) => !known.current!.has(id));
    known.current = new Set(ids);
    if (hasNew) playChime();
  }, [ids]);

  return null;
}
