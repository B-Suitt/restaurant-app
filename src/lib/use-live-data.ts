"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LiveTable = "order_items" | "orders" | "waiter_calls" | "table_sessions";

/**
 * Carga datos y los vuelve a cargar ante cualquier cambio en las tablas indicadas.
 * Realtime solo entrega las filas que RLS permite leer.
 *
 * - Carga recién cuando el canal queda SUBSCRIBED: cambios hechos antes se perderían.
 * - Al reconectar vuelve a cargar, porque Realtime no reenvía lo ocurrido sin conexión.
 */
export function useLiveData<T>(
  channelName: string,
  tables: LiveTable[],
  load: () => Promise<T>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  // La función de carga más reciente, sin re-suscribir en cada render.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const reload = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "error");
    }
  }, []);

  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Agrupa ráfagas de cambios (p. ej. un pedido con varios platos) en una sola recarga.
    const scheduleReload = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 150);
    };

    let channel = supabase.channel(channelName);
    for (const table of tablesKey.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleReload);
    }
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        setLive(true);
        reload();
      } else {
        setLive(false);
      }
    });

    window.addEventListener("online", scheduleReload);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", scheduleReload);
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, enabled, reload]);

  return { data, error, live, reload };
}
