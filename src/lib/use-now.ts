"use client";

import { useEffect, useState } from "react";

/**
 * Hora actual que se actualiza cada `intervalMs` (para temporizadores en pantalla).
 * Devuelve 0 hasta montar: la hora no se puede leer durante el prerender.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
