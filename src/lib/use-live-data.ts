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
 * - `live` es null mientras se conecta por primera vez, para no mostrar "Sin conexión" al abrir la vista.
 */
export function useLiveData<T>(
  channelName: string,
  tables: LiveTable[],
  load: () => Promise<T>,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  // null: conectando por primera vez · true: en vivo · false: se perdió la conexión.
  const [live, setLive] = useState<boolean | null>(null);

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
        // Solo es "sin conexión" si ya había estado en vivo o si el canal falló.
        setLive((current) => (current === null && status !== "CHANNEL_ERROR" && status !== "TIMED_OUT" ? null : false));
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
