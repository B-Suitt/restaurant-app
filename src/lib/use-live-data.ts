"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type LiveTable = "order_items" | "orders" | "waiter_calls" | "table_sessions";

let mounts = 0;

/**
 * Carga datos y los vuelve a cargar ante cualquier cambio en las tablas indicadas.
 * Realtime solo entrega las filas que RLS permite leer.
 *
 * - Carga recién cuando el canal queda SUBSCRIBED, y otra vez cuando Realtime ya escucha la base.
 * - Al reconectar vuelve a cargar, porque Realtime no reenvía lo ocurrido sin conexión.
 * - `live` es null mientras se conecta por primera vez, para no mostrar "Sin conexión" al abrir la vista.
 * - Sin tablas no escucha cambios: solo carga (y recarga con `reload`).
 */
export function useLiveData<T>(
  channelName: string,
  tables: LiveTable[],
  load: () => Promise<T>,
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

  // Si dos cargas se cruzan, solo vale la última pedida (p. ej. tras cambiar un filtro).
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const request = ++latest.current;
    try {
      const result = await loadRef.current();
      if (request !== latest.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (request !== latest.current) return;
      setError(e instanceof Error ? e.message : "error");
    }
  }, []);

  const tablesKey = tables.join(",");

  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Agrupa ráfagas de cambios (p. ej. un pedido con varios platos) en una sola recarga.
    const scheduleReload = () => {
      clearTimeout(timer);
      timer = setTimeout(reload, 150);
    };

    // Nombre único: con el mismo nombre, la librería reutilizaría el canal anterior mientras se cierra.
    let channel = supabase.channel(`${channelName}-${++mounts}`);
    for (const table of tablesKey.split(",").filter(Boolean)) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, scheduleReload);
    }
    // SUBSCRIBED llega antes de que Realtime escuche la base: lo ocurrido en ese intervalo se recupera aquí.
    channel = channel.on("system", {}, (message: { extension?: string; status?: string }) => {
      if (message.extension === "postgres_changes" && message.status === "ok") scheduleReload();
    });

    // Sin esperar el token, al abrir la página el canal se une como anónimo y RLS le oculta todos los cambios.
    let cancelled = false;
    supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive(true);
          reload();
        } else {
          const failed = status === "CHANNEL_ERROR" || status === "TIMED_OUT";
          // Sin tiempo real, la vista igual muestra los datos.
          if (failed) reload();
          // Solo es "sin conexión" si ya había estado en vivo o si el canal falló.
          setLive((current) => (current === null && !failed ? null : false));
        }
      });
    });

    window.addEventListener("online", scheduleReload);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener("online", scheduleReload);
      supabase.removeChannel(channel);
    };
  }, [channelName, tablesKey, reload]);

  return { data, error, live, reload };
}
