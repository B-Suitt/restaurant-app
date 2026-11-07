"use client";

import { useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Aviso fijo cuando el dispositivo pierde internet, en todas las vistas (incluidas las que no usan
 * Realtime, como la carta o los formularios). Al volver la conexión, `useLiveData` recarga solo.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true, // en el servidor se asume conexión
  );
  if (online) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-ink px-4 py-2.5 text-center text-sm text-white print:hidden"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      Sin conexión a internet. Te reconectaremos automáticamente; lo que envíes ahora no llegará.
    </div>
  );
}
