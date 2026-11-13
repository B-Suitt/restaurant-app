"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { resumeShift, startShift, wasShiftStarted } from "@/lib/shift-alerts";

const noSubscribe = () => () => {};

/**
 * Muestra "Comenzar turno" sobre la vista hasta que la persona hace clic.
 * Ese clic habilita el sonido de las alertas y mantiene la pantalla encendida.
 * Si el turno ya se había iniciado en esta pestaña (p. ej. tras F5), no lo vuelve a pedir:
 * el sonido se reactiva con el primer toque y, mientras tanto, se avisa que está en pausa.
 */
export function ShiftStart({ children, description }: { children: ReactNode; description: string }) {
  // null en el servidor: el almacenamiento de la pestaña solo existe en el navegador.
  const startedBefore = useSyncExternalStore(noSubscribe, wasShiftStarted, () => null);
  const [startedNow, setStartedNow] = useState(false);
  const [soundReady, setSoundReady] = useState(false);

  useEffect(() => {
    if (!startedBefore) return;
    return resumeShift(() => setSoundReady(true));
  }, [startedBefore]);

  const started = startedNow || startedBefore;

  return (
    <>
      {children}
      {started === false && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shift-title"
            className="flex w-full max-w-87.5 flex-col gap-4.5 rounded-xl bg-surface p-6"
          >
            <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <BellRing className="size-7" aria-hidden />
            </span>
            <h2 id="shift-title" className="text-2xl">
              Comenzar turno
            </h2>
            <p className="text-base text-muted">{description}</p>
            <Button
              autoFocus
              onClick={() => {
                // Se llama dentro del clic (el navegador exige un gesto para el sonido), pero sin esperarlo:
                // si el audio tarda o el navegador lo bloquea, el turno igual comienza.
                startShift().catch(() => {});
                setStartedNow(true);
              }}
            >
              Comenzar turno
            </Button>
          </div>
        </div>
      )}
      {startedBefore && !startedNow && !soundReady && (
        // Cualquier toque reactiva el sonido (lo escucha resumeShift); este botón solo lo hace evidente.
        <button
          type="button"
          role="status"
          className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm whitespace-nowrap text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <BellOff className="size-4 shrink-0" aria-hidden />
          Sonido en pausa · toca para activarlo
        </button>
      )}
    </>
  );
}
